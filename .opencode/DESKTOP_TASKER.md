# Desktop Tasker

Use Desktop Tasker to run long agent jobs in the background while keeping live chat responsive.

## Commands

Queue a background job:

```bash
python3 /root/.opencode/tools/tasker_desktop_ctl.py enqueue --prompt "Analyze issue #17 and propose a fix plan"
```

Check one job:

```bash
python3 /root/.opencode/tools/tasker_desktop_ctl.py status --job-id <JOB_ID>
```

List recent jobs:

```bash
python3 /root/.opencode/tools/tasker_desktop_ctl.py list --limit 20
```

## Storage

- Job state: `/root/.opencode/MEMORY/STATE/tasker-desktop/jobs/`
- Logs: `/root/.opencode/MEMORY/STATE/tasker-desktop/logs/`

## Notes

- Jobs run detached with `nohup`.
- The control command returns immediately with a `job_id`.
- Use this pattern whenever you want background execution without chat interruption.
