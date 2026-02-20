#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run an OpenCode task in desktop background mode")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--model", default="anthropic/claude-sonnet-4-6")
    parser.add_argument("--timeout", type=int, default=1800)
    parser.add_argument("--state-dir", default="/root/.opencode/MEMORY/STATE/tasker-desktop")
    args = parser.parse_args()

    state_dir = Path(args.state_dir)
    jobs_dir = state_dir / "jobs"
    logs_dir = state_dir / "logs"
    jobs_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)

    status_path = jobs_dir / f"{args.job_id}.json"
    stdout_path = logs_dir / f"{args.job_id}.stdout.log"
    stderr_path = logs_dir / f"{args.job_id}.stderr.log"

    started_at = int(time.time())
    write_json(
        status_path,
        {
            "job_id": args.job_id,
            "status": "running",
            "model": args.model,
            "prompt": args.prompt,
            "started_at": started_at,
            "updated_at": started_at,
            "stdout_log": str(stdout_path),
            "stderr_log": str(stderr_path),
        },
    )

    cmd = [
        "/usr/bin/timeout",
        "--signal=TERM",
        f"{args.timeout}s",
        "/usr/local/bin/opencode",
        "run",
        "--format",
        "json",
        "--model",
        args.model,
        "--title",
        "Desktop Tasker Background",
        args.prompt,
    ]

    env = os.environ.copy()
    env["HOME"] = "/root"
    env["PATH"] = "/root/.bun/bin:/usr/local/bin:/usr/bin:/bin"
    env["XDG_DATA_HOME"] = "/root/.local/share"

    with stdout_path.open("w", encoding="utf-8") as out, stderr_path.open("w", encoding="utf-8") as err:
        proc = subprocess.run(cmd, stdout=out, stderr=err, env=env)

    finished_at = int(time.time())
    raw_out = stdout_path.read_text(encoding="utf-8", errors="ignore")
    text_parts = []
    for line in raw_out.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except Exception:
            continue
        if event.get("type") == "text" and isinstance(event.get("part", {}).get("text"), str):
            text_parts.append(event["part"]["text"])

    final_text = "".join(text_parts).strip()
    timed_out = proc.returncode == 124
    status = "completed" if final_text else "failed"
    if timed_out:
        status = "failed"

    write_json(
        status_path,
        {
            "job_id": args.job_id,
            "status": status,
            "model": args.model,
            "prompt": args.prompt,
            "started_at": started_at,
            "updated_at": finished_at,
            "finished_at": finished_at,
            "exit_code": proc.returncode,
            "timed_out": timed_out,
            "stdout_log": str(stdout_path),
            "stderr_log": str(stderr_path),
            "result_preview": final_text[:1200],
        },
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())
