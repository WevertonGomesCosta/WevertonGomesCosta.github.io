import copy
from datetime import datetime
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import source_update_pipeline as pipeline


NOW = datetime(2026, 9, 25, 15, 30)
OLD_TIME = "2026-09-22T09:40:00"


def registry():
    return {
        "schema_version": "1.0.0",
        "updated_at": "2026-09-23",
        "source_basis": {},
        "summary": {},
        "works": [
            {
                "id": "pub-a",
                "type": "journal_article",
                "status": "published",
                "title": "Publication A",
                "authors": ["Example"],
                "year": 2026,
                "doi": "10.1/a",
            }
        ],
    }


def source_links():
    return {
        "schema_version": "1.0.0",
        "sources": {
            "google_scholar": {
                "record_id_scheme": "citation_for_view",
                "links": [
                    {
                        "record_id": "Author:A",
                        "publication_id": "pub-a",
                        "role": "primary",
                        "match_basis": "normalized_title",
                    }
                ],
            },
            "scopus": {"record_id_scheme": "scopus_id", "links": []},
            "web_of_science": {"record_id_scheme": "doi", "links": []},
            "orcid": {"record_id_scheme": "doi", "links": []},
        },
    }


def scholar_payload(citations=7):
    return {
        "profile": {"source_name": "Google Scholar"},
        "articles": [
            {
                "title": "Publication A",
                "year": "2026",
                "link": (
                    "https://scholar.google.com/citations?"
                    "citation_for_view=Author:A"
                ),
                "cited_by": {"value": citations},
                "source": "Google Scholar",
                "doi": None,
            }
        ],
    }


def old_snapshot():
    return {
        "githubRepos": [{"name": "repo-a"}],
        "lastUpdated": "22/09/2026 09:40",
        "academicData": {
            "google_scholar": scholar_payload(),
            "scopus": {"articles": []},
            "web_of_science": {"articles": []},
            "orcid": {"source_name": "ORCID", "articles": []},
        },
        "sourceStates": {
            source: {
                "status": "current",
                "last_valid_at": OLD_TIME,
                "error_code": None,
            }
            for source in pipeline.SOURCE_NAMES
        },
    }


def all_success(snapshot=None):
    snapshot = snapshot or old_snapshot()
    return {
        source: pipeline.SourceResult.success(
            copy.deepcopy(pipeline.get_source_payload(snapshot, source))
        )
        for source in pipeline.SOURCE_NAMES
    }


class TestSourceUpdatePipeline(unittest.TestCase):
    def test_noop_refresh_preserves_last_updated_and_is_not_changed(self):
        old = old_snapshot()
        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=all_success(old),
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        self.assertFalse(candidate.changed)
        self.assertEqual(candidate.fallback["lastUpdated"], old["lastUpdated"])
        self.assertEqual(
            candidate.fallback["sourceStates"]["google_scholar"]["last_valid_at"],
            OLD_TIME,
        )

    def test_failed_source_preserves_payload_marks_stale_and_metrics(self):
        old = old_snapshot()
        results = all_success(old)
        results["google_scholar"] = pipeline.SourceResult.failure(
            "fetch_failed"
        )

        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=results,
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )

        self.assertTrue(candidate.changed)
        self.assertEqual(
            candidate.fallback["academicData"]["google_scholar"],
            old["academicData"]["google_scholar"],
        )
        state = candidate.fallback["sourceStates"]["google_scholar"]
        self.assertEqual(state["status"], "stale")
        self.assertEqual(state["last_valid_at"], OLD_TIME)
        self.assertEqual(state["error_code"], "fetch_failed")
        self.assertEqual(candidate.fallback["lastUpdated"], "25/09/2026 15:30")

        metric = candidate.metrics["publications"]["pub-a"]["google_scholar"]
        self.assertEqual(metric["status"], "stale")
        self.assertEqual(metric["citations"], 7)
        self.assertEqual(metric["record_id"], "Author:A")

    def test_successful_recovery_from_stale_becomes_current(self):
        old = old_snapshot()
        old["sourceStates"]["google_scholar"] = {
            "status": "stale",
            "last_valid_at": OLD_TIME,
            "error_code": "fetch_failed",
        }
        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=all_success(old),
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        state = candidate.fallback["sourceStates"]["google_scholar"]
        self.assertTrue(candidate.changed)
        self.assertEqual(state["status"], "current")
        self.assertEqual(state["last_valid_at"], "2026-09-25T15:30:00")
        self.assertIsNone(state["error_code"])

    def test_existing_unavailable_placeholder_stays_unavailable_on_failure(self):
        old = old_snapshot()
        old["githubRepos"] = []
        old["sourceStates"]["github"] = {
            "status": "unavailable",
            "last_valid_at": None,
            "error_code": "fetch_failed",
        }
        results = all_success(old)
        results["github"] = pipeline.SourceResult.failure("fetch_failed")
        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=results,
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        self.assertEqual(
            candidate.fallback["sourceStates"]["github"],
            {
                "status": "unavailable",
                "last_valid_at": None,
                "error_code": "fetch_failed",
            },
        )

    def test_missing_previous_snapshot_becomes_unavailable(self):
        results = {
            "github": pipeline.SourceResult.success([]),
            "google_scholar": pipeline.SourceResult.failure("fetch_failed"),
            "scopus": pipeline.SourceResult.success({"articles": []}),
            "web_of_science": pipeline.SourceResult.success({"articles": []}),
            "orcid": pipeline.SourceResult.success(
                {"source_name": "ORCID", "articles": []}
            ),
        }
        candidate = pipeline.build_transaction_candidate(
            old_snapshot=None,
            results=results,
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        state = candidate.fallback["sourceStates"]["google_scholar"]
        self.assertEqual(state["status"], "unavailable")
        self.assertIsNone(state["last_valid_at"])
        self.assertIsNone(
            candidate.fallback["academicData"]["google_scholar"]
        )
        metric = candidate.metrics["publications"]["pub-a"]["google_scholar"]
        self.assertEqual(metric["status"], "source_unavailable")
        self.assertIsNone(metric["citations"])

    def test_successful_empty_github_result_is_not_failure(self):
        old = old_snapshot()
        results = all_success(old)
        results["github"] = pipeline.SourceResult.success([])
        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=results,
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        self.assertEqual(candidate.fallback["githubRepos"], [])
        self.assertEqual(
            candidate.fallback["sourceStates"]["github"]["status"],
            "current",
        )

    def test_missing_frozen_record_turns_nominal_success_into_stale(self):
        old = old_snapshot()
        results = all_success(old)
        results["google_scholar"] = pipeline.SourceResult.success(
            {"profile": {}, "articles": []}
        )
        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=results,
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        self.assertEqual(
            candidate.fallback["sourceStates"]["google_scholar"]["status"],
            "stale",
        )
        self.assertEqual(
            candidate.fallback["academicData"]["google_scholar"],
            old["academicData"]["google_scholar"],
        )

    def test_one_stale_source_does_not_discard_another_valid_change(self):
        old = old_snapshot()
        results = all_success(old)
        results["google_scholar"] = pipeline.SourceResult.failure(
            "fetch_failed"
        )
        changed_repos = [{"name": "repo-a"}, {"name": "repo-b"}]
        results["github"] = pipeline.SourceResult.success(changed_repos)

        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=results,
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        self.assertEqual(candidate.fallback["githubRepos"], changed_repos)
        self.assertEqual(
            candidate.fallback["sourceStates"]["github"]["status"],
            "current",
        )
        self.assertEqual(
            candidate.fallback["sourceStates"]["google_scholar"]["status"],
            "stale",
        )

    def test_bootstrap_old_snapshot_without_states_does_not_crash(self):
        old = old_snapshot()
        old.pop("sourceStates")
        candidate = pipeline.build_transaction_candidate(
            old_snapshot=old,
            results=all_success(old),
            registry=registry(),
            source_links=source_links(),
            transaction_time=NOW,
        )
        self.assertTrue(candidate.changed)
        self.assertEqual(
            candidate.fallback["sourceStates"]["google_scholar"],
            {
                "status": "current",
                "last_valid_at": OLD_TIME,
                "error_code": None,
            },
        )

    def test_staged_publish_rolls_back_first_file_when_second_replace_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            first = root / "fallback-data.json"
            second = root / "bibliometric-metrics.json"
            first.write_text("old-fallback\n", encoding="utf-8")
            second.write_text("old-metrics\n", encoding="utf-8")

            calls = 0

            def fail_second(src, dst):
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError("simulated replace failure")
                os.replace(src, dst)

            with self.assertRaises(pipeline.PipelineError):
                pipeline.staged_publish_json(
                    {
                        first: "new-fallback\n",
                        second: "new-metrics\n",
                    },
                    replace_func=fail_second,
                )

            self.assertEqual(
                first.read_text(encoding="utf-8"),
                "old-fallback\n",
            )
            self.assertEqual(
                second.read_text(encoding="utf-8"),
                "old-metrics\n",
            )
            self.assertFalse((root / "fallback-data.json.writing").exists())
            self.assertFalse(
                (root / "bibliometric-metrics.json.writing").exists()
            )


if __name__ == "__main__":
    unittest.main()
