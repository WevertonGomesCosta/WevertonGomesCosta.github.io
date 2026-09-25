import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repository_audit import data_rules


EXPECTED_SOURCE_SNAPSHOTS = {
    "google_scholar": (28, "a2b70a09"),
    "scopus": (22, "42d639e8"),
    "web_of_science": (21, "10b3d50e"),
    "orcid": (27, "38412a9e"),
}

SCHOLAR_DUPLICATE_PUBLICATION_ID = (
    "journal-2021-genome-enabled-prediction-trait-complexity"
)
SCHOLAR_PRIMARY_RECORD_ID = "eJNKcHsAAAAJ:qjMakFHDy7sC"
SCHOLAR_ALIAS_RECORD_ID = "eJNKcHsAAAAJ:Se3iqnhoufwC"


def fnv1a_32(value: str) -> str:
    hash_value = 0x811C9DC5
    for byte in value.encode("utf-8"):
        hash_value ^= byte
        hash_value = (hash_value * 0x01000193) & 0xFFFFFFFF
    return f"{hash_value:08x}"


def source_snapshot_signature(links: list[dict]) -> str:
    rows = sorted(
        "|".join(
            (
                link["record_id"],
                link["publication_id"],
                link["role"],
                link.get("primary_record_id", ""),
                link["match_basis"],
            )
        )
        for link in links
    )
    return fnv1a_32("\n".join(rows))


class TestFrozenBibliographicSourceLinks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload = json.loads(
            (ROOT / "bibliographic-source-links.json").read_text(
                encoding="utf-8"
            )
        )

    def test_source_mapping_snapshot_counts_and_signatures_are_frozen(self):
        sources = self.payload["sources"]
        self.assertEqual(set(sources), set(EXPECTED_SOURCE_SNAPSHOTS))
        for source, (expected_count, expected_signature) in (
            EXPECTED_SOURCE_SNAPSHOTS.items()
        ):
            with self.subTest(source=source):
                links = sources[source]["links"]
                self.assertEqual(len(links), expected_count)
                self.assertEqual(
                    source_snapshot_signature(links),
                    expected_signature,
                )

    def test_scholar_duplicate_is_explicit_primary_alias_pair(self):
        links = [
            link
            for link in self.payload["sources"]["google_scholar"]["links"]
            if link["publication_id"] == SCHOLAR_DUPLICATE_PUBLICATION_ID
        ]
        self.assertEqual(len(links), 2)

        by_id = {link["record_id"]: link for link in links}
        self.assertEqual(
            set(by_id),
            {SCHOLAR_PRIMARY_RECORD_ID, SCHOLAR_ALIAS_RECORD_ID},
        )
        self.assertEqual(by_id[SCHOLAR_PRIMARY_RECORD_ID]["role"], "primary")
        self.assertEqual(
            by_id[SCHOLAR_PRIMARY_RECORD_ID]["match_basis"],
            "normalized_title",
        )
        self.assertEqual(by_id[SCHOLAR_ALIAS_RECORD_ID]["role"], "alias")
        self.assertEqual(
            by_id[SCHOLAR_ALIAS_RECORD_ID]["primary_record_id"],
            SCHOLAR_PRIMARY_RECORD_ID,
        )
        self.assertEqual(
            by_id[SCHOLAR_ALIAS_RECORD_ID]["match_basis"],
            "manual_duplicate_reconciliation",
        )

    def test_unmatched_current_records_are_not_promoted_to_links(self):
        scholar_ids = {
            link["record_id"]
            for link in self.payload["sources"]["google_scholar"]["links"]
        }
        self.assertTrue(
            {
                "eJNKcHsAAAAJ:dhFuZR0502QC",
                "eJNKcHsAAAAJ:mB3voiENLucC",
                "eJNKcHsAAAAJ:0EnyYjriUFMC",
                "eJNKcHsAAAAJ:u5HHmVD_uO8C",
                "eJNKcHsAAAAJ:IWHjjKOFINEC",
                "eJNKcHsAAAAJ:Tyk-4Ss8FVUC",
                "eJNKcHsAAAAJ:-f6ydRqryjwC",
            }.isdisjoint(scholar_ids)
        )

        orcid_ids = {
            link["record_id"]
            for link in self.payload["sources"]["orcid"]["links"]
        }
        self.assertNotIn("doi:10.47328/ufvbbt.2022.326", orcid_ids)

    def test_frozen_links_pass_structure_while_duplicate_debt_remains(self):
        violations = data_rules.audit_academic_data(ROOT)
        self.assertFalse(
            [
                violation
                for violation in violations
                if violation.rule_id
                == "BIBLIOGRAPHIC_SOURCE_LINKS_STRUCTURE"
            ],
            violations,
        )
        duplicate = [
            violation
            for violation in violations
            if violation.rule_id
            == "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE"
        ]
        self.assertEqual(len(duplicate), 1)


if __name__ == "__main__":
    unittest.main()
