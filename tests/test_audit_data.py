import json
import re
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repository_audit import data_rules


def valid_profile():
    return {
        "schema_version": "1.0.0",
        "person": {
            "name": "Example Person",
            "display_name": "Example P.",
            "email": "person@example.org",
            "website_url": "https://example.org/",
            "avatar_url": "https://example.org/avatar.png",
            "location": {
                "city": "Viçosa",
                "region": "MG",
                "country_code": "BR",
            },
        },
        "profiles": {
            "github": {
                "username": "example",
                "url": "https://github.com/example",
            },
            "linkedin": {"url": "https://www.linkedin.com/in/example/"},
            "lattes": {
                "id": "1234567890123456",
                "url": "https://lattes.cnpq.br/1234567890123456",
            },
            "google_scholar": {
                "author_id": "ScholarId",
                "url": "https://scholar.google.com/citations?user=ScholarId",
            },
            "orcid": {
                "id": "0000-0002-1825-0097",
                "url": "https://orcid.org/0000-0002-1825-0097",
            },
            "scopus": {
                "author_id": "1234567890",
                "url": "https://www.scopus.com/authid/detail.uri?authorId=1234567890",
            },
            "web_of_science": {
                "researcher_id": "ABC-1234-2026",
                "url": "https://www.webofscience.com/wos/author/record/ABC-1234-2026",
            },
        },
        "organizations": {},
        "affiliations": [],
        "education": [],
    }


class RepoFixture:
    REQUIRED = (
        "index.html",
        "publicacoes.html",
        "projetos.html",
        "politica-de-privacidade.html",
        "404.html",
        "style.css",
        "utils.js",
        "profile-interpolation.js",
        "translations.json",
        "profile.json",
        "academic-registry.json",
        "bibliographic-source-links.json",
        "fallback-data.json",
        "robots.txt",
        "sitemap.xml",
    )

    @staticmethod
    def create(root: Path, *, omit=(), translations=None, raw_translations=None):
        omit = set(omit)
        for name in RepoFixture.REQUIRED:
            if name in omit:
                continue
            path = root / name
            if name.endswith(".html"):
                path.write_text("<html></html>", encoding="utf-8")
            elif name == "translations.json":
                if raw_translations is not None:
                    path.write_text(raw_translations, encoding="utf-8")
                else:
                    path.write_text(
                        json.dumps(translations or {"pt": {}, "en": {}}),
                        encoding="utf-8",
                    )
            elif name == "profile.json":
                path.write_text(json.dumps(valid_profile()), encoding="utf-8")
            elif name == "bibliographic-source-links.json":
                path.write_text(
                    json.dumps({
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
                    }),
                    encoding="utf-8",
                )
            elif name.endswith(".json"):
                path.write_text("{}", encoding="utf-8")
            else:
                path.write_text("", encoding="utf-8")


class TestRepositoryDataRules(unittest.TestCase):
    def test_missing_required_translation_file_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            RepoFixture.create(root, omit={"translations.json"})
            violations = data_rules.audit_repository_data(root)
        matches = [v for v in violations if v.rule_id == "REQUIRED_FILE"]
        self.assertEqual(
            [(v.path, v.subject) for v in matches],
            [("translations.json", "file:translations.json")],
        )

    def test_malformed_translation_json_emits_exactly_one_json_parse(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            RepoFixture.create(root, raw_translations="{broken")
            violations = data_rules.audit_repository_data(root)
        matches = [
            v
            for v in violations
            if v.rule_id == "JSON_PARSE" and v.path == "translations.json"
        ]
        self.assertEqual(len(matches), 1)

    def test_translation_dependent_rules_skip_malformed_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            RepoFixture.create(root, raw_translations="{broken")
            violations = data_rules.audit_repository_data(root)
        dependent = {
            "TRANSLATION_LANGUAGE_SET",
            "TRANSLATION_KEY_PARITY",
            "I18N_REFERENCE_MISSING",
            "I18N_FIXED_ARIA_LABEL",
            "I18N_FIXED_TITLE",
        }
        self.assertFalse(
            [v for v in violations if v.rule_id in dependent],
            violations,
        )




class TestProfileFactTranslationContract(unittest.TestCase):
    def _audit(self, translations):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        RepoFixture.create(root, translations=translations)
        return data_rules.audit_repository_data(root)

    def test_unknown_profile_placeholder_is_rejected(self):
        violations = self._audit({
            "pt": {"custom": "{profile_unknown}"},
            "en": {"custom": "{profile_unknown}"},
        })
        matches = [v for v in violations if v.rule_id == "PROFILE_FACT_CONTRACT"]
        self.assertEqual(len(matches), 2)

    def test_literal_profile_fact_is_rejected(self):
        violations = self._audit({
            "pt": {"custom": "Example Person"},
            "en": {"custom": "Example Person"},
        })
        matches = [
            v for v in violations
            if v.rule_id == "PROFILE_FACT_CONTRACT"
            and ":literal:" in v.subject
        ]
        self.assertEqual(len(matches), 2)

    def test_required_profile_placeholder_is_enforced(self):
        violations = self._audit({
            "pt": {"privacy-contact-p": "Contato"},
            "en": {"privacy-contact-p": "Contact"},
        })
        matches = [
            v for v in violations
            if v.rule_id == "PROFILE_FACT_CONTRACT"
            and v.subject.endswith(":required")
        ]
        self.assertEqual(len(matches), 2)


class TestProfilePlaceholderRegistryParity(unittest.TestCase):
    def test_python_and_javascript_placeholder_registries_match(self):
        source = (ROOT / "profile-interpolation.js").read_text(encoding="utf-8")
        match = re.search(
            r"const PLACEHOLDER_NAMES = Object\.freeze\(\[(.*?)\]\);",
            source,
            flags=re.S,
        )
        self.assertIsNotNone(match)
        javascript = frozenset(
            re.findall(r"'(profile_[a-z0-9_]+)'", match.group(1))
        )
        self.assertEqual(javascript, data_rules.PROFILE_FACT_PLACEHOLDERS)


class TestProfileRules(unittest.TestCase):
    def _audit(self, profile):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        RepoFixture.create(root)
        (root / "profile.json").write_text(
            json.dumps(profile), encoding="utf-8"
        )
        return data_rules.audit_repository_data(root)

    def test_valid_profile_contract_is_clean(self):
        violations = self._audit(valid_profile())
        self.assertFalse(
            [v for v in violations if v.rule_id == "PROFILE_STRUCTURE"],
            violations,
        )

    def test_profile_required_shape_is_enforced(self):
        profile = valid_profile()
        del profile["person"]["location"]
        profile["unexpected"] = True
        violations = self._audit(profile)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "PROFILE_STRUCTURE"
        }
        self.assertIn("profile:top-level", subjects)
        self.assertIn("profile:person", subjects)

    def test_profile_identity_formats_and_html_are_rejected(self):
        profile = valid_profile()
        profile["person"]["email"] = "invalid"
        profile["person"]["display_name"] = "<strong>Person</strong>"
        profile["profiles"]["orcid"]["id"] = "bad-orcid"
        profile["profiles"]["linkedin"]["url"] = "http://example.org/profile"
        violations = self._audit(profile)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "PROFILE_STRUCTURE"
        }
        self.assertIn("profile:person.email", subjects)
        self.assertIn("profile:profiles.orcid.id", subjects)
        self.assertIn("profile:profiles.linkedin.url", subjects)
        self.assertIn("profile:string:person.display_name", subjects)

    def test_profile_duplicate_external_urls_are_rejected(self):
        profile = valid_profile()
        profile["profiles"]["linkedin"]["url"] = profile["profiles"]["github"]["url"]
        violations = self._audit(profile)
        matches = [
            v for v in violations
            if v.rule_id == "PROFILE_STRUCTURE"
            and v.subject.startswith("profile:profiles.url:")
        ]
        self.assertEqual(len(matches), 1)

    def test_academic_relation_references_and_periods_are_validated(self):
        profile = valid_profile()
        profile["organizations"] = {
            "ufv": {
                "name": "Universidade Federal de Viçosa (UFV)",
                "short_name": "UFV",
                "url": None,
            },
            "cnpq": {
                "name": "Conselho Nacional de Desenvolvimento Científico e Tecnológico",
                "short_name": "CNPq",
                "url": None,
            },
        }
        profile["affiliations"] = [
            {
                "id": "postdoc-ufv",
                "organization_id": "ufv",
                "role_codes": ["postdoctoral_researcher"],
                "start_year": 2025,
                "end_year": 2025,
                "current": False,
                "funder_ids": ["cnpq"],
                "advisor": {
                    "name": "Example Advisor",
                    "title_code": "professor",
                },
                "coadvisors": [],
            }
        ]
        profile["education"] = [
            {
                "id": "phd-example",
                "degree_code": "doctorate",
                "organization_id": "ufv",
                "start_year": 2023,
                "end_year": None,
                "current": True,
                "advisor": {
                    "name": "Example Advisor",
                    "title_code": "professor",
                },
                "coadvisors": [],
            }
        ]
        violations = self._audit(profile)
        self.assertFalse(
            [v for v in violations if v.rule_id == "PROFILE_STRUCTURE"],
            violations,
        )

        profile["affiliations"][0]["organization_id"] = "missing"
        profile["affiliations"][0]["funder_ids"] = ["missing-funder"]
        profile["education"][0]["end_year"] = 2022
        violations = self._audit(profile)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "PROFILE_STRUCTURE"
        }
        self.assertIn("profile:affiliations[0].organization_id", subjects)
        self.assertIn("profile:affiliations[0].funder_ids", subjects)
        self.assertIn("profile:education[0].end_year", subjects)

    def test_academic_relation_validator_handles_malformed_list_items(self):
        profile = valid_profile()
        profile["organizations"] = {
            "Bad Org": {
                "name": "Bad",
                "short_name": "Bad",
                "url": None,
            },
            "ufv": {
                "name": "Universidade Federal de Viçosa (UFV)",
                "short_name": "UFV",
                "url": None,
            },
        }
        profile["affiliations"] = [
            {
                "id": "bad-affiliation",
                "organization_id": "ufv",
                "role_codes": [{"bad": True}],
                "start_year": 2025,
                "end_year": 2025,
                "current": False,
                "funder_ids": [{"bad": True}],
                "advisor": {
                    "name": "Advisor",
                    "title_code": {"bad": True},
                },
                "coadvisors": [],
            }
        ]
        profile["education"] = [
            {
                "id": "bad-education",
                "degree_code": {"bad": True},
                "organization_id": "ufv",
                "start_year": 2023,
                "end_year": None,
                "current": True,
                "advisor": None,
                "coadvisors": [],
            }
        ]
        violations = self._audit(profile)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "PROFILE_STRUCTURE"
        }
        self.assertIn("profile:organizations.Bad Org", subjects)
        self.assertIn("profile:affiliations[0].role_codes", subjects)
        self.assertIn("profile:affiliations[0].funder_ids", subjects)
        self.assertIn("profile:affiliations[0].advisor.title_code", subjects)
        self.assertIn("profile:education[0].degree_code", subjects)

    def test_academic_record_ids_roles_and_mentors_are_validated(self):
        profile = valid_profile()
        profile["organizations"] = {
            "ufv": {
                "name": "Universidade Federal de Viçosa (UFV)",
                "short_name": "UFV",
                "url": None,
            }
        }
        profile["affiliations"] = [
            {
                "id": "same-id",
                "organization_id": "ufv",
                "role_codes": ["unknown-role"],
                "start_year": 2025,
                "end_year": None,
                "current": False,
                "funder_ids": [],
                "advisor": {
                    "name": "Advisor",
                    "title_code": "unknown-title",
                },
                "coadvisors": [],
            }
        ]
        profile["education"] = [
            {
                "id": "same-id",
                "degree_code": "unknown-degree",
                "organization_id": "ufv",
                "start_year": 2026,
                "end_year": 2025,
                "current": False,
                "advisor": None,
                "coadvisors": [],
            }
        ]
        violations = self._audit(profile)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "PROFILE_STRUCTURE"
        }
        self.assertIn("profile:affiliations[0].role_codes", subjects)
        self.assertIn("profile:affiliations[0].advisor.title_code", subjects)
        self.assertIn("profile:affiliations[0].end_year", subjects)
        self.assertIn("profile:education[0].id", subjects)
        self.assertIn("profile:education[0].degree_code", subjects)
        self.assertIn("profile:education[0].end_year", subjects)


class TestTranslationRules(unittest.TestCase):
    def _audit(self, html: str, translations: dict):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        RepoFixture.create(root, translations=translations)
        (root / "index.html").write_text(html, encoding="utf-8")
        return data_rules.audit_repository_data(root)

    @staticmethod
    def _keys(violations):
        return {(v.rule_id, v.path, v.subject) for v in violations}

    def test_translation_key_parity_reports_each_mismatched_key(self):
        violations = self._audit(
            '<p data-key="shared"></p>',
            {
                "pt": {"shared": "Comum", "pt-only": "Só PT"},
                "en": {"shared": "Shared", "en-only": "EN only"},
            },
        )
        keys = self._keys(violations)
        self.assertIn(
            ("TRANSLATION_KEY_PARITY", "translations.json", "key:pt-only"),
            keys,
        )
        self.assertIn(
            ("TRANSLATION_KEY_PARITY", "translations.json", "key:en-only"),
            keys,
        )

    def test_wrong_language_set_is_reported_without_dependent_cascade(self):
        violations = self._audit(
            '<p data-key="hello"></p>',
            {"pt": {"hello": "Oi"}, "es": {"hello": "Hola"}},
        )
        language = [
            v for v in violations if v.rule_id == "TRANSLATION_LANGUAGE_SET"
        ]
        self.assertEqual(len(language), 1)
        dependent = {"TRANSLATION_KEY_PARITY", "I18N_REFERENCE_MISSING"}
        self.assertFalse(
            [v for v in violations if v.rule_id in dependent],
            violations,
        )

    def test_missing_translation_reference_is_one_violation_with_missing_languages(self):
        violations = self._audit(
            '<p id="missing" data-key="missing-key"></p>',
            {"pt": {"present": "x"}, "en": {"present": "x"}},
        )
        matches = [
            v for v in violations if v.rule_id == "I18N_REFERENCE_MISSING"
        ]
        self.assertEqual(len(matches), 1)
        item = matches[0]
        self.assertEqual(
            item.subject,
            "p#missing@data-key:missing-key",
        )
        self.assertEqual(
            item.metadata,
            {"missing_languages": ["en", "pt"]},
        )

    def test_fixed_aria_and_title_are_raw_violations(self):
        violations = self._audit(
            '<button id="brand" aria-label="DNA" title="Ajuda">x</button>',
            {"pt": {}, "en": {}},
        )
        keys = self._keys(violations)
        self.assertIn(
            ("I18N_FIXED_ARIA_LABEL", "index.html", "button#brand@aria-label"),
            keys,
        )
        self.assertIn(
            ("I18N_FIXED_TITLE", "index.html", "button#brand@title"),
            keys,
        )

    def test_declarative_translation_attributes_are_checked_without_js_inference(self):
        html = (
            '<input id="search" data-key-placeholder="ph" placeholder="Buscar">'
            '<button id="tip" data-key-title="tip" title="Ajuda">x</button>'
            '<button id="aria" data-key-aria-label="aria" aria-label="Abrir">x</button>'
            '<span id="text" data-key="text"></span>'
            '<script>const fakeTranslationKey = "not-a-real-key";</script>'
        )
        translations = {
            "pt": {"ph": "p", "tip": "t", "aria": "a", "text": "x"},
            "en": {"ph": "p", "tip": "t", "aria": "a", "text": "x"},
        }
        violations = self._audit(html, translations)
        blocked = {
            "I18N_REFERENCE_MISSING",
            "I18N_FIXED_ARIA_LABEL",
            "I18N_FIXED_TITLE",
            "TRANSLATION_KEY_PARITY",
            "TRANSLATION_LANGUAGE_SET",
        }
        self.assertFalse(
            [v for v in violations if v.rule_id in blocked],
            violations,
        )


class TestAcademicRules(unittest.TestCase):
    def _root(self, registry, fallback=None, source_links=None):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        RepoFixture.create(root)
        (root / "academic-registry.json").write_text(
            json.dumps(registry), encoding="utf-8"
        )
        (root / "fallback-data.json").write_text(
            json.dumps(fallback or {}), encoding="utf-8"
        )
        if source_links is not None:
            (root / "bibliographic-source-links.json").write_text(
                json.dumps(source_links), encoding="utf-8"
            )
        return root

    @staticmethod
    def _source_links(**overrides):
        sources = {
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
        }
        sources.update(overrides)
        return {"schema_version": "1.0.0", "sources": sources}

    @staticmethod
    def _registry(works):
        return {
            "schema_version": "1.0.0",
            "updated_at": "2026-09-24",
            "source_basis": {},
            "summary": {},
            "works": works,
        }

    @staticmethod
    def _work(identifier, title, doi=None):
        return {
            "id": identifier,
            "type": "journal_article",
            "status": "published",
            "title": title,
            "authors": ["COSTA, W. G."],
            "year": 2026,
            "doi": doi,
        }

    def test_title_and_doi_normalization(self):
        self.assertEqual(
            data_rules.normalize_title("Genome‐enabled: Predição, Café."),
            data_rules.normalize_title("Genome-enabled predicao cafe"),
        )
        self.assertEqual(
            data_rules.normalize_doi("https://doi.org/10.1234/ABC "),
            "10.1234/abc",
        )
        self.assertEqual(
            data_rules.normalize_doi("https://dx.doi.org/10.1234/ABC"),
            "10.1234/abc",
        )
        self.assertEqual(
            data_rules.normalize_doi("doi:10.1234/ABC"),
            "10.1234/abc",
        )

    def test_registry_duplicate_id_doi_and_title_are_independent(self):
        works = [
            self._work("dup-id", "Unique Alpha", "10.1/a"),
            self._work("dup-id", "Unique Beta", "10.1/b"),
            self._work("doi-a", "Unique Gamma", "https://doi.org/10.2/DUP"),
            self._work("doi-b", "Unique Delta", "doi:10.2/dup"),
            self._work("title-a", "Genome‐enabled: Predição, Café.", None),
            self._work("title-b", "Genome-enabled predicao cafe", ""),
        ]
        root = self._root(self._registry(works))
        violations = data_rules.audit_academic_data(root)
        keys = {(v.rule_id, v.subject) for v in violations}
        self.assertIn(
            ("ACADEMIC_REGISTRY_DUPLICATE_ID", "id:dup-id"),
            keys,
        )
        self.assertIn(
            ("ACADEMIC_REGISTRY_DUPLICATE_DOI", "doi:10.2/dup"),
            keys,
        )
        self.assertIn(
            (
                "ACADEMIC_REGISTRY_DUPLICATE_TITLE",
                "title:genome enabled predicao cafe",
            ),
            keys,
        )

    def test_empty_or_none_doi_values_are_not_duplicates(self):
        works = [
            self._work("a", "Title A", None),
            self._work("b", "Title B", ""),
            self._work("c", "Title C", "   "),
        ]
        root = self._root(self._registry(works))
        violations = data_rules.audit_academic_data(root)
        self.assertFalse(
            [
                v
                for v in violations
                if v.rule_id == "ACADEMIC_REGISTRY_DUPLICATE_DOI"
            ],
            violations,
        )

    def test_registry_structure_checks_top_level_and_work_identity_fields(self):
        registry = self._registry(
            [
                {
                    "id": "x",
                    "type": "",
                    "status": "published",
                    "title": "Title",
                    "authors": [],
                    "year": "2026",
                }
            ]
        )
        del registry["summary"]
        root = self._root(registry)
        violations = data_rules.audit_academic_data(root)
        structure = [
            v
            for v in violations
            if v.rule_id == "ACADEMIC_REGISTRY_STRUCTURE"
        ]
        self.assertTrue(structure, violations)

    def test_empty_bibliographic_source_link_contract_is_valid(self):
        root = self._root(
            self._registry([]),
            source_links=self._source_links(),
        )
        violations = data_rules.audit_academic_data(root)
        self.assertFalse(
            [
                v
                for v in violations
                if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            ],
            violations,
        )

    def test_source_link_requires_existing_publication(self):
        work = self._work("pub-a", "Publication A", "10.1/a")
        links = self._source_links()
        links["sources"]["scopus"]["links"] = [
            {
                "record_id": "123456",
                "publication_id": "missing-publication",
                "role": "primary",
                "match_basis": "doi",
            }
        ]
        root = self._root(self._registry([work]), source_links=links)
        violations = data_rules.audit_academic_data(root)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
        }
        self.assertIn(
            "source-links:scopus:link:0:publication-id",
            subjects,
        )

    def test_duplicate_source_record_id_is_rejected(self):
        work = self._work("pub-a", "Publication A", "10.1/a")
        links = self._source_links()
        links["sources"]["scopus"]["links"] = [
            {
                "record_id": "123456",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "doi",
            },
            {
                "record_id": "123456",
                "publication_id": "pub-a",
                "role": "alias",
                "primary_record_id": "123456",
                "match_basis": "manual_duplicate_reconciliation",
            },
        ]
        root = self._root(self._registry([work]), source_links=links)
        violations = data_rules.audit_academic_data(root)
        self.assertIn(
            "source-links:scopus:record-id:123456",
            {
                v.subject
                for v in violations
                if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            },
        )

    def test_source_publication_pair_requires_exactly_one_primary(self):
        work = self._work("pub-a", "Publication A", "10.1/a")
        links = self._source_links()
        links["sources"]["google_scholar"]["links"] = [
            {
                "record_id": "Author:A",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "normalized_title",
            },
            {
                "record_id": "Author:B",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "normalized_title",
            },
        ]
        root = self._root(self._registry([work]), source_links=links)
        violations = data_rules.audit_academic_data(root)
        self.assertIn(
            "source-links:google_scholar:publication:pub-a:primary",
            {
                v.subject
                for v in violations
                if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            },
        )

    def test_alias_must_reference_primary_of_same_publication(self):
        works = [
            self._work("pub-a", "Publication A", "10.1/a"),
            self._work("pub-b", "Publication B", "10.1/b"),
        ]
        links = self._source_links()
        links["sources"]["google_scholar"]["links"] = [
            {
                "record_id": "Author:A",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "normalized_title",
            },
            {
                "record_id": "Author:B",
                "publication_id": "pub-b",
                "role": "alias",
                "primary_record_id": "Author:A",
                "match_basis": "manual_duplicate_reconciliation",
            },
        ]
        root = self._root(self._registry(works), source_links=links)
        violations = data_rules.audit_academic_data(root)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
        }
        self.assertIn(
            "source-links:google_scholar:publication:pub-b:primary",
            subjects,
        )
        self.assertIn(
            "source-links:google_scholar:record-id:Author:B:alias",
            subjects,
        )

    def test_alias_without_primary_is_rejected(self):
        work = self._work("pub-a", "Publication A", "10.1/a")
        links = self._source_links()
        links["sources"]["google_scholar"]["links"] = [
            {
                "record_id": "Author:B",
                "publication_id": "pub-a",
                "role": "alias",
                "primary_record_id": "Author:Missing",
                "match_basis": "manual_duplicate_reconciliation",
            }
        ]
        root = self._root(self._registry([work]), source_links=links)
        violations = data_rules.audit_academic_data(root)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
        }
        self.assertIn(
            "source-links:google_scholar:publication:pub-a:primary",
            subjects,
        )
        self.assertIn(
            "source-links:google_scholar:record-id:Author:B:alias",
            subjects,
        )

    def test_source_record_id_schemes_are_enforced(self):
        works = [
            self._work("pub-a", "Publication A", "10.1/a"),
            self._work("pub-b", "Publication B", "10.1/b"),
            self._work("pub-c", "Publication C", "10.1/c"),
            self._work("pub-d", "Publication D", "10.1/d"),
        ]
        links = self._source_links()
        links["sources"]["google_scholar"]["links"] = [{
            "record_id": "missing-colon",
            "publication_id": "pub-a",
            "role": "primary",
            "match_basis": "normalized_title",
        }]
        links["sources"]["scopus"]["links"] = [{
            "record_id": "not-numeric",
            "publication_id": "pub-b",
            "role": "primary",
            "match_basis": "doi",
        }]
        links["sources"]["web_of_science"]["links"] = [{
            "record_id": "10.1/c",
            "publication_id": "pub-c",
            "role": "primary",
            "match_basis": "doi",
        }]
        links["sources"]["orcid"]["links"] = [{
            "record_id": "doi:https://doi.org/10.1/d",
            "publication_id": "pub-d",
            "role": "primary",
            "match_basis": "doi",
        }]
        root = self._root(self._registry(works), source_links=links)
        violations = data_rules.audit_academic_data(root)
        record_id_subjects = {
            v.subject
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            and v.subject.endswith(":record-id")
        }
        self.assertEqual(
            record_id_subjects,
            {
                "source-links:google_scholar:link:0:record-id",
                "source-links:scopus:link:0:record-id",
                "source-links:web_of_science:link:0:record-id",
                "source-links:orcid:link:0:record-id",
            },
        )

    def test_source_links_reject_metric_fields(self):
        work = self._work("pub-a", "Publication A", "10.1/a")
        links = self._source_links()
        links["sources"]["scopus"]["links"] = [
            {
                "record_id": "123456",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "doi",
                "citations": 99,
            }
        ]
        root = self._root(self._registry([work]), source_links=links)
        violations = data_rules.audit_academic_data(root)
        matches = [
            v
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            and v.subject == "source-links:scopus:link:0"
        ]
        self.assertEqual(len(matches), 1)
        self.assertIn("unknown keys: citations", matches[0].message)

    def test_frozen_source_link_must_exist_in_fallback_snapshot(self):
        work = self._work("pub-a", "Publication A", "10.1/a")
        links = self._source_links()
        links["sources"]["scopus"]["links"] = [
            {
                "record_id": "123456",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "doi",
            }
        ]
        root = self._root(
            self._registry([work]),
            fallback={"academicData": {"scopus": {"articles": []}}},
            source_links=links,
        )
        violations = data_rules.audit_academic_data(root)
        self.assertIn(
            "source-links:scopus:record-id:123456:snapshot",
            {
                v.subject
                for v in violations
                if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            },
        )

    def test_frozen_doi_evidence_must_match_canonical_publication(self):
        work = self._work("pub-a", "Publication A", "10.1/a")
        links = self._source_links()
        links["sources"]["scopus"]["links"] = [
            {
                "record_id": "123456",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "doi",
            }
        ]
        fallback = {
            "academicData": {
                "scopus": {
                    "articles": [
                        {
                            "scopus_id": "123456",
                            "title": "Publication A",
                            "doi": "10.1/wrong",
                        }
                    ]
                }
            }
        }
        root = self._root(
            self._registry([work]),
            fallback=fallback,
            source_links=links,
        )
        violations = data_rules.audit_academic_data(root)
        matches = [
            v
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            and v.subject == "source-links:scopus:record-id:123456:snapshot"
        ]
        self.assertEqual(len(matches), 1)
        self.assertIn("DOI evidence", matches[0].message)

    def test_frozen_scholar_title_evidence_must_match_canonical_publication(self):
        work = self._work("pub-a", "Publication A", None)
        links = self._source_links()
        links["sources"]["google_scholar"]["links"] = [
            {
                "record_id": "Author:Record",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "normalized_title",
            }
        ]
        fallback = {
            "academicData": {
                "google_scholar": {
                    "articles": [
                        {
                            "link": (
                                "https://scholar.google.com/citations?"
                                "citation_for_view=Author:Record"
                            ),
                            "title": "Different Publication",
                        }
                    ]
                }
            }
        }
        root = self._root(
            self._registry([work]),
            fallback=fallback,
            source_links=links,
        )
        violations = data_rules.audit_academic_data(root)
        matches = [
            v
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            and v.subject
            == "source-links:google_scholar:record-id:Author:Record:snapshot"
        ]
        self.assertEqual(len(matches), 1)
        self.assertIn("Title evidence", matches[0].message)

    def test_alias_and_primary_match_basis_are_role_specific(self):
        work = self._work("pub-a", "Publication A", None)
        links = self._source_links()
        links["sources"]["google_scholar"]["links"] = [
            {
                "record_id": "Author:A",
                "publication_id": "pub-a",
                "role": "primary",
                "match_basis": "doi",
            },
            {
                "record_id": "Author:B",
                "publication_id": "pub-a",
                "role": "alias",
                "primary_record_id": "Author:A",
                "match_basis": "normalized_title",
            },
        ]
        fallback = {
            "academicData": {
                "google_scholar": {
                    "articles": [
                        {
                            "link": (
                                "https://scholar.google.com/citations?"
                                "citation_for_view=Author:A"
                            ),
                            "title": "Publication A",
                        },
                        {
                            "link": (
                                "https://scholar.google.com/citations?"
                                "citation_for_view=Author:B"
                            ),
                            "title": "Publication A",
                        },
                    ]
                }
            }
        }
        root = self._root(
            self._registry([work]),
            fallback=fallback,
            source_links=links,
        )
        violations = data_rules.audit_academic_data(root)
        subjects = {
            v.subject
            for v in violations
            if v.rule_id == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
        }
        self.assertIn(
            "source-links:google_scholar:link:0:match-basis",
            subjects,
        )
        self.assertIn(
            "source-links:google_scholar:link:1:match-basis",
            subjects,
        )

    def test_bibliometric_unicode_hyphen_duplicate_is_detected_per_source(self):
        fallback = {
            "academicData": {
                "google_scholar": {
                    "articles": [
                        {
                            "title": (
                                "Genome‐enabled prediction through machine learning "
                                "methods considering different levels of trait complexity"
                            )
                        },
                        {
                            "title": (
                                "Genome-enabled prediction through machine learning "
                                "methods considering different levels of trait complexity."
                            )
                        },
                    ]
                },
                "scopus": {"articles": [{"title": "Another title"}]},
            }
        }
        root = self._root(self._registry([]), fallback)
        violations = data_rules.audit_academic_data(root)
        matches = [
            v
            for v in violations
            if v.rule_id == "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE"
        ]
        self.assertEqual(len(matches), 1)
        self.assertEqual(
            matches[0].subject,
            (
                "source:google_scholar|title:genome enabled prediction through "
                "machine learning methods considering different levels of trait "
                "complexity"
            ),
        )


if __name__ == "__main__":
    unittest.main()
