#!/usr/bin/env python3
import argparse
import json
import secrets
import subprocess
import time
from pathlib import Path


STATE_DIR = Path("/root/.opencode/MEMORY/STATE/tasker-desktop")
JOBS_DIR = STATE_DIR / "jobs"


def read_job(job_id: str) -> dict:
    path = JOBS_DIR / f"{job_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"job not found: {job_id}")
    return json.loads(path.read_text(encoding="utf-8"))


def cmd_enqueue(prompt: str, model: str, timeout: int) -> int:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    job_id = f"tsk-{int(time.time())}-{secrets.token_hex(3)}"

    queued = {
        "job_id": job_id,
        "status": "queued",
        "model": model,
        "prompt": prompt,
        "queued_at": int(time.time()),
        "updated_at": int(time.time()),
    }
    (JOBS_DIR / f"{job_id}.json").write_text(json.dumps(queued, indent=2), encoding="utf-8")

    runner_cmd = [
        "nohup",
        "python3",
        "/root/.opencode/tools/tasker_desktop_runner.py",
        "--job-id",
        job_id,
        "--prompt",
        prompt,
        "--model",
        model,
        "--timeout",
        str(timeout),
    ]
    subprocess.Popen(runner_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(job_id)
    return 0


def cmd_status(job_id: str) -> int:
    job = read_job(job_id)
    print(json.dumps(job, indent=2))
    return 0


def cmd_list(limit: int) -> int:
    files = sorted(JOBS_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in files[:limit]:
        job = json.loads(path.read_text(encoding="utf-8"))
        print(f"{job.get('job_id')}\t{job.get('status')}\t{job.get('updated_at')}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Desktop Tasker control utility")
    sub = parser.add_subparsers(dest="command", required=True)

    enqueue = sub.add_parser("enqueue")
    enqueue.add_argument("--prompt", required=True)
    enqueue.add_argument("--model", default="anthropic/claude-sonnet-4-6")
    enqueue.add_argument("--timeout", type=int, default=1800)

    status = sub.add_parser("status")
    status.add_argument("--job-id", required=True)

    ls = sub.add_parser("list")
    ls.add_argument("--limit", type=int, default=20)

    args = parser.parse_args()
    if args.command == "enqueue":
        return cmd_enqueue(args.prompt, args.model, args.timeout)
    if args.command == "status":
        return cmd_status(args.job_id)
    if args.command == "list":
        return cmd_list(args.limit)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
