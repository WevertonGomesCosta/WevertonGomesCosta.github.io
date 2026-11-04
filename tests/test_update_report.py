"""Regression tests for source-by-source comparisons."""
import unittest

from scripts import update_report


def profile(publications, cited, h, i10):
    return {
        "profile": {
            "total_publications": publications,
            "cited_by": {
                "table": [
                    {"citations": {"all": cited, "since_2021": cited - 1}},
                    {"h_index": {"all": h, "since_2021": h}},
                    {"i10_index": {"all": i10, "since_2021": i10}},
                ]
            },
        },
        "articles": [{}] * publications,
    }


class TestAcademicUpdateReport(unittest.TestCase):
    def test_comparison_includes_all_sources_and_old_new_metrics(self):
        old = {
            "githubRepos": [{"name": "a"}],
            "academicData": {
                "google_scholar": profile(3, 20, 2, 1),
                "scopus": {**profile(2, 11, 1, 1), "history_status": "stale"},
                "web_of_science": profile(2, 8, 1, 0),
                "orcid": {"articles": [{}, {}]},
            },
            "sourceStates": {
                x: {"status": "current"} for x, _ in update_report.SOURCES
            },
        }
        new = {
            "githubRepos": [{"name": "a"}, {"name": "b"}],
            "academicData": {
                "google_scholar": profile(4, 23, 3, 1),
                "scopus": {**profile(2, 11, 1, 1), "history_status": "stale"},
                "web_of_science": profile(2, 9, 1, 0),
                "orcid": {"articles": [{}, {}, {}]},
            },
            "sourceStates": {
                **old["sourceStates"],
                "scopus": {"status": "stale", "error_code": "fetch_failed"},
            },
        }
        result = update_report.render_source_comparison(
            old, new, old_registry={"works": [1]}, new_registry={"works": [1, 2]}
        )
        for source in ("GitHub", "Google Scholar", "Scopus", "Web of Science", "ORCID"):
            self.assertIn(source, result)
        for value in (
            "Repositórios: 1 -> 2",
            "Publicações/registros: 3 -> 4",
            "Citações totais: 20 -> 23",
            "Índice h: 2 -> 3",
            "Citações desde 2021: 19 -> 22",
            "Histórico anual: stale -> stale",
            "Catálogo canônico (registros): 1 -> 2",
            "dados anteriores preservados",
        ):
            with self.subTest(value=value):
                self.assertIn(value, result)

    def test_missing_metrics_are_not_falsely_reported_as_zero(self):
        old = {
            "academicData": {"orcid": {"articles": [{"title": "x"}]}},
            "sourceStates": {"orcid": {"status": "current"}},
        }
        result = update_report.render_source_comparison(old, old)
        self.assertIn("Publicações/registros: 1 -> 1", result)
        self.assertIn("Citações totais: n/d -> n/d", result)
        self.assertIn("GitHub  [estado: n/d -> n/d]", result)

    def test_zero_is_preserved_distinct_from_unavailable(self):
        old = {"academicData": {"google_scholar": profile(0, 0, 0, 0)}}
        result = update_report.render_source_comparison(old, old)
        self.assertIn("Publicações/registros: 0 -> 0", result)
        self.assertIn("Citações totais: 0 -> 0", result)


if __name__ == "__main__":
    unittest.main()
