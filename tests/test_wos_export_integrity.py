"""Validate WoS export integrity before citation data can be published."""
import csv
import io
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import update_fallback


FIELDS = [
    "Title", "Authors", "Publication Year", "DOI",
    "Times Cited, WoS Core", "2024", "2025", "2026",
]
ROWS = [
    ["Paper A", "Author A", "2024", "10.1000/paper-a", "3", "1", "1", "1"],
    ["Paper B", "Author B", "2026", "10.1000/paper-b", "0", "0", "0", "0"],
]


def export_content(fields=None, rows=None):
    stream = io.StringIO()
    writer = csv.writer(stream, lineterminator="\n")
    writer.writerow(FIELDS if fields is None else fields)
    writer.writerows(ROWS if rows is None else rows)
    return "\ufeffWeb of Science export\nTempo estipulado: 1900-2026.\n\n" + stream.getvalue()


class WebOfScienceExportIntegrityTests(unittest.TestCase):
    def parse(self, content):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "savedrecs.txt"
            path.write_text(content, encoding="utf-8")
            with self.assertLogs(level="ERROR") as log:
                result = update_fallback.fetch_wos_data(txt_file=str(path))
            self.assertIsNone(result)
            self.assertTrue(
                any("Erro ao ler savedrecs.txt" in msg for msg in log.output)
            )

    def test_valid_export_parses_without_changing_metrics(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "savedrecs.txt"
            path.write_text(export_content(), encoding="utf-8")
            result = update_fallback.fetch_wos_data(txt_file=str(path))
        self.assertIsNotNone(result)
        profile = result["profile"]
        self.assertEqual(profile["total_publications"], 2)
        self.assertEqual(profile["cited_by"]["table"][0]["citations"]["all"], 3)
        self.assertEqual(profile["cited_by"]["table"][0]["citations"]["since_2021"], 3)
        self.assertEqual(
            profile["cited_by"]["graph"],
            [
                {"year": 2024, "citations": 1, "publications": 1},
                {"year": 2025, "citations": 1, "publications": 0},
                {"year": 2026, "citations": 1, "publications": 1},
            ],
        )

    def test_real_versioned_export_still_parses(self):
        result = update_fallback.fetch_wos_data(
            txt_file=str(update_fallback.WOS_SOURCE_FILE)
        )
        self.assertIsNotNone(result)
        profile = result["profile"]
        total = profile["cited_by"]["table"][0]["citations"]["all"]
        annual = sum(x["citations"] for x in profile["cited_by"]["graph"])
        self.assertEqual(total, annual)
        self.assertEqual(profile["total_publications"], len(result["articles"]))

    def test_rejects_missing_header_and_missing_required_fields(self):
        self.parse("Not a WoS export\nPaper A\n")
        self.parse(export_content(
            fields=[x for x in FIELDS if x != "Publication Year"],
            rows=[[x for i, x in enumerate(row) if FIELDS[i] != "Publication Year"]
                  for row in ROWS],
        ))
        self.parse(export_content(
            fields=[x for x in FIELDS if not x.isdigit()],
            rows=[row[:5] for row in ROWS],
        ))
        self.parse(export_content(
            fields=FIELDS + ["2026"],
            rows=[row + ["0"] for row in ROWS],
        ))

    def test_rejects_corrupted_or_missing_rows(self):
        self.parse(export_content(rows=[ROWS[0][:-1]]))
        self.parse(export_content(rows=[ROWS[0] + ["unexpected"]]))
        self.parse(export_content(rows=[["", *ROWS[0][1:]]]))

    def test_rejects_invalid_counts_and_years(self):
        for field_index, value in (
            (4, "invalid"), (4, "-1"), (5, "invalid"), (5, "-1"),
            (2, "20x4"), (2, "1899"),
        ):
            with self.subTest(field_index=field_index, value=value):
                row = ROWS[0].copy()
                row[field_index] = value
                self.parse(export_content(rows=[row]))

    def test_rejects_incomplete_annual_citation_matrix(self):
        row = ROWS[0].copy()
        row[-1] = "0"
        self.parse(export_content(rows=[row]))

    def test_rejects_duplicate_dois(self):
        duplicate = ROWS[1].copy()
        duplicate[3] = ROWS[0][3].upper()
        self.parse(export_content(rows=[ROWS[0], duplicate]))

    def test_explicit_local_publish_preflight_rejects_invalid_export(self):
        with (
            mock.patch.object(
                update_fallback.local_academic_publish,
                "check_publish_ready",
            ) as ready,
            mock.patch.object(
                update_fallback,
                "fetch_wos_data",
                return_value=None,
            ) as wos,
            mock.patch.object(update_fallback, "run_update") as update,
            mock.patch.object(
                update_fallback.local_academic_publish, "publish_local"
            ) as publish,
        ):
            self.assertEqual(update_fallback.main(["--publish"]), 1)
            ready.assert_called_once()
            wos.assert_called_once()
            update.assert_not_called()
            publish.assert_not_called()


if __name__ == "__main__":
    unittest.main()
