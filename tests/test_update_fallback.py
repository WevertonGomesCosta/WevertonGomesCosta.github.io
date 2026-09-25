import inspect
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import update_fallback
from scripts import source_update_pipeline as pipeline


class FakeRequestException(Exception):
    pass


class FakeTimeout(FakeRequestException):
    pass


class FakeHTTPError(FakeRequestException):
    pass


class FakeExceptions:
    Timeout = FakeTimeout
    RequestException = FakeRequestException
    HTTPError = FakeHTTPError


class FakeRequests:
    exceptions = FakeExceptions

    def __init__(self, side_effect=None, return_value=None):
        self.side_effect = list(side_effect or [])
        self.return_value = return_value

    def get(self, *args, **kwargs):
        if self.side_effect:
            value = self.side_effect.pop(0)
            if isinstance(value, Exception):
                raise value
            return value
        return self.return_value


class FakeResponse:
    def __init__(self, payload, status_code=200, headers=None):
        self.payload = payload
        self.status_code = status_code
        self.headers = headers or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise FakeHTTPError(f"status={self.status_code}")

    def json(self):
        return self.payload


class TestUpdateFallbackImportAndFetchSemantics(unittest.TestCase):
    def test_import_is_configuration_side_effect_free(self):
        self.assertTrue(callable(update_fallback.run_update))
        self.assertTrue(callable(update_fallback.load_keys))

    def test_missing_keys_raises_normal_exception_not_system_exit(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "missing-keys.json"
            with self.assertRaises(update_fallback.ConfigurationError):
                update_fallback.load_keys(str(path))

    def test_github_failure_is_none_but_successful_empty_is_empty_list(self):
        with mock.patch.object(
            update_fallback,
            "requests",
            FakeRequests(side_effect=[FakeTimeout()]),
        ):
            self.assertIsNone(
                update_fallback.fetch_github_repos("example")
            )

        with mock.patch.object(
            update_fallback,
            "requests",
            FakeRequests(return_value=FakeResponse([])),
        ):
            self.assertEqual(
                update_fallback.fetch_github_repos("example"),
                [],
            )

    def test_scholar_partial_pagination_is_rejected(self):
        profile = FakeResponse(
            {
                "cited_by": {
                    "table": [],
                    "graph": [],
                }
            }
        )
        first_page = FakeResponse(
            {
                "articles": [
                    {
                        "title": f"Publication {index}",
                        "year": "2026",
                        "link": (
                            "https://scholar.google.com/citations?"
                            f"citation_for_view=Author:{index}"
                        ),
                        "publication": "Journal",
                        "cited_by": {"value": index},
                    }
                    for index in range(100)
                ]
            }
        )

        with mock.patch.object(
            update_fallback,
            "requests",
            FakeRequests(
                side_effect=[
                    profile,
                    first_page,
                    FakeTimeout(),
                ]
            ),
        ):
            result = update_fallback.fetch_scholar_data(
                "Author",
                "api-key",
            )
        self.assertIsNone(result)

    def test_scholar_missing_citation_value_remains_null(self):
        profile = FakeResponse({"cited_by": {"table": [], "graph": []}})
        page = FakeResponse(
            {
                "articles": [
                    {
                        "title": "Publication",
                        "year": "2026",
                        "link": (
                            "https://scholar.google.com/citations?"
                            "citation_for_view=Author:One"
                        ),
                        "publication": "Journal",
                    }
                ]
            }
        )
        with mock.patch.object(
            update_fallback,
            "requests",
            FakeRequests(side_effect=[profile, page]),
        ):
            result = update_fallback.fetch_scholar_data("Author", "api-key")

        self.assertIsNotNone(result)
        self.assertIsNone(result["articles"][0]["cited_by"]["value"])

    def test_scopus_fetcher_no_longer_accepts_previous_data(self):
        signature = inspect.signature(update_fallback.fetch_scopus_data)
        self.assertEqual(
            list(signature.parameters),
            ["author_id", "api_key"],
        )

    def test_initial_generation_without_old_fallback_does_not_crash(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "keys.json").write_text(
                json.dumps(
                    {
                        "github_username": "example",
                        "scholar_author_id": "Author",
                        "orcid_id": "0000-0000-0000-0000",
                        "serpapi_api_key": "key",
                    }
                ),
                encoding="utf-8",
            )
            (root / "academic-registry.json").write_text(
                json.dumps(
                    {
                        "schema_version": "1.0.0",
                        "updated_at": "2026-09-25",
                        "source_basis": {},
                        "summary": {},
                        "works": [],
                    }
                ),
                encoding="utf-8",
            )
            (root / "bibliographic-source-links.json").write_text(
                json.dumps(
                    {
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
                ),
                encoding="utf-8",
            )

            results = {
                "github": pipeline.SourceResult.success([]),
                "google_scholar": pipeline.SourceResult.success(
                    {"profile": {}, "articles": []}
                ),
                "scopus": pipeline.SourceResult.success(
                    {"profile": {}, "articles": []}
                ),
                "web_of_science": pipeline.SourceResult.success(
                    {"profile": {}, "articles": []}
                ),
                "orcid": pipeline.SourceResult.success(
                    {"source_name": "ORCID", "articles": []}
                ),
            }

            with (
                mock.patch.object(
                    update_fallback,
                    "requests",
                    FakeRequests(),
                ),
                mock.patch.object(
                    update_fallback,
                    "collect_source_results",
                    return_value=results,
                ),
            ):
                rc = update_fallback.run_update(
                    root=root,
                    keys_file=root / "keys.json",
                    transaction_time=update_fallback.datetime(
                        2026, 9, 25, 16, 0
                    ),
                )

            self.assertEqual(rc, 0)
            fallback = json.loads(
                (root / "fallback-data.json").read_text(encoding="utf-8")
            )
            metrics = json.loads(
                (root / "bibliometric-metrics.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(
                set(fallback["sourceStates"]),
                set(pipeline.SOURCE_NAMES),
            )
            self.assertEqual(fallback["lastUpdated"], "25/09/2026 16:00")
            self.assertEqual(metrics["publications"], {})


if __name__ == "__main__":
    unittest.main()
