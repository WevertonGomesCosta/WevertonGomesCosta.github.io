from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Sequence

from repository_audit.core import AuditConfigError, RULE_IDS
from repository_audit.engine import AuditReport, run_audit, write_bootstrap_baseline


def _path_from_root(root: Path, value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else root / path


def _item_payload(item: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "rule_id": getattr(item, "rule_id"),
        "path": getattr(item, "path"),
        "subject": getattr(item, "subject"),
        "fingerprint": getattr(item, "fingerprint"),
    }
    if hasattr(item, "message"):
        payload["message"] = getattr(item, "message")
    if hasattr(item, "reason"):
        payload["reason"] = getattr(item, "reason")
    return payload


def _report_payload(report: AuditReport) -> dict[str, object]:
    return {
        "passed": report.passed,
        "counts": {
            "known": len(report.known),
            "exempted": len(report.exempted),
            "new": len(report.new),
            "resolved": len(report.resolved),
            "growth": len(report.growth),
        },
        "known": [_item_payload(item) for item in report.known],
        "exempted": [_item_payload(item) for item in report.exempted],
        "new": [_item_payload(item) for item in report.new],
        "resolved": [_item_payload(item) for item in report.resolved],
        "growth": [_item_payload(item) for item in report.growth],
    }


def _render_human(report: AuditReport) -> str:
    touched = {
        item.rule_id
        for collection in (
            report.known,
            report.exempted,
            report.new,
            report.resolved,
            report.growth,
        )
        for item in collection
    }
    clean = len(RULE_IDS - touched)
    lines = [
        "Repository audit",
        "",
        f"PASS       {clean} rules clean",
        f"KNOWN      {len(report.known)} baseline violations",
        f"EXEMPTED   {len(report.exempted)} active policy exceptions",
        f"NEW        {len(report.new)}",
        f"RESOLVED   {len(report.resolved)}",
        f"GROWTH     {len(report.growth)}",
        "",
        f"Result: {'PASS' if report.passed else 'FAIL'}",
    ]
    for label, items in (
        ("NEW", report.new),
        ("RESOLVED", report.resolved),
        ("GROWTH", report.growth),
    ):
        for item in items:
            lines.append(
                f"{label}: {item.rule_id} {item.path} {item.subject}"
            )
    return "\n".join(lines)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Audit repository structural invariants"
    )
    parser.add_argument("--root")
    parser.add_argument("--policy", default=".audit/policy.json")
    parser.add_argument("--baseline", default=".audit/known-debt.json")
    parser.add_argument("--reference-baseline")
    parser.add_argument("--json", action="store_true", dest="as_json")
    parser.add_argument("--emit-current-debt")
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    default_root = Path(__file__).resolve().parents[1]
    root = Path(args.root).resolve() if args.root else default_root
    policy = _path_from_root(root, args.policy)

    try:
        if args.emit_current_debt:
            output = _path_from_root(root, args.emit_current_debt)
            baseline = write_bootstrap_baseline(root, policy, output)
            if args.as_json:
                print(
                    json.dumps(
                        {
                            "generated": str(output),
                            "entries": len(baseline.entries),
                        }
                    )
                )
            else:
                print(
                    f"Bootstrap baseline written: {output} "
                    f"({len(baseline.entries)} entries)"
                )
            return 0

        baseline = _path_from_root(root, args.baseline)
        reference = (
            _path_from_root(root, args.reference_baseline)
            if args.reference_baseline
            else None
        )
        report = run_audit(root, policy, baseline, reference)
        if args.as_json:
            print(
                json.dumps(
                    _report_payload(report),
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
        else:
            print(_render_human(report))
        return 0 if report.passed else 1
    except (AuditConfigError, OSError, UnicodeError) as exc:
        print(f"Audit configuration error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(
            f"Audit internal error: {type(exc).__name__}: {exc}",
            file=sys.stderr,
        )
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
