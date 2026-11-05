import json
from pathlib import Path
import re
import unicodedata
import unittest

ROOT = Path(__file__).resolve().parents[1]


def legacy_normalize_identity_title(value):
    if not value:
        return ""
    value = unicodedata.normalize("NFD", value)
    value = "".join(
        char for char in value if not unicodedata.combining(char)
    )
    value = re.sub(r"[‐‑‒–—−]", "-", value)
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def legacy_scholar_count(work, scholar_articles):
    target = legacy_normalize_identity_title(work.get("title", ""))
    if not target:
        return 0

    match = next(
        (
            article
            for article in scholar_articles
            if legacy_normalize_identity_title(article.get("title", ""))
            == target
        ),
        None,
    )

    if match is None:
        for article in scholar_articles:
            raw_title = article.get("title", "")
            if not re.search(r"[.…]$", raw_title.strip()):
                continue
            candidate = legacy_normalize_identity_title(
                re.sub(r"[.…]+$", "", raw_title)
            )
            if len(candidate) >= 60 and target.startswith(candidate):
                match = article
                break

    if match is None:
        return 0

    cited_by = match.get("cited_by")
    if isinstance(cited_by, dict):
        value = cited_by.get("value")
    else:
        value = cited_by
    try:
        return int(value) if value is not None else 0
    except (TypeError, ValueError):
        return 0


class TestBibliometricFrontendMigration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.utils = (ROOT / "utils.js").read_text(encoding="utf-8")
        cls.registry = json.loads(
            (ROOT / "academic-registry.json").read_text(encoding="utf-8")
        )
        cls.fallback = json.loads(
            (ROOT / "fallback-data.json").read_text(encoding="utf-8")
        )
        cls.metrics = json.loads(
            (ROOT / "bibliometric-metrics.json").read_text(encoding="utf-8")
        )
        cls.home = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.publications_page = (
            ROOT / "publicacoes.html"
        ).read_text(encoding="utf-8")
        cls.translations = json.loads(
            (ROOT / "translations.json").read_text(encoding="utf-8")
        )

    def test_legacy_title_based_scholar_join_is_absent_from_frontend(self):
        self.assertNotIn("normalizeIdentityTitle", self.utils)
        self.assertNotIn("scholarCitationCount", self.utils)
        self.assertNotIn("scholarArticles.find(", self.utils)

    def test_frontend_loads_metrics_and_looks_up_by_publication_id(self):
        self.assertIn(
            "fetch('bibliometric-metrics.json', { cache: 'no-store' })",
            self.utils,
        )
        self.assertIn(
            ".publications?.[publicationId]?.[source]",
            self.utils,
        )
        self.assertIn(
            "const metric = publicationCitationMetric(rawArt.id);",
            self.utils,
        )
        self.assertIn(
            ".map(work => normalizeArticle(work))",
            self.utils,
        )
        self.assertNotIn(
            ".map(work => normalizeArticle(work, scholarArticles))",
            self.utils,
        )

    def test_academic_json_fetches_bypass_stale_browser_cache(self):
        self.assertIn(
            "fetch('fallback-data.json', { cache: 'no-store' })",
            self.utils,
        )
        self.assertIn(
            "fetch('academic-registry.json', { cache: 'no-store' })",
            self.utils,
        )
        self.assertIn(
            "fetch('bibliometric-metrics.json', { cache: 'no-store' })",
            self.utils,
        )

    def test_default_publication_sort_prioritizes_observed_citations_then_date(self):
        self.assertIn(
            "const hasA = hasObservedCitation(a);",
            self.utils,
        )
        self.assertIn(
            "const hasB = hasObservedCitation(b);",
            self.utils,
        )
        self.assertIn(
            "const citationDiff = hasA && hasB ? b.cited_by.value - a.cited_by.value : 0;",
            self.utils,
        )
        self.assertIn(
            "const dateDiff = publicationTimestamp(b) - publicationTimestamp(a);",
            self.utils,
        )
        self.assertIn(
            "return Number(hasB) - Number(hasA) || citationDiff || dateDiff || titleDiff;",
            self.utils,
        )
        self.assertIn(
            "activePublicationSort = 'citations_desc'",
            self.utils,
        )

    def test_publication_sort_control_exists_on_home_and_publications_page(self):
        for markup in (self.home, self.publications_page):
            self.assertIn('id="publication-sort"', markup)
            self.assertIn('value="citations_desc"', markup)
            self.assertIn('value="date_desc"', markup)
            self.assertIn('value="date_asc"', markup)
            self.assertIn('value="title_asc"', markup)

        for lang in ("pt", "en"):
            catalog = self.translations[lang]
            for key in (
                "sort-publications-label",
                "publication-sort-aria",
                "sort-citations-desc",
                "sort-date-desc",
                "sort-date-asc",
                "sort-title-asc",
            ):
                self.assertIn(key, catalog)

    def test_recent_publication_dates_remain_available_for_date_sorting(self):
        self.assertIn(
            "publicationDate: rawArt.publication_date || null",
            self.utils,
        )
        dates = {
            work["doi"]: work.get("publication_date")
            for work in self.registry["works"]
            if work.get("doi") in {
                "10.1007/s00122-026-05387-3",
                "10.3390/agriculture16202290",
            }
        }
        self.assertEqual(
            dates,
            {
                "10.1007/s00122-026-05387-3": "2026-09-23",
                "10.3390/agriculture16202290": "2026-10-20",
            },
        )

    def test_current_canonical_scholar_counts_preserve_legacy_visible_values(self):
        scholar_articles = self.fallback["academicData"][
            "google_scholar"
        ]["articles"]
        mismatches = []

        for work in self.registry["works"]:
            is_citable = (
                (
                    work.get("type") == "journal_article"
                    and work.get("status") == "published"
                )
                or work.get("type") == "preprint"
            )
            if not is_citable:
                continue

            legacy = legacy_scholar_count(work, scholar_articles)
            metric = self.metrics["publications"][work["id"]][
                "google_scholar"
            ]
            current = (
                metric["citations"]
                if metric["status"] == "observed"
                else 0
            )
            if current != legacy:
                mismatches.append(
                    {
                        "publication_id": work["id"],
                        "legacy": legacy,
                        "current": current,
                        "status": metric["status"],
                    }
                )

        self.assertEqual(mismatches, [])

    def test_runtime_uses_last_valid_value_for_stale_metric(self):
        self.assertIn(
            "(metric.status === 'observed' || metric.status === 'stale')",
            self.utils,
        )
        self.assertIn(
            "return { value: metric.citations, status: metric.status };",
            self.utils,
        )

    def test_runtime_keeps_metric_status_with_normalized_publication(self):
        self.assertIn(
            "cited_by: { value: cites, status: citationStatus }",
            self.utils,
        )
        self.assertIn(
            "return { value: 0, status: 'source_unavailable' };",
            self.utils,
        )


if __name__ == "__main__":
    unittest.main()
