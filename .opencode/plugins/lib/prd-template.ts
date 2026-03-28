/**
 * PRD template generator for PAI-OpenCode.
 *
 * Shared by algorithm.ts and any future PRD-creating tooling.
 */

interface PRDOptions {
	title: string;
	slug: string;
	effortLevel?: string;
	mode?: "interactive" | "loop";
	prompt?: string;
	sessionId?: string;
}

const ISC_MINIMUMS: Record<string, { min: number; target: string }> = {
	TRIVIAL: { min: 2, target: "2-4" },
	QUICK: { min: 4, target: "4-8" },
	STANDARD: { min: 8, target: "8-16" },
	EXTENDED: { min: 16, target: "16-32" },
	ADVANCED: { min: 24, target: "24-48" },
	DEEP: { min: 40, target: "40-80" },
	COMPREHENSIVE: { min: 64, target: "64-150" },
	LOOP: { min: 16, target: "16-64" },
};

const APPETITE_MAP: Record<string, { budget: string; circuitBreaker: string }> = {
	TRIVIAL: { budget: "<10s", circuitBreaker: "1 session" },
	QUICK: { budget: "<1min", circuitBreaker: "1 session" },
	STANDARD: { budget: "<2min", circuitBreaker: "1 session" },
	EXTENDED: { budget: "<8min", circuitBreaker: "2 sessions" },
	ADVANCED: { budget: "<16min", circuitBreaker: "3 sessions" },
	DEEP: { budget: "<32min", circuitBreaker: "3 sessions" },
	COMPREHENSIVE: { budget: "<120m", circuitBreaker: "5 sessions" },
	LOOP: { budget: "unbounded", circuitBreaker: "max iterations" },
};

export function curateTitle(rawPrompt: string): string {
	let title = rawPrompt.trim();
	title = title.replace(
		/^(okay|ok|hey|so|um|uh|well|right|alright|please|can you|i want you to|i need you to|i want to|we need to|lets|let's)\s+/gi,
		"",
	);
	title = title.replace(/\b(fuck|fucking|shit|shitty|damn|damnit|ass|bitch|motherfuck\w*|dumbass|goddamn)\b\s*/gi, "");
	title = title.replace(/\s+/g, " ").trim();

	if (title.length > 0) {
		title = title.charAt(0).toUpperCase() + title.slice(1);
	}

	if (title.length > 80) {
		const truncated = title.substring(0, 80);
		const lastSpace = truncated.lastIndexOf(" ");
		title = lastSpace > 40 ? truncated.substring(0, lastSpace) : truncated;
	}

	return title || "Untitled Task";
}

export function generatePRDFilename(slug: string): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `PRD-${y}${m}${d}-${slug}.md`;
}

export function generatePRDId(slug: string): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `PRD-${y}${m}${d}-${slug}`;
}

export function generatePRDTemplate(opts: PRDOptions): string {
	const today = new Date().toISOString().split("T")[0];
	const timestamp = new Date().toISOString();
	const id = generatePRDId(opts.slug);
	const effort = opts.effortLevel || "Standard";
	const effortUpper = effort.toUpperCase();
	const mode = opts.mode || "interactive";

	const curatedTitle = opts.prompt ? curateTitle(opts.prompt) : opts.title;
	const promptSection = opts.prompt
		? `### Problem Space\n${opts.prompt.substring(0, 500)}\n`
		: "### Problem Space\n_To be populated during OBSERVE phase._\n";

	const iscGuide = ISC_MINIMUMS[effortUpper] || ISC_MINIMUMS.STANDARD;
	const appetite = APPETITE_MAP[effortUpper] || APPETITE_MAP.STANDARD;

	return `---
prd: true
id: ${id}
title: "${curatedTitle.replace(/"/g, '\\"')}"
session_id: "${opts.sessionId || "unknown"}"
status: ACTIVE
mode: ${mode}
effort_level: ${effort}
created: ${today}
updated: ${today}
completed_at: null
iteration: 0
maxIterations: 128
loopStatus: null
last_phase: null
failing_criteria: []
verification_summary: "0/0"
parent: null
children: []
---

# ${curatedTitle}

> _To be populated during OBSERVE: what this achieves and why it matters._

## STATUS

| What | State |
|------|-------|
| Progress | 0/0 criteria passing |
| Phase | ACTIVE |
| Next action | OBSERVE phase - create ISC |
| Blocked by | nothing |

## APPETITE

| Budget | Circuit Breaker | ISC Target |
|--------|----------------|------------|
| ${appetite.budget} | ${appetite.circuitBreaker} | ${iscGuide.target} criteria |

## CONTEXT

${promptSection}
### Key Files
_To be populated during exploration._

## RISKS & RABBIT HOLES

_To be populated during THINK phase._

## PLAN

_To be populated during PLAN phase._

## IDEAL STATE CRITERIA (Verification Criteria)

### Criteria

### Anti-Criteria

## DECISIONS

_Non-obvious technical decisions logged here during BUILD/EXECUTE._

## CHANGELOG

- ${timestamp} | CREATED | ${effort} effort | ${iscGuide.target} ISC target
`;
}
