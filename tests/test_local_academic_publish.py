"""Offline tests for the guarded local GitHub PR publication flow."""
from pathlib import Path
import tempfile
import unittest
from unittest import mock

import update_fallback
from scripts import local_academic_publish as publish


class StubRun:
    def __init__(self, root, changed=None, audit=None):
        self.root = root
        self.changed = changed or ""
        self.audit = list(audit or ["success"])
        self.calls = []
        self.current_branch = "main"

    def __call__(self, root, *args):
        self.calls.append(args)
        if args[:3] == ("git", "rev-parse", "--show-toplevel"):
            return str(self.root)
        if args[:3] == ("git", "branch", "--show-current"):
            return self.current_branch
        if args[:3] == ("git", "status", "--porcelain=v1"):
            return self.changed
        if args[:3] == ("git", "rev-parse", "refs/remotes/origin/main"):
            return "base123"
        if args[:3] == ("git", "rev-parse", "HEAD"):
            return "candidate456" if self.current_branch != "main" else "base123"
        if args[:3] == ("git", "diff", "--cached"):
            return (
                "fallback-data.json\n"
                "data/sources/web-of-science/savedrecs.txt"
                if self.changed else ""
            )
        if args[:2] == ("git", "switch"):
            self.current_branch = args[-1]
            return ""
        if args[:3] == ("gh", "repo", "view"):
            return "WevertonGomesCosta/WevertonGomesCosta.github.io"
        if args[:3] == ("gh", "pr", "create"):
            return "https://github.com/WevertonGomesCosta/WevertonGomesCosta.github.io/pull/999"
        if args[:2] == ("gh", "api"):
            outcome = self.audit.pop(0)
            if isinstance(outcome, Exception):
                raise outcome
            return outcome
        return ""


class TestLocalAcademicPublish(unittest.TestCase):
    def test_command_preserves_leading_git_porcelain_status(self):
        # A real subprocess returns " M file", but str.strip() changes it
        # into "M file" and the publish gate rejects a valid change.
        stdout = " M bibliometric-metrics.json\n M fallback-data.json\n"
        completed = mock.Mock(returncode=0, stdout=stdout, stderr="")
        with mock.patch.object(publish.subprocess, "run", return_value=completed):
            result = publish.run_command(Path("."), "git", "status", "--porcelain=v1")
        self.assertEqual(result, stdout.rstrip("\n"))
        self.assertEqual(
            publish._changed_paths(result),
            {"bibliometric-metrics.json", "fallback-data.json"},
        )

    def test_porcelain_status_supports_staged_and_untracked_files(self):
        result = (
            "M  fallback-data.json\n"
            "?? data/sources/web-of-science/savedrecs.txt\n"
        )
        self.assertEqual(
            publish._changed_paths(result),
            {
                "fallback-data.json",
                "data/sources/web-of-science/savedrecs.txt",
            },
        )

    @mock.patch.dict("os.environ", {"GITHUB_ACTIONS": ""})
    def test_reject_other_uncommitted_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(root, changed=" M style.css")
            with mock.patch.object(publish.shutil, "which", return_value="installed"):
                with self.assertRaisesRegex(
                    publish.LocalPublishError, "fora dos cinco arquivos"
                ):
                    publish.check_publish_ready(root, run=stub)
            self.assertFalse(any(x[:2] == ("git", "fetch") for x in stub.calls))

    @mock.patch.dict("os.environ", {"GITHUB_ACTIONS": ""})
    def test_reject_outdated_main(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(root)
            stub.current_branch = "main"
            original = stub.__call__

            def runner(root, *args):
                if args == ("git", "rev-parse", "refs/remotes/origin/main"):
                    return "different789"
                return original(root, *args)

            with mock.patch.object(publish.shutil, "which", return_value="installed"):
                with self.assertRaisesRegex(
                    publish.LocalPublishError, "origin/main"
                ):
                    publish.check_publish_ready(root, run=runner)

    def test_noop_does_not_create_pr(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(root)
            result = publish.publish_local(root, run=stub, sleep=lambda _: None)
            self.assertIsNone(result)
            self.assertFalse(any(x[:3] == ("gh", "pr", "create") for x in stub.calls))

    def test_pr_merge_only_after_required_audit_success(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(
                root,
                changed=(
                    " M fallback-data.json\n"
                    " M data/sources/web-of-science/savedrecs.txt"
                ),
                audit=[
                    "pending",
                    publish.LocalPublishError("gh api falhou: unexpected end of JSON input"),
                    "success",
                ],
            )
            pr = publish.publish_local(root, run=stub, sleep=lambda _: None)
            self.assertTrue(pr.endswith("/pull/999"))
            commands = stub.calls
            created = next(i for i, x in enumerate(commands) if x[:3] == ("gh", "pr", "create"))
            checked = next(i for i, x in enumerate(commands) if x[:2] == ("gh", "api"))
            merged = next(i for i, x in enumerate(commands) if x[:3] == ("gh", "pr", "merge"))
            self.assertLess(created, checked)
            self.assertLess(checked, merged)
            self.assertEqual(
                sum(x[:2] == ("gh", "api") for x in commands), 3,
                "A falha transitória deve ser repetida antes do merge",
            )
            self.assertIn("--match-head-commit", commands[merged])
            self.assertIn("candidate456", commands[merged])
            self.assertIn("--squash", commands[merged])
            self.assertTrue(
                any(
                    x[:3] == ("git", "add", "--")
                    and "data/sources/web-of-science/savedrecs.txt" in x
                    for x in commands
                )
            )
            self.assertEqual(stub.current_branch, "main")

    def test_failed_audit_leaves_pr_without_merge(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(
                root,
                changed=" M fallback-data.json",
                audit=["failure"],
            )
            with self.assertRaisesRegex(
                publish.LocalPublishError, "Auditoria obrigatória não aprovada"
            ):
                publish.publish_local(root, run=stub, sleep=lambda _: None)
            self.assertTrue(any(x[:3] == ("gh", "pr", "create") for x in stub.calls))
            self.assertFalse(any(x[:3] == ("gh", "pr", "merge") for x in stub.calls))
            self.assertEqual(stub.current_branch, "main")

    def test_transient_errors_exhaust_retries_and_preserve_pr(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(
                root,
                changed=" M data/sources/web-of-science/savedrecs.txt",
                audit=[
                    publish.LocalPublishError("unexpected end of JSON input"),
                    publish.LocalPublishError("temporary API error"),
                    publish.LocalPublishError("unexpected end of JSON input"),
                ],
            )
            with self.assertRaisesRegex(
                publish.LocalPublishError, "Tempo excedido aguardando audit"
            ):
                publish.wait_for_audit(
                    root, "example/site", "a" * 40,
                    run=stub, sleep=lambda _: None, attempts=3,
                )

            self.assertEqual(
                sum(x[:2] == ("gh", "api") for x in stub.calls), 3
            )
            self.assertFalse(any(x[:3] == ("gh", "pr", "merge") for x in stub.calls))

    def test_explicit_failed_audit_does_not_retry_or_merge(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(root, audit=["failure"])
            with self.assertRaisesRegex(
                publish.LocalPublishError, "Auditoria obrigatória não aprovada"
            ):
                publish.wait_for_audit(
                    root, "example/site", "a" * 40,
                    run=stub, sleep=lambda _: None, attempts=3,
                )
            self.assertEqual(
                sum(x[:2] == ("gh", "api") for x in stub.calls), 1
            )

    def test_invalid_retry_budget_fails_before_calling_api(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve()
            stub = StubRun(root)
            with self.assertRaises(ValueError):
                publish.wait_for_audit(
                    root, "example/site", "a" * 40,
                    run=stub, sleep=lambda _: None, attempts=0,
                )
            self.assertFalse(any(x[:2] == ("gh", "api") for x in stub.calls))

    def test_argparse_publish_is_explicit_opt_in(self):
        with (
            mock.patch.object(update_fallback, "run_update", return_value=0) as update,
            mock.patch.object(update_fallback.local_academic_publish, "check_publish_ready") as ready,
            mock.patch.object(update_fallback.local_academic_publish, "publish_local") as publish_fn,
        ):
            self.assertEqual(update_fallback.main([]), 0)
            ready.assert_not_called()
            publish_fn.assert_not_called()
            self.assertEqual(update_fallback.main(["--publish"]), 0)
            ready.assert_called_once()
            publish_fn.assert_called_once()
            self.assertEqual(update.call_count, 2)

    def test_explicit_publish_does_not_run_in_actions(self):
        with tempfile.TemporaryDirectory() as temp:
            with mock.patch.dict("os.environ", {"GITHUB_ACTIONS": "true"}):
                with self.assertRaisesRegex(
                    publish.LocalPublishError, "GitHub Actions"
                ):
                    publish.check_publish_ready(Path(temp))


if __name__ == "__main__":
    unittest.main()
