"""Publish locally collected academic data using an audited GitHub pull request.

Explicit --publish opt-in avoids triggering remote writes in GitHub Actions.
Only the four generated JSON files and the versioned WoS export are allowed.
"""
from __future__ import annotations

from datetime import datetime, timezone
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from uuid import uuid4


PUBLISHABLE_FILES = frozenset({
    "fallback-data.json",
    "bibliometric-metrics.json",
    "academic-registry.json",
    "bibliographic-source-links.json",
    "data/sources/web-of-science/savedrecs.txt",
})

REQUIRED_AUDIT_APP_ID = 15368
AUDIT_QUERY = (
    '[.check_runs[] | select(.name == "audit" and .app.id == 15368) '
    '| if .status == "completed" then .conclusion else "pending" end][0] // "pending"'
)


class LocalPublishError(RuntimeError):
    """Recoverable Git/GitHub CLI or repository-safety problem."""


def run_command(root: Path, *args: str) -> str:
    try:
        result = subprocess.run(
            list(args),
            cwd=root,
            text=True,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
    except OSError as exc:
        raise LocalPublishError(
            f"Não foi possível executar {args[0]}: {type(exc).__name__}"
        ) from exc
    if result.returncode:
        details = (result.stderr or result.stdout).strip()
        raise LocalPublishError(
            f"Comando {args[0]} {args[1] if len(args) > 1 else ''} "
            f"falhou ({result.returncode}): {details[:1200]}"
        )
    # Porcelain v1 encodes the working-tree status in its leading column.
    # .strip() would remove a significant initial space from " M path".
    return result.stdout.rstrip("\r\n")


def _changed_paths(status: str) -> set[str]:
    paths = set()
    for row in status.splitlines():
        if len(row) < 4 or row[2] != " ":
            raise LocalPublishError(f"Status do Git não reconhecido: {row!r}")
        path = row[3:]
        # Quoted/renamed files are never among the five permitted paths.
        if path.startswith('"') or " -> " in path:
            raise LocalPublishError(f"Alteração inesperada: {path}")
        paths.add(path.replace("\\", "/"))
    return paths


def _verify_changes(root: Path, run) -> set[str]:
    changed = _changed_paths(
        run(root, "git", "status", "--porcelain=v1", "--untracked-files=all")
    )
    unexpected = changed - PUBLISHABLE_FILES
    if unexpected:
        raise LocalPublishError(
            "Há alterações fora dos cinco arquivos autorizados: "
            + ", ".join(sorted(unexpected))
            + ". Resolva-as antes de usar --publish."
        )
    return changed


def check_publish_ready(root: Path, *, run=run_command) -> None:
    """Fail before costly API collection if local publishing is unavailable."""
    if os.environ.get("GITHUB_ACTIONS", "").lower() == "true":
        raise LocalPublishError("--publish não pode ser executado no GitHub Actions.")
    if not shutil.which("git") or not shutil.which("gh"):
        raise LocalPublishError(
            "É necessário instalar Git e GitHub CLI (gh), "
            "depois executar 'gh auth login' no computador."
        )

    repo_root = Path(run(root, "git", "rev-parse", "--show-toplevel")).resolve()
    if repo_root != root.resolve():
        raise LocalPublishError("Execute o script na raiz do repositório.")

    if run(root, "git", "branch", "--show-current") != "main":
        raise LocalPublishError(
            "--publish exige a branch main; execute 'git switch main'."
        )

    _verify_changes(root, run)
    run(root, "gh", "auth", "status")
    run(root, "git", "fetch", "--quiet", "origin", "main")
    head = run(root, "git", "rev-parse", "HEAD")
    origin_head = run(root, "git", "rev-parse", "refs/remotes/origin/main")
    if head != origin_head:
        raise LocalPublishError(
            "A main local está diferente de origin/main. "
            "Sincronize com 'git pull --ff-only origin main' "
            "antes da atualização (preserve o export WoS local)."
        )


def _validate_local(root: Path, run) -> None:
    for args in (
        (sys.executable, "scripts/build_bibliometric_metrics.py", "--check"),
        (sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"),
        (sys.executable, "-B", "scripts/render_shared_site.py", "--check"),
        (sys.executable, "scripts/audit_repository.py"),
        ("git", "diff", "--check"),
        ("git", "diff", "--cached", "--check"),
    ):
        run(root, *args)


def wait_for_audit(
    root: Path,
    repo: str,
    sha: str,
    *,
    run=run_command,
    sleep=time.sleep,
    attempts: int = 36,
) -> None:
    """Accept only the required Actions audit check for this exact commit."""
    for _ in range(attempts):
        status = run(
            root,
            "gh",
            "api",
            f"repos/{repo}/commits/{sha}/check-runs?check_name=audit",
            "--jq",
            AUDIT_QUERY,
        ).strip()
        if status == "success":
            return
        if status != "pending":
            raise LocalPublishError(
                f"Auditoria obrigatória não aprovada ({status}). "
                "PR mantido para verificação; nenhum merge efetuado."
            )
        sleep(10)
    raise LocalPublishError(
        "Tempo excedido aguardando audit. PR mantido sem merge."
    )


def publish_local(
    root: Path,
    *,
    run=run_command,
    sleep=time.sleep,
) -> str | None:
    """Commit allowed changes, open PR, await audit and squash-merge.

    The caller must have already called check_publish_ready BEFORE collection.
    On failure after push, the PR/branch remain available for investigation.
    """
    root = root.resolve()
    changed = _verify_changes(root, run)
    if not changed:
        print("Sem alterações nos dados nem no export WoS; PR desnecessário.")
        return None

    _validate_local(root, run)
    repo = run(root, "gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")
    if not repo or "/" not in repo:
        raise LocalPublishError("Não foi possível determinar o repositório remoto.")

    suffix = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S") + "-" + uuid4().hex[:6]
    branch = f"automation/local-academic-update-{suffix}"
    made_commit = False

    try:
        run(root, "git", "switch", "-c", branch)
        run(root, "git", "add", "--", *sorted(PUBLISHABLE_FILES))
        staged = set(
            run(root, "git", "diff", "--cached", "--name-only").splitlines()
        )
        if not staged:
            run(root, "git", "switch", "main")
            print("Sem alterações versionáveis; PR desnecessário.")
            return None
        if staged - PUBLISHABLE_FILES:
            raise LocalPublishError("Arquivos não autorizados no commit.")

        run(root, "git", "diff", "--cached", "--check")
        run(root, "git", "commit", "-m", "chore(data): update academic sources and WoS export")
        made_commit = True
        sha = run(root, "git", "rev-parse", "HEAD")
        run(root, "git", "push", "-u", "origin", branch)
    finally:
        # Never discard uncommitted files if commit preparation fails.
        if made_commit and run(root, "git", "branch", "--show-current") == branch:
            run(root, "git", "switch", "main")

    body = (
        "Atualização local das fontes acadêmicas, incluindo export WoS quando alterado.\n\n"
        "Arquivos permitidos: os quatro JSONs de dados e "
        "data/sources/web-of-science/savedrecs.txt.\n"
        "Merge automático somente após aprovação do check obrigatório audit."
    )
    pr_url = run(
        root,
        "gh", "pr", "create",
        "--base", "main", "--head", branch,
        "--title", "chore(data): update academic sources from local export",
        "--body", body,
    ).strip()
    print(f"PR criado: {pr_url}")
    print("Aguardando aprovação do check obrigatório audit...")
    wait_for_audit(root, repo, sha, run=run, sleep=sleep)
    run(
        root,
        "gh", "pr", "merge", pr_url,
        "--squash", "--delete-branch", "--match-head-commit", sha,
    )
    run(root, "git", "pull", "--ff-only", "origin", "main")
    print(f"PR integrado após auditoria: {pr_url}")
    return pr_url
