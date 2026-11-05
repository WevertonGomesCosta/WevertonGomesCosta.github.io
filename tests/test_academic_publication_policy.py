"""Regression tests for material updates versus incidental collection metadata."""
from copy import deepcopy
from datetime import datetime, timedelta
import unittest
from types import SimpleNamespace

from scripts import academic_publication_policy as policy


NOW = datetime(2026, 11, 5, 9, 45)


def snapshot():
    return {
        "lastUpdated": "05/11/2026 09:36",
        "githubRepos": [{
            "name": "academic-site",
            "updated_at": "2026-11-05T12:36:00Z",
            "stargazers_count": 1,
        }],
        "academicData": {
            "google_scholar": {
                "profile": {"total_publications": 38,
                            "cited_by": {"table": [{"citations": {"all": 207}}]}},
                "articles": [],
            },
            "scopus": {
                "distribution": "author_summary_only",
                "source_name": "Scopus",
                "profile": {"total_publications": 24,
                            "cited_by": {
                                "table": [{"citations": {"all": 140}}],
                                "graph": [
                                    {"year": 2026, "citations": 7, "publications": 1}
                                ],
                            }},
                "articles": [],
                "history_status": "current",
            },
            "web_of_science": {"articles": [], "profile": {}},
            "orcid": {"articles": []},
        },
        "sourceStates": {
            key: {
                "status": "current",
                "last_valid_at": "2026-11-05T09:36:24",
                "error_code": None,
            }
            for key in ("github", "google_scholar", "scopus", "web_of_science", "orcid")
        },
    }


class TestAcademicPublicationPolicy(unittest.TestCase):
    def test_no_pr_for_only_timestamps_or_github_repository_updated_at(self):
        old = snapshot()
        new = deepcopy(old)
        new["lastUpdated"] = "05/11/2026 09:45"
        new["githubRepos"][0]["updated_at"] = "2026-11-05T12:45:50Z"
        for state in new["sourceStates"].values():
            state["last_valid_at"] = "2026-11-05T09:45:50"
        self.assertFalse(policy.has_material_change(old, new))
        self.assertEqual(old["lastUpdated"], "05/11/2026 09:36")

    def test_scopus_private_document_list_never_requires_public_pr(self):
        from scripts import scopus_public_data
        old = snapshot()
        new = deepcopy(old)
        new["academicData"]["scopus"]["articles"] = [
            {"scopus_id": "123", "title": "Private article",
             "cited_by": {"value": 100}}
        ]
        sanitized = scopus_public_data.sanitize_fallback(new)
        self.assertFalse(policy.has_material_change(old, sanitized))

    def test_real_scopus_or_scholar_citation_change_requires_pr(self):
        old = snapshot()
        for source, metric in (("scopus", 141), ("google_scholar", 208)):
            with self.subTest(source=source):
                new = deepcopy(old)
                new["academicData"][source]["profile"]["cited_by"]["table"][0][
                    "citations"
                ]["all"] = metric
                self.assertTrue(policy.has_material_change(old, new))

    def test_wos_publication_and_github_star_change_are_material(self):
        old = snapshot()
        new = deepcopy(old)
        new["academicData"]["web_of_science"]["articles"] = [{"doi": "10.1/a"}]
        self.assertTrue(policy.has_material_change(old, new))
        other = deepcopy(old)
        other["githubRepos"][0]["stargazers_count"] = 2
        self.assertTrue(policy.has_material_change(old, other))

    def test_stale_or_current_transition_is_significant(self):
        old = snapshot()
        new = deepcopy(old)
        new["sourceStates"]["scopus"]["status"] = "stale"
        new["sourceStates"]["scopus"]["error_code"] = "fetch_failed"
        self.assertTrue(policy.has_material_change(old, new))

    def test_no_scopus_renewal_after_nine_minutes(self):
        old = snapshot()
        results = {"scopus": SimpleNamespace(status="success")}
        self.assertFalse(policy.scopus_refresh_due(old, old, results, NOW))
        self.assertFalse(policy.scopus_refresh_due(old, old, results, NOW, scheduled=False))

    def test_local_scopus_renewal_after_six_days(self):
        old = snapshot()
        results = {"scopus": SimpleNamespace(status="success")}
        self.assertTrue(
            policy.scopus_refresh_due(old, old, results, NOW + timedelta(days=6))
        )

    def test_weekly_cron_renews_even_after_recent_local_refresh(self):
        old = snapshot()
        results = {"scopus": SimpleNamespace(status="success")}
        self.assertTrue(
            policy.scopus_refresh_due(old, old, results, NOW, scheduled=True)
        )

    def test_failed_scopus_collection_must_not_renew_freshness(self):
        old = snapshot()
        self.assertFalse(policy.scopus_refresh_due(
            old, old, {"scopus": SimpleNamespace(status="failure")},
            NOW + timedelta(days=20), scheduled=True,
        ))
        stale = deepcopy(old)
        stale["sourceStates"]["scopus"]["status"] = "stale"
        self.assertFalse(policy.scopus_refresh_due(
            old, stale, {"scopus": SimpleNamespace(status="success")},
            NOW + timedelta(days=20), scheduled=True,
        ))


if __name__ == "__main__":
    unittest.main()
