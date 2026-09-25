import json
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
        "translations.json",
        "profile.json",
        "academic-registry.json",
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
    def _root(self, registry, fallback=None):
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
        return root

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
