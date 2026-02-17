/**
 * Agent Execution Guard Handler (v3.0)
 *
 * Validates agent execution patterns — warns when agents are spawned
 * without proper capability selection or background execution settings.
 *
 * Ported from PAI v3.0 AgentExecutionGuard.hook.ts
 *
 * @module agent-execution-guard
 */

import { fileLog, fileLogError } from "../lib/file-logger";

interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate agent execution parameters
 *
 * In OpenCode, we can't block execution like Claude Code hooks can.
 * Instead, we log warnings for suboptimal patterns.
 */
export async function validateAgentExecution(
  args: any
): Promise<GuardResult> {
  try {
    const subagentType = args?.subagent_type || "unknown";
    const prompt = args?.prompt || "";
    const modelTier = args?.model_tier || "standard";

    // Check 1: Explore agents for simple operations
    // If the prompt suggests a simple grep/glob/read, warn
    const simplePatterns = [
      /find (the|a) file/i,
      /search for/i,
      /look for.*in/i,
      /check if.*exists/i,
    ];

    if (subagentType === "explore") {
      for (const pattern of simplePatterns) {
        if (pattern.test(prompt)) {
          fileLog(
            `[AgentGuard] Warning: Explore agent for simple operation — consider using Grep/Glob/Read directly`,
            "warn"
          );
          return {
            allowed: true,
            reason:
              "Consider using direct tools (Grep/Glob/Read) instead of Explore agent for simple lookups",
          };
        }
      }
    }

    // Check 2: Agent prompt should have context
    if (prompt.length < 50) {
      fileLog(
        `[AgentGuard] Warning: Agent prompt is very short (${prompt.length} chars) — agents need full context`,
        "warn"
      );
      return {
        allowed: true,
        reason:
          "Agent prompt is very short. Include: context, task, effort level, output format",
      };
    }

    // Check 3: Quick tier for simple tasks
    if (modelTier === "advanced" && prompt.length < 200) {
      fileLog(
        `[AgentGuard] Warning: Advanced tier for short prompt — consider quick/standard tier`,
        "warn"
      );
      return {
        allowed: true,
        reason: "Advanced model tier may be overkill for this task size",
      };
    }

    fileLog(
      `[AgentGuard] Agent execution OK: ${subagentType} (${modelTier})`,
      "debug"
    );
    return { allowed: true };
  } catch (error) {
    fileLogError("[AgentGuard] Validation failed", error);
    return { allowed: true, reason: "Validation error — allowing execution" };
  }
}

/**
 * Check if an agent should run in background
 */
export function shouldRunInBackground(args: any): boolean {
  const subagentType = args?.subagent_type || "";
  const prompt = args?.prompt || "";

  // Long-running agent types benefit from background execution
  const longRunning = [
    "DeepResearcher",
    "GeminiResearcher",
    "PerplexityResearcher",
    "GrokResearcher",
    "CodexResearcher",
  ];

  if (longRunning.includes(subagentType)) return true;
  if (prompt.length > 2000) return true;

  return false;
}
