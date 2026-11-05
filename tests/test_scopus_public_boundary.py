"""Public Scopus output must not be a downloadable document-level dataset."""
import json
from pathlib import Path
import unittest

from scripts import scopus_public_data


ROOT = Path(__file__).resolve().parents[1]


class TestScopusPublicBoundary(unittest.TestCase):
    def test_public_json_contains_only_author_summary(self):
        data = json.loads((ROOT / "fallback-data.json").read_text(encoding="utf-8"))
        scopus = data["academicData"]["scopus"]
        self.assertTrue(scopus_public_data.is_public_author_summary(data))
        self.assertEqual(scopus["articles"], [])
        self.assertEqual(scopus["profile"]["cited_by"]["graph"], [])
        self.assertEqual(
            set(scopus),
            {"source_name", "distribution", "profile", "articles", "history_status"},
        )
        self.assertGreaterEqual(scopus["profile"]["total_publications"], 0)

    def test_public_per_publication_metrics_are_not_downloadable(self):
        data = json.loads((ROOT / "bibliometric-metrics.json").read_text(encoding="utf-8"))
        for pub in data["publications"].values():
            self.assertIsNone(pub["scopus"]["citations"])
            self.assertIn(
                pub["scopus"]["status"],
                {"value_unavailable", "record_absent"},
            )

    def test_sanitizer_does_not_mutate_private_reconciliation_input(self):
        full = {
            "academicData": {
                "scopus": {
                    "profile": {
                        "total_publications": 1,
                        "cited_by": {"table": [{"citations": {"all": 2}}],
                                     "graph": [{"year": 2025, "citations": 2}]},
                    },
                    "articles": [{"title": "Private", "scopus_id": "123",
                                  "cited_by": {"value": 2}}],
                    "history_status": "current",
                }
            }
        }
        published = scopus_public_data.sanitize_fallback(full)
        self.assertEqual(len(full["academicData"]["scopus"]["articles"]), 1)
        self.assertEqual(len(full["academicData"]["scopus"]["profile"]["cited_by"]["graph"]), 1)
        self.assertEqual(published["academicData"]["scopus"]["articles"], [])
        self.assertEqual(published["academicData"]["scopus"]["profile"]["cited_by"]["graph"], [])

    def test_visible_author_counts_link_to_scopus(self):
        markup = (ROOT / "index.html").read_text(encoding="utf-8")
        for metric in ("pubs", "cit", "h", "i10"):
            self.assertIn(f'id="scopus-{metric}"', markup)
        self.assertEqual(
            markup.count(
                'https://www.scopus.com/authid/detail.uri?authorId=57211264440'
            ) >= 4,
            True,
        )
        js = (ROOT / "utils.js").read_text(encoding="utf-8")
        self.assertIn("7 * 24 * 60 * 60 * 1000", js)
        self.assertIn("scopusExpired", js)


if __name__ == "__main__":
    unittest.main()
