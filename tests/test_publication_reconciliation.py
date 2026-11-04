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
    def test_author_label_matches_canonical_particle_style(self):
        self.assertEqual(
            reconciliation._author_label(
                {"given": "Weverton Gomes", "family": "da Costa"}
            ),
            "COSTA, W. G.",
        )
        self.assertEqual(
            reconciliation._author_label(
                {
                    "given": "Noé Mitterhofer Eiterer Ponce de Leon da",
                    "family": "Costa",
                }
            ),
            "COSTA, N. M. E. P. L.",
        )

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

    def test_summary_preserves_published_preprint_status(self):
        registry = empty_registry()
        registry["works"].append(
            {
                "id": "preprint-2024-example",
                "type": "preprint",
                "status": "published_preprint",
                "title": "Example Preprint",
                "authors": [],
                "year": 2024,
                "doi": "10.1101/example",
            }
        )
        results = results_for_new_article()

        result = reconciliation.reconcile_publications(
            registry,
            empty_links(),
            results,
            resolve_doi=lambda doi: {
                "DOI": doi,
                "type": "journal-article",
                "title": ["A New Journal Article"],
                "container-title": ["Journal of Testing"],
                "published-online": {"date-parts": [[2026, 10, 20]]},
                "author": [{"given": "Example", "family": "Author"}],
            },
            updated_at="2026-11-04",
        )

        self.assertEqual(result.registry["summary"]["published_preprints"], 1)

    def test_existing_doi_gets_new_source_link_without_duplicate_promotion(self):
        registry = empty_registry()
        registry["works"].append(
            {
                "id": "journal-2026-existing",
                "type": "journal_article",
                "status": "published",
                "title": "Existing Article",
                "authors": ["COSTA, W. G."],
                "year": 2026,
                "container_title": "Journal",
                "doi": "10.1000/existing",
                "source_presence": {
                    "lattes": True,
                    "orcid": False,
                    "google_scholar": False,
                    "scopus": False,
                    "web_of_science": False,
                },
            }
        )
        results = {
            "github": pipeline.SourceResult.success([]),
            "google_scholar": pipeline.SourceResult.success(
                {
                    "profile": {},
                    "articles": [
                        {
                            "title": "Existing Article",
                            "year": "2026",
                            "link": (
                                "https://scholar.google.com/citations?"
                                "citation_for_view=Author:Existing"
                            ),
                            "doi": None,
                            "cited_by": {"value": 3},
                        }
                    ],
                }
            ),
            "scopus": pipeline.SourceResult.success(
                {
                    "articles": [
                        {
                            "scopus_id": "777",
                            "title": "Existing Article",
                            "year": "2026",
                            "doi": "10.1000/existing",
                            "cited_by": {"value": 2},
                        }
                    ]
                }
            ),
            "web_of_science": pipeline.SourceResult.success({"articles": []}),
            "orcid": pipeline.SourceResult.success(
                {"source_name": "ORCID", "articles": []}
            ),
        }

        result = reconciliation.reconcile_publications(
            registry,
            empty_links(),
            results,
            resolve_doi=lambda doi: self.fail("resolver must not be called"),
            updated_at="2026-11-04",
        )

        self.assertTrue(result.changed)
        self.assertEqual(len(result.promoted), 0)
        work = result.registry["works"][0]
        self.assertTrue(work["source_presence"]["google_scholar"])
        self.assertTrue(work["source_presence"]["scopus"])
        self.assertEqual(
            result.source_links["sources"]["google_scholar"]["links"][0][
                "publication_id"
            ],
            "journal-2026-existing",
        )
        self.assertEqual(
            result.source_links["sources"]["scopus"]["links"][0]["record_id"],
            "777",
        )

    def test_conflicting_doi_does_not_fallback_to_title_year(self):
        registry = empty_registry()
        registry["works"].append(
            {
                "id": "journal-2026-existing",
                "type": "journal_article",
                "status": "published",
                "title": "Same Title",
                "authors": ["COSTA, W. G."],
                "year": 2026,
                "container_title": "Journal",
                "doi": "10.1000/canonical",
                "source_presence": {"lattes": True},
            }
        )
        results = {
            "github": pipeline.SourceResult.success([]),
            "google_scholar": pipeline.SourceResult.success(
                {"profile": {}, "articles": []}
            ),
            "scopus": pipeline.SourceResult.success(
                {
                    "articles": [
                        {
                            "scopus_id": "conflict",
                            "title": "Same Title",
                            "year": "2026",
                            "doi": "10.1000/different",
                            "cited_by": {"value": 0},
                        }
                    ]
                }
            ),
            "web_of_science": pipeline.SourceResult.success({"articles": []}),
            "orcid": pipeline.SourceResult.success(
                {"source_name": "ORCID", "articles": []}
            ),
        }

        result = reconciliation.reconcile_publications(
            registry,
            empty_links(),
            results,
            resolve_doi=lambda doi: {
                "DOI": doi,
                "type": "journal-article",
                "title": ["Different DOI Work"],
                "container-title": ["Journal"],
                "published-online": {"date-parts": [[2026]]},
                "author": [{"given": "Example", "family": "Author"}],
            },
            updated_at="2026-11-04",
        )

        canonical_links = [
            link
            for link in result.source_links["sources"]["scopus"]["links"]
            if link.get("publication_id") == "journal-2026-existing"
        ]
        self.assertEqual(canonical_links, [])

    def test_title_fallback_requires_same_year(self):
        matches = reconciliation._source_matches(
            [
                {
                    "title": "A New Journal Article",
                    "year": "2025",
                    "doi": None,
                }
            ],
            doi="10.1000/new",
            title="A New Journal Article",
            year=2026,
        )
        self.assertEqual(matches, [])

    def test_rejects_journal_article_without_authors(self):
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
                "author": [],
            },
            updated_at="2026-11-04",
        )

        self.assertFalse(result.changed)
        self.assertEqual(result.registry["works"], [])
        self.assertEqual(
            result.rejected[0]["reason"],
            "incomplete_crossref_metadata",
        )

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

        results = {
            "github": pipeline.SourceResult.success([]),
            "google_scholar": pipeline.SourceResult.success(
                {"profile": {}, "articles": []}
            ),
            "scopus": pipeline.SourceResult.success({"articles": []}),
            "web_of_science": pipeline.SourceResult.success({"articles": []}),
            "orcid": pipeline.SourceResult.success(
                {"source_name": "ORCID", "articles": []}
            ),
        }
        result = reconciliation.reconcile_publications(
            registry,
            empty_links(),
            results,
            resolve_doi=lambda doi: self.fail("resolver must not be called"),
            updated_at="2026-11-04",
        )

        self.assertFalse(result.changed)
        self.assertEqual(result.registry, original)


if __name__ == "__main__":
    unittest.main()
