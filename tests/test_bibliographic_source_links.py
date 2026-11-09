import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from repository_audit import data_rules


EXPECTED_SOURCE_SNAPSHOTS = {
    "google_scholar": (30, "99809df1"),
    "scopus": (24, "94b54634"),
    "web_of_science": (22, "918dad1d"),
    "orcid": (29, "cdc9a3d6"),
}

WOS_FROZEN_RECORD_IDS = frozenset({
    "doi:10.1002/csc2.20488",
    "doi:10.1002/csc2.20816",
    "doi:10.1007/s00122-026-05387-3",
    "doi:10.1007/s10681-019-2499-x",
    "doi:10.1007/s10681-022-03077-x",
    "doi:10.1016/j.csbj.2022.09.029",
    "doi:10.1016/j.livsci.2024.105433",
    "doi:10.1016/j.sajb.2024.10.052",
    "doi:10.1111/pbr.12972",
    "doi:10.1111/pbr.12973",
    "doi:10.1371/journal.pone.0245298",
    "doi:10.1590/1678-992x-2022-0233",
    "doi:10.1590/1678-992x-2025-0020",
    "doi:10.1590/1984-70332020v20n4a55",
    "doi:10.1590/1984-70332021v21n3a41",
    "doi:10.3389/fpls.2024.1483340",
    "doi:10.3390/agronomy13030937",
    "doi:10.3390/agronomy13051261",
    "doi:10.3390/agronomy14102234",
    "doi:10.37496/rbz5320240001",
    "doi:10.4238/gmr18332",
    "doi:10.4238/gmr18434",
})

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
                if source == "web_of_science":
                    links = [
                        link for link in links
                        if link["record_id"] in WOS_FROZEN_RECORD_IDS
                    ]
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

    def test_frozen_links_resolve_the_known_scholar_duplicate(self):
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
        self.assertFalse(
            [
                violation
                for violation in violations
                if violation.rule_id
                == "BIBLIOMETRIC_SOURCE_DUPLICATE_TITLE"
            ],
            violations,
        )


if __name__ == "__main__":
    unittest.main()
