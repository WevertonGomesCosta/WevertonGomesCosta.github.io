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

    def test_legacy_title_based_scholar_join_is_absent_from_frontend(self):
        self.assertNotIn("normalizeIdentityTitle", self.utils)
        self.assertNotIn("scholarCitationCount", self.utils)
        self.assertNotIn("scholarArticles.find(", self.utils)

    def test_frontend_loads_metrics_and_looks_up_by_publication_id(self):
        self.assertIn("fetch('bibliometric-metrics.json')", self.utils)
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
