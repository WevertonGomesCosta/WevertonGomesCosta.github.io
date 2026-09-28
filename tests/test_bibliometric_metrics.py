import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_bibliometric_metrics as builder


def source_links_empty():
    return {
        "schema_version": "1.0.0",
        "sources": {
            "google_scholar": {
                "record_id_scheme": "citation_for_view",
                "links": [],
            },
            "scopus": {
                "record_id_scheme": "scopus_id",
                "links": [],
            },
            "web_of_science": {
                "record_id_scheme": "doi",
                "links": [],
            },
            "orcid": {
                "record_id_scheme": "doi",
                "links": [],
            },
        },
    }


def registry(ids):
    return {
        "schema_version": "1.0.0",
        "updated_at": "2026-09-25",
        "source_basis": {},
        "summary": {},
        "works": [
            {
                "id": identifier,
                "type": "journal_article",
                "status": "published",
                "title": identifier,
                "authors": ["Example"],
                "year": 2026,
                "doi": f"10.1/{identifier}",
            }
            for identifier in ids
        ],
    }


class TestBibliometricMetricsBuilder(unittest.TestCase):
    def test_repository_artifact_is_exactly_reproducible(self):
        expected = builder.serialize_metrics(builder.build_from_root(ROOT))
        actual = (ROOT / builder.OUTPUT_FILENAME).read_text(encoding="utf-8")
        self.assertEqual(actual, expected)
        self.assertTrue(builder.check_output(ROOT))

    def test_zero_null_absent_and_source_unavailable_are_distinct(self):
        reg = registry(["pub-zero", "pub-null", "pub-absent"])
        links = source_links_empty()
        links["sources"]["google_scholar"]["links"] = [
            {
                "record_id": "Author:Zero",
                "publication_id": "pub-zero",
                "role": "primary",
                "match_basis": "normalized_title",
            },
            {
                "record_id": "Author:Null",
                "publication_id": "pub-null",
                "role": "primary",
                "match_basis": "normalized_title",
            },
        ]
        links["sources"]["scopus"]["links"] = [
            {
                "record_id": "123456",
                "publication_id": "pub-zero",
                "role": "primary",
                "match_basis": "doi",
            }
        ]
        fallback = {
            "lastUpdated": "fixture",
            "academicData": {
                "google_scholar": {
                    "articles": [
                        {
                            "title": "pub-zero",
                            "link": (
                                "https://scholar.google.com/citations?"
                                "citation_for_view=Author:Zero"
                            ),
                            "cited_by": {"value": 0},
                        },
                        {
                            "title": "pub-null",
                            "link": (
                                "https://scholar.google.com/citations?"
                                "citation_for_view=Author:Null"
                            ),
                            "cited_by": None,
                        },
                    ]
                },
                # scopus intentionally unavailable
                "web_of_science": {"articles": []},
                "orcid": {"articles": []},
            },
        }

        metrics = builder.build_metrics(reg, links, fallback)

        zero = metrics["publications"]["pub-zero"]["google_scholar"]
        self.assertEqual(zero["status"], "observed")
        self.assertEqual(zero["citations"], 0)

        null = metrics["publications"]["pub-null"]["google_scholar"]
        self.assertEqual(null["status"], "value_unavailable")
        self.assertIsNone(null["citations"])

        absent = metrics["publications"]["pub-absent"]["google_scholar"]
        self.assertEqual(absent["status"], "record_absent")
        self.assertIsNone(absent["record_id"])
        self.assertIsNone(absent["citations"])

        unavailable = metrics["publications"]["pub-zero"]["scopus"]
        self.assertEqual(unavailable["status"], "source_unavailable")
        self.assertEqual(unavailable["record_id"], "123456")
        self.assertIsNone(unavailable["citations"])

    def test_stale_source_preserves_last_valid_citation_value(self):
        reg = registry(["pub-stale"])
        links = source_links_empty()
        links["sources"]["google_scholar"]["links"] = [
            {
                "record_id": "Author:Stale",
                "publication_id": "pub-stale",
                "role": "primary",
                "match_basis": "normalized_title",
            }
        ]
        fallback = {
            "academicData": {
                "google_scholar": {
                    "articles": [
                        {
                            "title": "pub-stale",
                            "link": (
                                "https://scholar.google.com/citations?"
                                "citation_for_view=Author:Stale"
                            ),
                            "cited_by": {"value": 12},
                        }
                    ]
                },
                "scopus": {"articles": []},
                "web_of_science": {"articles": []},
                "orcid": {"articles": []},
            },
            "sourceStates": {
                "github": {
                    "status": "unavailable",
                    "last_valid_at": None,
                    "error_code": "fixture_unavailable",
                },
                "google_scholar": {
                    "status": "stale",
                    "last_valid_at": "2026-09-22T09:40:00",
                    "error_code": "fetch_failed",
                },
                "scopus": {
                    "status": "current",
                    "last_valid_at": "2026-09-25T12:00:00",
                    "error_code": None,
                },
                "web_of_science": {
                    "status": "current",
                    "last_valid_at": "2026-09-25T12:00:00",
                    "error_code": None,
                },
                "orcid": {
                    "status": "current",
                    "last_valid_at": "2026-09-25T12:00:00",
                    "error_code": None,
                },
            },
        }

        metrics = builder.build_metrics(reg, links, fallback)
        metric = metrics["publications"]["pub-stale"]["google_scholar"]
        self.assertEqual(metric["status"], "stale")
        self.assertEqual(metric["citations"], 12)
        self.assertEqual(metric["record_id"], "Author:Stale")

    def test_scholar_alias_is_not_summed_and_order_is_irrelevant(self):
        registry_payload = json.loads(
            (ROOT / "academic-registry.json").read_text(encoding="utf-8")
        )
        links_payload = json.loads(
            (ROOT / "bibliographic-source-links.json").read_text(
                encoding="utf-8"
            )
        )
        fallback_payload = json.loads(
            (ROOT / "fallback-data.json").read_text(encoding="utf-8")
        )

        target_id = "journal-2021-genome-enabled-prediction-trait-complexity"
        expected = builder.build_metrics(
            registry_payload,
            links_payload,
            fallback_payload,
        )
        expected_scholar = expected["publications"][target_id]["google_scholar"]

        changed = copy.deepcopy(fallback_payload)
        articles = changed["academicData"]["google_scholar"]["articles"]
        for article in articles:
            link = article.get("link") or ""
            if "citation_for_view=eJNKcHsAAAAJ:Se3iqnhoufwC" in link:
                article["cited_by"] = {"value": 999}
        articles.reverse()

        rebuilt = builder.build_metrics(
            registry_payload,
            links_payload,
            changed,
        )
        scholar = rebuilt["publications"][target_id]["google_scholar"]

        self.assertEqual(scholar["citations"], 18)
        self.assertEqual(
            scholar["record_id"],
            "eJNKcHsAAAAJ:qjMakFHDy7sC",
        )
        self.assertEqual(
            scholar["alias_record_ids"],
            ["eJNKcHsAAAAJ:Se3iqnhoufwC"],
        )
        self.assertEqual(scholar, expected_scholar)

    def test_current_snapshot_status_counts_are_stable(self):
        metrics = builder.build_from_root(ROOT)
        expected = {
            "google_scholar": {
                "observed": 22,
                "value_unavailable": 5,
                "record_absent": 5,
            },
            "scopus": {
                "observed": 22,
                "record_absent": 10,
            },
            "web_of_science": {
                "observed": 21,
                "record_absent": 11,
            },
            "orcid": {
                "value_unavailable": 27,
                "record_absent": 5,
            },
        }

        for source, expected_counts in expected.items():
            counts = {}
            for publication in metrics["publications"].values():
                status = publication[source]["status"]
                counts[status] = counts.get(status, 0) + 1
            self.assertEqual(counts, expected_counts, source)

    def test_check_output_detects_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in (
                "academic-registry.json",
                "bibliographic-source-links.json",
                "fallback-data.json",
            ):
                (root / name).write_text(
                    (ROOT / name).read_text(encoding="utf-8"),
                    encoding="utf-8",
                )

            builder.write_output(root)
            self.assertTrue(builder.check_output(root))

            path = root / builder.OUTPUT_FILENAME
            payload = json.loads(path.read_text(encoding="utf-8"))
            first_publication = next(iter(payload["publications"]))
            payload["publications"][first_publication]["google_scholar"][
                "citations"
            ] = 999
            path.write_text(json.dumps(payload), encoding="utf-8")
            self.assertFalse(builder.check_output(root))

    def test_invalid_citation_value_fails_build(self):
        reg = registry(["pub-a"])
        links = source_links_empty()
        links["sources"]["scopus"]["links"] = [
            {
                "record_id": "123456",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "doi",
            }
        ]
        fallback = {
            "academicData": {
                "google_scholar": {"articles": []},
                "scopus": {
                    "articles": [
                        {
                            "scopus_id": "123456",
                            "doi": "10.1/pub-a",
                            "cited_by": {"value": -1},
                        }
                    ]
                },
                "web_of_science": {"articles": []},
                "orcid": {"articles": []},
            }
        }
        with self.assertRaises(builder.BuildError):
            builder.build_metrics(reg, links, fallback)


if __name__ == "__main__":
    unittest.main()
