import copy
import unittest

from scripts import publication_reconciliation as reconciliation
from scripts import source_update_pipeline as pipeline


def empty_links():
    return {
        "schema_version": "1.0.0",
        "sources": {
            "google_scholar": {
                "record_id_scheme": "citation_for_view",
                "links": [],
            },
            "scopus": {"record_id_scheme": "scopus_id", "links": []},
            "web_of_science": {"record_id_scheme": "doi", "links": []},
            "orcid": {"record_id_scheme": "doi", "links": []},
        },
    }


def empty_registry():
    return {
        "schema_version": "1.0.0",
        "updated_at": "2026-09-23",
        "source_basis": {},
        "summary": {
            "total_records": 0,
            "published_journal_articles": 0,
            "published_preprints": 0,
            "accepted_journal_articles": 0,
            "published_book_chapters": 0,
            "lattes_periodical_section_records": 0,
        },
        "works": [],
    }


def results_for_new_article():
    title = "A New Journal Article"
    return {
        "github": pipeline.SourceResult.success([]),
        "google_scholar": pipeline.SourceResult.success(
            {
                "profile": {},
                "articles": [
                    {
                        "title": title,
                        "year": "2026",
                        "link": (
                            "https://scholar.google.com/citations?"
                            "citation_for_view=Author:New"
                        ),
                        "doi": None,
                        "cited_by": {"value": 2},
                    }
                ],
            }
        ),
        "scopus": pipeline.SourceResult.success(
            {
                "profile": {},
                "articles": [
                    {
                        "scopus_id": "123",
                        "title": title,
                        "year": "2026",
                        "journalTitle": "Journal",
                        "doi": "10.1000/new",
                        "cited_by": {"value": 1},
                    }
                ],
            }
        ),
        "web_of_science": pipeline.SourceResult.success({"articles": []}),
        "orcid": pipeline.SourceResult.success(
            {
                "source_name": "ORCID",
                "articles": [
                    {
                        "title": title,
                        "year": "2026",
                        "journalTitle": "Journal",
                        "doi": "10.1000/new",
                        "cited_by": {"value": None},
                    }
                ],
            }
        ),
    }


class TestPublicationReconciliation(unittest.TestCase):
    def test_promotes_verified_journal_article_and_links_sources(self):
        result = reconciliation.reconcile_publications(
            empty_registry(),
            empty_links(),
            results_for_new_article(),
            resolve_doi=lambda doi: {
                "DOI": doi,
                "type": "journal-article",
                "title": ["A New Journal Article"],
                "container-title": ["Journal of Testing"],
                "published-online": {"date-parts": [[2026, 10, 20]]},
                "author": [
                    {"given": "Weverton Gomes", "family": "Costa"},
                    {"given": "Ana Carolina", "family": "Nascimento"},
                ],
            },
            updated_at="2026-11-04",
        )

        self.assertTrue(result.changed)
        self.assertEqual(len(result.promoted), 1)
        work = result.registry["works"][0]
        self.assertEqual(work["type"], "journal_article")
        self.assertEqual(work["status"], "published")
        self.assertEqual(work["doi"], "10.1000/new")
        self.assertEqual(work["container_title"], "Journal of Testing")
        self.assertEqual(work["authors"][0], "COSTA, W. G.")
        self.assertEqual(
            result.registry["summary"]["published_journal_articles"],
            1,
        )

        for source in ("google_scholar", "scopus", "orcid"):
            links = result.source_links["sources"][source]["links"]
            self.assertEqual(len(links), 1, source)
            self.assertEqual(links[0]["role"], "primary")
            self.assertEqual(links[0]["publication_id"], work["id"])

    def test_rejects_non_journal_crossref_record(self):
        result = reconciliation.reconcile_publications(
            empty_registry(),
            empty_links(),
            results_for_new_article(),
            resolve_doi=lambda doi: {
                "DOI": doi,
                "type": "dissertation",
                "title": ["A Thesis"],
            },
            updated_at="2026-11-04",
        )

        self.assertFalse(result.changed)
        self.assertEqual(result.registry, empty_registry())
        self.assertEqual(result.source_links, empty_links())
        self.assertEqual(result.rejected[0]["reason"], "crossref_type:dissertation")

    def test_existing_doi_is_not_promoted_again(self):
        registry = empty_registry()
        registry["works"].append(
            {
                "id": "journal-2026-existing",
                "type": "journal_article",
                "status": "published",
                "title": "A New Journal Article",
                "authors": [],
                "year": 2026,
                "container_title": "Journal",
                "doi": "10.1000/new",
            }
        )
        original = copy.deepcopy(registry)

        result = reconciliation.reconcile_publications(
            registry,
            empty_links(),
            results_for_new_article(),
            resolve_doi=lambda doi: self.fail("resolver must not be called"),
            updated_at="2026-11-04",
        )

        self.assertFalse(result.changed)
        self.assertEqual(result.registry, original)


if __name__ == "__main__":
    unittest.main()
