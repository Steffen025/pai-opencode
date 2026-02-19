#!/usr/bin/env bun

type Json = Record<string, unknown>;

type Args = {
  owner: string;
  projectNumber: number;
  workflowFieldName: string;
  todoState: string;
  inProgressState: string;
  doneState: string;
  blockedState: string;
  timeoutSeconds: number;
  dryRun: boolean;
  once: boolean;
  intervalSeconds: number;
  migrateDrafts: boolean;
  repo?: string;
};

type ProjectFieldOption = { id: string; name: string };
type WorkflowField = { id: string; options: ProjectFieldOption[] };

type ProjectItem = {
  id: string;
  title: string;
  contentType: string;
  contentUrl?: string;
  contentBody?: string;
  workflowState?: string;
};

function showHelp(): void {
  console.log(`
KanbanRunner.ts - Execute approved GitHub Project items and report in ticket

Usage:
  bun ~/.opencode/skills/System/Tools/KanbanRunner.ts --owner <owner> --project <number> [options]

Required:
  --owner <owner>             GitHub owner (user or org)
  --project <number>          Project v2 number

Options:
  --workflow-field <name>     Workflow field name (default: "Workflow State")
  --todo <state>              Trigger state (default: "Todo")
  --in-progress <state>       In-progress state (default: "In Progress")
  --done <state>              Done state (default: "Done")
  --blocked <state>           Blocked state (default: "Blocked")
  --timeout <seconds>         Command timeout (default: 1800)
  --dry-run                   Do not modify project or execute commands
  --once                      Single pass then exit
  --interval <seconds>        Poll interval in continuous mode (default: 120)
  --migrate-drafts            Convert draft items to issues before processing
  --repo <owner/repo>         Required with --migrate-drafts
  -h, --help                  Show this help

How it executes:
  - Reads project items where Workflow State == Todo
  - Requires issue body with a Runbook block:

    ## Runbook
    [bash]
    <command>
    [/bash]

  - Sets state to In Progress
  - Executes runbook command with timeout
  - Posts activity report comment in issue
  - Sets state to Done or Blocked

Safety:
  - No runbook => blocked with guidance comment
  - Draft issues cannot be commented (use --migrate-drafts + --repo)
`);
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const parsed: Partial<Args> = {
    workflowFieldName: "Workflow State",
    todoState: "Todo",
    inProgressState: "In Progress",
    doneState: "Done",
    blockedState: "Blocked",
    timeoutSeconds: 1800,
    dryRun: false,
    once: false,
    intervalSeconds: 120,
    migrateDrafts: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case "--owner":
        if (!next) throw new Error("Missing value for --owner");
        parsed.owner = next;
        i++;
        break;
      case "--project":
        if (!next || Number.isNaN(Number(next))) throw new Error("--project must be numeric");
        parsed.projectNumber = Number(next);
        i++;
        break;
      case "--workflow-field":
        if (!next) throw new Error("Missing value for --workflow-field");
        parsed.workflowFieldName = next;
        i++;
        break;
      case "--todo":
        if (!next) throw new Error("Missing value for --todo");
        parsed.todoState = next;
        i++;
        break;
      case "--in-progress":
        if (!next) throw new Error("Missing value for --in-progress");
        parsed.inProgressState = next;
        i++;
        break;
      case "--done":
        if (!next) throw new Error("Missing value for --done");
        parsed.doneState = next;
        i++;
        break;
      case "--blocked":
        if (!next) throw new Error("Missing value for --blocked");
        parsed.blockedState = next;
        i++;
        break;
      case "--timeout":
        if (!next || Number.isNaN(Number(next))) throw new Error("--timeout must be numeric");
        parsed.timeoutSeconds = Number(next);
        i++;
        break;
      case "--interval":
        if (!next || Number.isNaN(Number(next))) throw new Error("--interval must be numeric");
        parsed.intervalSeconds = Number(next);
        i++;
        break;
      case "--repo":
        if (!next) throw new Error("Missing value for --repo");
        parsed.repo = next;
        i++;
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--once":
        parsed.once = true;
        break;
      case "--migrate-drafts":
        parsed.migrateDrafts = true;
        break;
      case "-h":
      case "--help":
        showHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.owner) throw new Error("--owner is required");
  if (!parsed.projectNumber) throw new Error("--project is required");
  if (parsed.migrateDrafts && !parsed.repo) throw new Error("--repo is required with --migrate-drafts");

  return parsed as Args;
}

async function runGh(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn(["gh", ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

function mustJson<T>(input: string): T {
  return JSON.parse(input) as T;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, "");
}

async function getProjectId(owner: string, number: number): Promise<string> {
  const res = await runGh(["project", "view", String(number), "--owner", owner, "--format", "json"]);
  if (res.code !== 0) throw new Error(`Failed to load project: ${res.stderr}`);
  const json = mustJson<Json>(res.stdout);
  const id = json.id;
  if (typeof id !== "string") throw new Error("Project id not found");
  return id;
}

async function getWorkflowField(owner: string, number: number, fieldName: string): Promise<WorkflowField> {
  const res = await runGh(["project", "field-list", String(number), "--owner", owner, "--format", "json"]);
  if (res.code !== 0) throw new Error(`Failed to list fields: ${res.stderr}`);
  const json = mustJson<{ fields: Array<{ id: string; name: string; type: string; options?: ProjectFieldOption[] }> }>(res.stdout);
  const field = json.fields.find((f) => f.type === "ProjectV2SingleSelectField" && f.name === fieldName);
  if (!field || !field.options) {
    throw new Error(`Workflow field '${fieldName}' not found`);
  }
  return { id: field.id, options: field.options };
}

async function listItems(owner: string, number: number): Promise<ProjectItem[]> {
  const res = await runGh(["project", "item-list", String(number), "--owner", owner, "--format", "json"]);
  if (res.code !== 0) throw new Error(`Failed to list items: ${res.stderr}`);

  const raw = mustJson<{ items: Array<Record<string, unknown>> }>(res.stdout);
  const items: ProjectItem[] = [];

  for (const it of raw.items) {
    const content = (it.content as Record<string, unknown> | undefined) ?? {};
    const keys = Object.keys(it);
    let workflowState: string | undefined;
    for (const key of keys) {
      if (normalizeKey(key) === normalizeKey("Workflow State")) {
        const value = it[key];
        if (typeof value === "string") workflowState = value;
      }
    }

    items.push({
      id: String(it.id),
      title: typeof it.title === "string" ? it.title : String(content.title ?? "Untitled"),
      contentType: typeof content.type === "string" ? content.type : "Unknown",
      contentUrl: typeof content.url === "string" ? content.url : undefined,
      contentBody: typeof content.body === "string" ? content.body : undefined,
      workflowState,
    });
  }

  return items;
}

function optionId(options: ProjectFieldOption[], name: string): string {
  const option = options.find((o) => o.name === name);
  if (!option) throw new Error(`Workflow option '${name}' not found`);
  return option.id;
}

async function setWorkflowState(projectId: string, fieldId: string, itemId: string, optionIdValue: string, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  const res = await runGh([
    "project",
    "item-edit",
    "--id",
    itemId,
    "--project-id",
    projectId,
    "--field-id",
    fieldId,
    "--single-select-option-id",
    optionIdValue,
  ]);
  if (res.code !== 0) throw new Error(`Failed to set workflow state for ${itemId}: ${res.stderr}`);
}

async function postIssueComment(issueUrl: string, body: string, dryRun: boolean): Promise<void> {
  if (dryRun) return;
  const res = await runGh(["issue", "comment", issueUrl, "--body", body]);
  if (res.code !== 0) throw new Error(`Failed to comment on issue ${issueUrl}: ${res.stderr}`);
}

async function viewIssueBody(issueUrl: string): Promise<string> {
  const res = await runGh(["issue", "view", issueUrl, "--json", "body", "--jq", ".body"]);
  if (res.code !== 0) throw new Error(`Failed to read issue body ${issueUrl}: ${res.stderr}`);
  return res.stdout;
}

function extractRunbook(body: string): string | null {
  const runbookSection = body.match(/##\s*Runbook[\s\S]*?```(?:bash|sh)\n([\s\S]*?)```/i);
  if (runbookSection && runbookSection[1]) {
    return runbookSection[1].trim();
  }

  const firstShellFence = body.match(/```(?:bash|sh)\n([\s\S]*?)```/i);
  if (firstShellFence && firstShellFence[1]) {
    return firstShellFence[1].trim();
  }

  return null;
}

async function executeCommand(command: string, timeoutSeconds: number): Promise<{ code: number; stdout: string; stderr: string }> {
  const proc = Bun.spawn([
    "/usr/bin/timeout",
    "--signal=TERM",
    `${timeoutSeconds}s`,
    "/bin/sh",
    "-lc",
    command,
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { code, stdout: stdout.trim(), stderr: stderr.trim() };
}

function truncate(text: string, max = 4000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n... (truncated)`;
}

function buildReport(item: ProjectItem, command: string, result: { code: number; stdout: string; stderr: string }, timeoutSeconds: number): string {
  const ok = result.code === 0;
  const status = ok ? "SUCCESS" : "FAILED";
  return [
    `## Runner Activity Report`,
    ``,
    `- Item: ${item.title}`,
    `- Runner status: **${status}**`,
    `- Exit code: ${result.code}`,
    `- Timeout: ${timeoutSeconds}s`,
    `- Executed at: ${new Date().toISOString()}`,
    ``,
    `### Command`,
    "```bash",
    command,
    "```",
    ``,
    `### Stdout`,
    "```text",
    truncate(result.stdout || "(empty)"),
    "```",
    ``,
    `### Stderr`,
    "```text",
    truncate(result.stderr || "(empty)"),
    "```",
  ].join("\n");
}

function missingRunbookReport(item: ProjectItem): string {
  return [
    `## Runner Activity Report`,
    ``,
    `- Item: ${item.title}`,
    `- Runner status: **BLOCKED**`,
    `- Reason: Missing executable runbook in issue body.`,
    ``,
    `Add this section in the issue then move state back to Todo:`,
    ``,
    "```md",
    "## Runbook",
    "```bash",
    "# command to execute",
    "```",
    "```",
  ].join("\n");
}

async function migrateDraft(owner: string, projectNumber: number, projectId: string, field: WorkflowField, item: ProjectItem, repo: string, dryRun: boolean): Promise<ProjectItem> {
  if (dryRun) {
    return { ...item, contentType: "Issue", contentUrl: "https://example.invalid/dry-run" };
  }

  const create = await runGh([
    "issue",
    "create",
    "--repo",
    repo,
    "--title",
    item.title,
    "--body",
    item.contentBody ?? "",
    "--label",
    "idea",
  ]);
  if (create.code !== 0) throw new Error(`Failed to migrate draft '${item.title}': ${create.stderr}`);
  const issueUrl = create.stdout.split("\n").pop()?.trim();
  if (!issueUrl) throw new Error(`Issue URL missing for migrated draft '${item.title}'`);

  const add = await runGh([
    "project",
    "item-add",
    String(projectNumber),
    "--owner",
    owner,
    "--url",
    issueUrl,
    "--format",
    "json",
  ]);
  if (add.code !== 0) throw new Error(`Failed to add migrated issue to project: ${add.stderr}`);
  const added = mustJson<{ id: string }>(add.stdout);

  if (item.workflowState) {
    const stateOption = optionId(field.options, item.workflowState);
    await setWorkflowState(projectId, field.id, added.id, stateOption, false);
  }

  const del = await runGh([
    "project",
    "item-delete",
    String(projectNumber),
    "--owner",
    owner,
    "--id",
    item.id,
  ]);
  if (del.code !== 0) throw new Error(`Failed to delete old draft item: ${del.stderr}`);

  return {
    id: added.id,
    title: item.title,
    contentType: "Issue",
    contentUrl: issueUrl,
    contentBody: item.contentBody,
    workflowState: item.workflowState,
  };
}

async function processTodoItem(args: Args, projectId: string, field: WorkflowField, item: ProjectItem): Promise<void> {
  const inProgressId = optionId(field.options, args.inProgressState);
  const doneId = optionId(field.options, args.doneState);
  const blockedId = optionId(field.options, args.blockedState);

  let target = item;
  if (item.contentType === "DraftIssue") {
    if (!args.migrateDrafts || !args.repo) {
      console.log(`[skip] ${item.title} is DraftIssue (enable --migrate-drafts --repo)`);
      await setWorkflowState(projectId, field.id, item.id, blockedId, args.dryRun);
      return;
    }
    target = await migrateDraft(args.owner, args.projectNumber, projectId, field, item, args.repo, args.dryRun);
    console.log(`[migrate] ${item.title} -> ${target.contentUrl}`);
  }

  if (!target.contentUrl) {
    await setWorkflowState(projectId, field.id, target.id, blockedId, args.dryRun);
    return;
  }

  await setWorkflowState(projectId, field.id, target.id, inProgressId, args.dryRun);

  const issueBody = await viewIssueBody(target.contentUrl);
  const runbook = extractRunbook(issueBody);
  if (!runbook) {
    await postIssueComment(target.contentUrl, missingRunbookReport(target), args.dryRun);
    await setWorkflowState(projectId, field.id, target.id, blockedId, args.dryRun);
    return;
  }

  const result = args.dryRun
    ? { code: 0, stdout: "dry-run: command execution skipped", stderr: "" }
    : await executeCommand(runbook, args.timeoutSeconds);

  const report = buildReport(target, runbook, result, args.timeoutSeconds);
  await postIssueComment(target.contentUrl, report, args.dryRun);

  await setWorkflowState(projectId, field.id, target.id, result.code === 0 ? doneId : blockedId, args.dryRun);
}

async function runPass(args: Args): Promise<void> {
  const projectId = await getProjectId(args.owner, args.projectNumber);
  const field = await getWorkflowField(args.owner, args.projectNumber, args.workflowFieldName);
  const items = await listItems(args.owner, args.projectNumber);

  const todos = items.filter((item) => item.workflowState === args.todoState);
  if (todos.length === 0) {
    console.log(`[runner] No items in state '${args.todoState}'`);
    return;
  }

  for (const item of todos) {
    console.log(`[runner] Processing: ${item.title}`);
    try {
      await processTodoItem(args, projectId, field, item);
      console.log(`[runner] Completed: ${item.title}`);
    } catch (error) {
      console.error(`[runner] Error on '${item.title}': ${(error as Error).message}`);
    }
  }
}

async function main(): Promise<void> {
  let args: Args;
  try {
    args = parseArgs();
  } catch (error) {
    console.error((error as Error).message);
    showHelp();
    process.exit(1);
    return;
  }

  if (args.once) {
    await runPass(args);
    return;
  }

  while (true) {
    await runPass(args);
    await Bun.sleep(args.intervalSeconds * 1000);
  }
}

await main();
