"""Integration-level publication decision tests with offline source candidates."""
from copy import deepcopy
from datetime import datetime, timedelta
import json
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest import mock

import update_fallback
from scripts import source_update_pipeline as pipeline


ROOT = Path(__file__).resolve().parents[1]
RUN_TIME = datetime(2026, 11, 5, 9, 45)


class TestPublicationOnlyOnRealChanges(unittest.TestCase):
    def exercise(self, *, kind="metadata", scheduled=False, when=RUN_TIME):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for filename in (
                "fallback-data.json",
                "academic-registry.json",
                "bibliographic-source-links.json",
            ):
                (root / filename).write_bytes((ROOT / filename).read_bytes())

            old = json.loads(
                (root / "fallback-data.json").read_text(encoding="utf-8")
            )
            candidate_fallback = deepcopy(old)
            candidate_fallback["lastUpdated"] = "05/11/2026 09:45"
            candidate_fallback["githubRepos"][0]["updated_at"] = (
                "2026-11-05T12:45:50Z"
            )
            candidate_fallback["sourceStates"]["scopus"]["last_valid_at"] = (
                "2026-11-05T09:45:50"
            )
            # Simulate the private successful Search response: it is removed
            # before the comparison and must never generate a public PR.
            candidate_fallback["academicData"]["scopus"]["articles"] = [
                {"title": "Scopus private document",
                 "scopus_id": "private-test-id", "cited_by": {"value": 3}}
            ]
            if kind == "material":
                scholar_table = candidate_fallback["academicData"][
                    "google_scholar"
                ]["profile"]["cited_by"]["table"]
                scholar_table[0]["citations"]["all"] += 1

            reconciliation = SimpleNamespace(
                registry=json.loads(
                    (root / "academic-registry.json").read_text(encoding="utf-8")
                ),
                source_links=json.loads(
                    (root / "bibliographic-source-links.json").read_text(
                        encoding="utf-8"
                    )
                ),
                changed=False,
                promoted=[],
            )
            candidate = pipeline.TransactionCandidate(
                fallback=candidate_fallback, metrics={}, changed=True
            )
            results = {
                "scopus": pipeline.SourceResult.success(
                    candidate_fallback["academicData"]["scopus"]
                )
            }
            env = {"ACADEMIC_SCHEDULED_REFRESH": "true" if scheduled else ""}
            with (
                mock.patch.dict("os.environ", env),
                mock.patch.object(update_fallback, "load_keys", return_value={}),
                mock.patch.object(update_fallback, "build_runtime_config", return_value={}),
                mock.patch.object(
                    update_fallback, "collect_source_results", return_value=results
                ),
                mock.patch.object(
                    update_fallback.publication_reconciliation,
                    "reconcile_publications", return_value=reconciliation
                ),
                mock.patch.object(
                    update_fallback.update_pipeline,
                    "build_transaction_candidate", return_value=candidate
                ),
                mock.patch.object(
                    update_fallback.update_pipeline,
                    "staged_publish_json"
                ) as publish,
            ):
                result = update_fallback.run_update(
                    root=root, keys_file=root / "keys.json",
                    transaction_time=when,
                )
            self.assertEqual(result, 0)
            return publish

    def test_repeated_local_run_does_not_write_jsons(self):
        publish = self.exercise(kind="metadata")
        publish.assert_not_called()

    def test_changed_citation_writes_public_files(self):
        publish = self.exercise(kind="material")
        publish.assert_called_once()
        output_files = {str(path.name) for path in publish.call_args.args[0]}
        self.assertEqual(
            output_files, {"fallback-data.json", "bibliometric-metrics.json"}
        )
        text = publish.call_args.args[0]
        fallback_file = next(
            data for path, data in text.items() if path.name == "fallback-data.json"
        )
        public = json.loads(fallback_file)
        self.assertEqual(public["academicData"]["scopus"]["articles"], [])

    def test_scheduled_refresh_writes_new_scopus_validation_time(self):
        publish = self.exercise(kind="metadata", scheduled=True)
        publish.assert_called_once()
        outputs = publish.call_args.args[0]
        fallback_file = next(
            data for path, data in outputs.items()
            if path.name == "fallback-data.json"
        )
        public = json.loads(fallback_file)
        self.assertEqual(
            public["sourceStates"]["scopus"]["last_valid_at"],
            "2026-11-05T09:45:00",
        )


if __name__ == "__main__":
    unittest.main()
