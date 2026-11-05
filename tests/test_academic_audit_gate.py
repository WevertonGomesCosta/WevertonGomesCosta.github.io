"""Exercise the GitHub Actions gate with a simulated transient API failure.

The real workflow must never push unreviewed academic data. A network/JSON
failure can retry; an explicit failed audit or exhausted retries must block.
"""
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "update-academic-data.yml"


def audit_script():
    source = WORKFLOW.read_text(encoding="utf-8")
    start = source.index("      - name: Wait for required repository audit")
    run_start = source.index("        run: |\n", start) + len("        run: |\n")
    end = source.index("      - name: Publish audited commit to main", run_start)
    return textwrap.dedent(source[run_start:end])


class AcademicAuditGateTests(unittest.TestCase):
    def test_gate_uses_exact_commit_and_fails_closed(self):
        script = audit_script()
        self.assertIn("commits/$CANDIDATE_SHA/check-runs?check_name=audit", script)
        self.assertIn('.app.id == 15368', script)
        self.assertIn('if audit_result="$(gh api', script)
        self.assertIn("success)", script)
        self.assertIn("exit 0", script)
        self.assertIn("::error::Required repository audit finished", script)
        self.assertIn("::error::Timed out waiting", script)
        self.assertIn("GitHub check API temporarily unavailable", script)

        source = WORKFLOW.read_text(encoding="utf-8")
        self.assertRegex(
            source,
            r"- name: Publish audited commit to main\n\s+id: publish\n"
        )
        self.assertRegex(
            source,
            r"- name: Remove temporary audit branch\n"
            r"(?:[^\n]*\n)*?\s+if: always\(\) && "
            r"steps\.candidate\.outputs\.changed == 'true' "
            r"&& steps\.publish\.outcome == 'success'",
        )

    @unittest.skipUnless(shutil.which("bash"), "Bash is needed for the workflow shell")
    def test_transient_failure_retries_without_bypassing_audit(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            gh = root / "gh"
            gh.write_text(
                "#!/usr/bin/env bash\n"
                "count=$(cat \"$COUNTER\" 2>/dev/null || echo 0)\n"
                "count=$((count + 1))\n"
                "echo \"$count\" > \"$COUNTER\"\n"
                "case \"$SCENARIO\" in\n"
                "  transient)\n"
                "    if [[ \"$count\" -eq 1 ]]; then\n"
                "      echo 'unexpected end of JSON input' >&2\n"
                "      exit 1\n"
                "    elif [[ \"$count\" -eq 2 ]]; then\n"
                "      echo pending\n"
                "    else\n"
                "      echo success\n"
                "    fi ;;\n"
                "  fail) echo failure ;;\n"
                "  always-error) echo 'unexpected end of JSON input' >&2; exit 1 ;;\n"
                "esac\n",
                encoding="utf-8",
            )
            gh.chmod(0o755)

            # Shorten only the retry/sleep values in a test copy; keep the
            # exact script semantics as they run in GitHub Actions.
            script = (
                audit_script()
                .replace("seq 1 36", "seq 1 3")
                .replace("attempt $attempt/36", "attempt $attempt/3")
                .replace("-lt 36", "-lt 3")
                .replace("sleep 10", "sleep 0")
            )
            env = {
                **os.environ,
                "PATH": str(root) + os.pathsep + os.environ.get("PATH", ""),
                "COUNTER": str(root / "count"),
                "GITHUB_REPOSITORY": "example/site",
                "CANDIDATE_SHA": "a" * 40,
            }
            for scenario, expected_code, calls in (
                ("transient", 0, 3),
                ("fail", 1, 1),
                ("always-error", 1, 3),
            ):
                counter = root / "count"
                if counter.exists():
                    counter.unlink()
                result = subprocess.run(
                    ["bash", "-c", script],
                    env={**env, "SCENARIO": scenario},
                    capture_output=True, text=True,
                    check=False, timeout=20,
                )
                with self.subTest(scenario=scenario):
                    self.assertEqual(result.returncode, expected_code,
                                     result.stdout + result.stderr)
                    self.assertEqual(int(counter.read_text()), calls)
                    if scenario == "transient":
                        self.assertIn("temporarily unavailable", result.stdout)
                        self.assertIn("Required audit passed", result.stdout)
                    elif scenario == "fail":
                        self.assertIn("Required repository audit finished with failure",
                                      result.stdout)
                    else:
                        self.assertIn("Timed out waiting", result.stdout)


if __name__ == "__main__":
    unittest.main()
