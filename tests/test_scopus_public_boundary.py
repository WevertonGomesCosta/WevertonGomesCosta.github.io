"""Scopus annual aggregates are public; document-level records remain private."""
import json
from pathlib import Path
import unittest

from scripts import scopus_public_data


ROOT = Path(__file__).resolve().parents[1]


class TestScopusPublicBoundary(unittest.TestCase):
    def test_public_json_contains_valid_author_summary_and_annual_totals(self):
        data = json.loads((ROOT / "fallback-data.json").read_text(encoding="utf-8"))
        scopus = data["academicData"]["scopus"]
        self.assertTrue(scopus_public_data.is_public_author_summary(data))
        self.assertEqual(scopus["articles"], [])
        self.assertEqual(
            set(scopus),
            {"source_name", "distribution", "profile", "articles", "history_status"},
        )
        self.assertGreaterEqual(scopus["profile"]["total_publications"], 0)

        graph = scopus["profile"]["cited_by"]["graph"]
        self.assertTrue(graph, "The authorized Scopus annual graph must be present")
        self.assertEqual(scopus_public_data.sanitize_annual_history(graph), graph)
        self.assertEqual([point["year"] for point in graph], sorted(point["year"] for point in graph))
        self.assertIn(scopus["history_status"], {"current", "stale"})
        self.assertTrue(
            all(set(point) == {"year", "citations", "publications"} for point in graph)
        )
        self.assertEqual(
            sum(point["publications"] for point in graph),
            scopus["profile"]["total_publications"],
            "Scopus-only annual publication bars must match author document total",
        )

    def test_public_per_publication_metrics_are_not_downloadable(self):
        data = json.loads((ROOT / "bibliometric-metrics.json").read_text(encoding="utf-8"))
        for pub in data["publications"].values():
            self.assertIsNone(pub["scopus"]["citations"])
            self.assertIn(
                pub["scopus"]["status"],
                {"value_unavailable", "record_absent"},
            )

    def test_sanitizer_preserves_only_author_aggregate_history(self):
        original = {
            "academicData": {
                "scopus": {
                    "profile": {
                        "total_publications": 1,
                        "cited_by": {
                            "table": [{"citations": {"all": 2}}],
                            "graph": [{"year": 2025, "citations": 2, "publications": 1}],
                        },
                    },
                    "articles": [{"title": "Private", "scopus_id": "123",
                                  "cited_by": {"value": 2}}],
                    "history_status": "current",
                }
            }
        }
        published = scopus_public_data.sanitize_fallback(original)
        self.assertEqual(len(original["academicData"]["scopus"]["articles"]), 1)
        self.assertEqual(len(original["academicData"]["scopus"]["profile"]["cited_by"]["graph"]), 1)
        public_scopus = published["academicData"]["scopus"]
        self.assertEqual(public_scopus["articles"], [])
        self.assertEqual(
            public_scopus["profile"]["cited_by"]["graph"],
            [{"year": 2025, "citations": 2, "publications": 1}],
        )
        self.assertEqual(public_scopus["history_status"], "current")
        self.assertTrue(scopus_public_data.is_public_author_summary(published))

    def test_sanitizer_rejects_record_level_fields_and_invalid_values(self):
        valid = [{"year": 2025, "citations": 2, "publications": 1}]
        self.assertEqual(scopus_public_data.sanitize_annual_history(valid), valid)
        for data in (
            [{"year": 2025, "citations": 2, "publications": 1, "scopus_id": "123"}],
            [{"year": 2025, "citations": 2, "publications": 1, "records": [1]}],
            [{"year": 2025, "citations": -1, "publications": 1}],
            [{"year": 2025, "citations": 2.5, "publications": 1}],
            [{"year": 2025, "citations": True, "publications": 1}],
            [{"year": 2025, "citations": 2, "publications": 1},
             {"year": 2025, "citations": 4, "publications": 1}],
        ):
            with self.subTest(data=data):
                self.assertEqual(scopus_public_data.sanitize_annual_history(data), [])

    def test_scopus_chart_uses_only_native_history(self):
        markup = (ROOT / "index.html").read_text(encoding="utf-8")
        card = markup.split('data-source="scopus"', 1)[1].split(
            'data-source="wos"', 1
        )[0]
        self.assertIn('id="scopus-chart" class="chart-container"', card)
        self.assertIn('data-key-aria-label="scopus-chart-aria"', card)
        self.assertNotIn("Google Scholar", card)
        self.assertNotIn("Lattes", card)
        self.assertNotIn("scopus-registry-source", card)
        self.assertNotIn('id="scopus-refresh-status"', card)

        catalog = json.loads((ROOT / "translations.json").read_text(encoding="utf-8"))
        self.assertTrue(catalog["pt"]["scopus-chart-aria"])
        self.assertTrue(catalog["en"]["scopus-chart-aria"])
        self.assertNotIn("scopus-registry-chart-citations", catalog["pt"])

        js = (ROOT / "utils.js").read_text(encoding="utf-8")
        self.assertNotIn("PortfolioPublicationHistory", js)
        self.assertNotIn("renderPortfolioPublicationChart", js)
        self.assertIn("renderDualAxisChart(chartDiv, data.graphData, platformPrefix, shouldAnimate)", js)
        self.assertNotIn("histórico anual preservado", js)
        self.assertNotIn("annual history retained from an earlier retrieval", js)
        self.assertNotIn("scopus-refresh-status", js)
        self.assertIn("scopusExpired", js)
        self.assertNotIn("Source: Scopus. Refreshed weekly.", js)

    def test_visible_author_counts_link_to_scopus(self):
        markup = (ROOT / "index.html").read_text(encoding="utf-8")
        for metric in ("pubs", "cit", "h", "i10"):
            self.assertIn(f'id="scopus-{metric}"', markup)
        self.assertGreaterEqual(
            markup.count("https://www.scopus.com/authid/detail.uri?authorId=57211264440"),
            4,
        )
        js = (ROOT / "utils.js").read_text(encoding="utf-8")
        self.assertIn("7 * 24 * 60 * 60 * 1000", js)
        self.assertIn("scopusExpired", js)


if __name__ == "__main__":
    unittest.main()
