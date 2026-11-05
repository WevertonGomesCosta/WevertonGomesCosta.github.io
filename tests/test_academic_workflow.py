"""Contract tests for the scheduled academic refresh workflow."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "update-academic-data.yml"


class TestAcademicWorkflowContract(unittest.TestCase):
    def test_schedule_secrets_and_manual_dispatch(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        for expected in (
            'cron: "17 9 * * 3"',
            "workflow_dispatch:",
            "github.ref == 'refs/heads/main'",
            "persist-credentials: false",
            "SERPAPI_API_KEY",
            "SERPAPI_API_KEY2",
            "SCOPUS_API_KEY",
            "SCOPUS_INSTTOKEN",
            "ACADEMIC_SCHEDULED_REFRESH",
            "github.event_name == 'schedule'",
            "ACADEMIC_UPDATE_PUSH_TOKEN",
            "github.token",
            'trap \'rm -f keys.json\' EXIT',
        ):
            with self.subTest(expected=expected):
                self.assertIn(expected, source)

    def test_validate_before_committing_only_generated_data(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertLess(
            source.index("python update_fallback.py"),
            source.index("python scripts/build_bibliometric_metrics.py --check"),
        )
        self.assertLess(
            source.index("python scripts/audit_repository.py"),
            source.index("git add --"),
        )
        for filename in (
            "fallback-data.json",
            "bibliometric-metrics.json",
            "academic-registry.json",
            "bibliographic-source-links.json",
        ):
            with self.subTest(filename=filename):
                self.assertIn(filename, source)
        self.assertIn("gh auth setup-git", source)
        self.assertIn("checks: read", source)
        self.assertIn('candidate_branch="automation/academic-refresh/', source)
        self.assertIn("git push origin HEAD:", source)
        self.assertIn('Wait for required repository audit', source)
        self.assertIn('check_name=audit', source)
        self.assertIn('.app.id == 15368', source)
        self.assertIn("git push origin HEAD:refs/heads/main", source)
        self.assertLess(
            source.index("git push origin HEAD:\"refs/heads/$candidate_branch\""),
            source.index("Wait for required repository audit"),
        )
        self.assertLess(
            source.index("Wait for required repository audit"),
            source.index("git push origin HEAD:refs/heads/main"),
        )
        self.assertIn('Remove temporary audit branch', source)
        self.assertNotIn("git add -A", source)
        self.assertNotIn("git add .", source)


    def test_private_operational_summary_runs_after_failure_or_noop(self):
        source = WORKFLOW.read_text(encoding="utf-8")
        for expected in (
            "id: secrets",
            "id: collect",
            "id: validation",
            "id: audit",
            "id: publish",
            "id: cleanup",
            'ACADEMIC_HEALTH_SUMMARY_PATH="$GITHUB_STEP_SUMMARY"',
            "Summarize academic workflow outcome",
            "if: always()",
            "COLLECTION_OUTCOME:",
            "AUDIT_OUTCOME:",
            "PUBLISH_OUTCOME:",
            "CANDIDATE_BRANCH:",
            '>> "$GITHUB_STEP_SUMMARY"',
        ):
            with self.subTest(expected=expected):
                self.assertIn(expected, source)
        self.assertLess(
            source.index("Remove temporary audit branch"),
            source.index("Summarize academic workflow outcome"),
        )
        self.assertIn('"$CANDIDATE_CHANGED" == "false"', source)
        self.assertIn('"$PUBLISH_OUTCOME" == "success"', source)
        self.assertIn('"$COLLECTION_OUTCOME" != "success"', source)
        self.assertNotIn("git add -A", source)



if __name__ == "__main__":
    unittest.main()
