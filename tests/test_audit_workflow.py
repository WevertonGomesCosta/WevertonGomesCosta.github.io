from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "repository-audit.yml"


class TestWorkflowContract(unittest.TestCase):
    def test_repository_audit_workflow_contract(self):
        source = WORKFLOW.read_text(encoding="utf-8")

        required_literals = (
            "pull_request:",
            "push:",
            "branches: [main]",
            "fetch-depth: 0",
            'python-version: "3.13"',
            'python -m unittest discover -s tests -p "test_*.py"',
            "Run shared site render check",
            "python -B scripts/render_shared_site.py --check",
            "github.event.pull_request.base.sha",
            "github.event.before",
            "git cat-file -e",
            "--reference-baseline",
            "python scripts/audit_repository.py",
        )
        for literal in required_literals:
            with self.subTest(literal=literal):
                self.assertIn(literal, source)

        self.assertLess(
            source.index("Run unit tests"),
            source.index("Run shared site render check"),
        )
        self.assertLess(
            source.index("Run shared site render check"),
            source.index("Resolve reference baseline"),
        )

        self.assertNotIn("workflow_dispatch", source)
        self.assertIn('BASE_SHA="${{ github.event.pull_request.base.sha }}"', source)
        self.assertIn('BASE_SHA="${{ github.event.before }}"', source)
        self.assertIn('if [[ -z "$BASE_SHA" || "$BASE_SHA" =~ ^0+$ ]]; then', source)
        self.assertIn('git cat-file -e "${BASE_SHA}^{commit}"', source)
        self.assertIn(
            'git cat-file -e "${BASE_SHA}:.audit/known-debt.json" 2>/dev/null',
            source,
        )
        self.assertIn(
            'git show "${BASE_SHA}:.audit/known-debt.json" > /tmp/base-known-debt.json',
            source,
        )
        self.assertIn("if: steps.reference.outputs.has_reference == 'true'", source)
        self.assertIn("if: steps.reference.outputs.has_reference != 'true'", source)


if __name__ == "__main__":
    unittest.main()
