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

    def test_registry_publication_chart_is_distinct_from_scopus_metrics(self):
        markup = (ROOT / "index.html").read_text(encoding="utf-8")
        card = markup.split('data-source="scopus"', 1)[1].split(
            'data-source="wos"', 1
        )[0]
        self.assertIn('class="chart-container scopus-registry-chart"', card)
        self.assertIn('role="img"', card)
        self.assertIn('data-key-aria-label="scopus-registry-chart-aria"', card)
        self.assertIn('aria-describedby="scopus-registry-source"', card)
        self.assertIn('data-key="scopus-registry-chart-source"', card)
        self.assertIn('id="scopus-refresh-status"', card)
        self.assertIn('aria-live="polite" hidden', card)
        self.assertNotIn("Fonte: Scopus. Atualização semanal.", card)
        self.assertNotIn("Artigos publicados por ano</h4>", card)
        self.assertNotIn('class="scopus-registry-link"', card)

        catalog = json.loads((ROOT / "translations.json").read_text(encoding="utf-8"))
        keys = (
            "scopus-registry-chart-source",
            "scopus-registry-chart-aria",
            "scopus-registry-chart-legend",
            "scopus-registry-chart-unavailable",
        )
        for language in ("pt", "en"):
            for key in keys:
                self.assertTrue(catalog[language].get(key), f"{language}: {key}")
            source = catalog[language]["scopus-registry-chart-source"].lower()
            self.assertIn("scopus", source)
            self.assertIn("lattes", source)

        registry = json.loads((ROOT / "academic-registry.json").read_text(encoding="utf-8"))
        expected = [
            work for work in registry["works"]
            if work.get("type") == "journal_article"
            and work.get("status") == "published"
        ]
        self.assertEqual(len(expected), registry["summary"]["published_journal_articles"])
        self.assertGreater(len(expected), 0)

        css = (ROOT / "style.css").read_text(encoding="utf-8")
        self.assertNotIn("#scopus-chart.chart-container {", css)
        self.assertIn("#index-page .stats-card .scopus-registry-source {", css)
        self.assertIn("#scopus-refresh-status[hidden] {", css)

        js = (ROOT / "utils.js").read_text(encoding="utf-8")
        self.assertIn("PortfolioPublicationHistory.withIndependentCitations(", js)
        self.assertIn("dashboardData.scholar?.graphData", js)
        self.assertIn("renderDualAxisChart(container, data, 'scopus', shouldAnimate", js)
        self.assertIn("if (platformPrefix === 'scopus') renderPortfolioPublicationChart(shouldAnimate);", js)
        self.assertIn("scopus-registry-chart-citations", js)
        self.assertIn("if (platformPrefix === 'scopus') return;", js)
        self.assertIn("statusElement.hidden = !scopusExpired && !stale;", js)
        self.assertNotIn("Fonte: Scopus. Atualização semanal.", js)
        self.assertNotIn("Source: Scopus. Refreshed weekly.", js)
        self.assertNotIn("chart.textContent = '—'", js)

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
