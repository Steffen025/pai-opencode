/**
 * Format Reminder Handler (v3.0 — Updated)
 *
 * Detects effort level from user prompts using the 8-tier system.
 * Also classifies response depth (FULL/ITERATION/MINIMAL).
 *
 * v3.0 update: Added 8-tier effort level system alongside depth classification.
 *
 * @module format-reminder
 */

import { fileLog, fileLogError } from "../lib/file-logger";

/** Effort level tiers (v3.0) */
const EFFORT_LEVELS = {
  Instant: { budget: "<10s", description: "Trivial lookup, greeting, math" },
  Fast: { budget: "<1min", description: "Simple fix, skill invocation" },
  Standard: { budget: "<2min", description: "Normal request, 1-8 ISC" },
  Extended: { budget: "<8min", description: "Complex task, multi-file changes" },
  Advanced: { budget: "<16min", description: "Multi-domain, thorough work" },
  Deep: { budget: "<32min", description: "Research + analysis, extensive" },
  Comprehensive: { budget: "<120min", description: "Full system design" },
  Loop: { budget: "unbounded", description: "Iterative PRD execution" },
} as const;

type EffortLevel = keyof typeof EFFORT_LEVELS;

interface EffortResult {
  level: EffortLevel;
  budget: string;
  reasoning: string;
}

/** Depth classification (existing) */
type Depth = "FULL" | "ITERATION" | "MINIMAL";

interface ClassificationResult {
  depth: Depth;
  effort: EffortLevel;
  reasoning: string;
}

/**
 * Detect effort level from user message
 *
 * Uses heuristics to classify the effort level.
 * Default is Standard (~2min).
 */
export async function detectEffortLevel(
  userMessage: string
): Promise<EffortResult> {
  try {
    const msg = userMessage.toLowerCase().trim();
    const len = msg.length;

    // Instant: greetings, ratings, very short
    if (len < 20) {
      const greetings = ["hi", "hey", "hello", "yo", "thanks", "ok", "thx"];
      if (greetings.some((g) => msg.startsWith(g))) {
        return {
          level: "Instant",
          budget: EFFORT_LEVELS.Instant.budget,
          reasoning: "Greeting or acknowledgment",
        };
      }
      // Check for rating
      if (/^\d{1,2}(\/10)?$/.test(msg.trim())) {
        return {
          level: "Instant",
          budget: EFFORT_LEVELS.Instant.budget,
          reasoning: "Rating response",
        };
      }
    }

    // Fast: explicit speed signals
    const fastSignals = ["quickly", "quick", "just", "simple", "fast", "kurz"];
    if (fastSignals.some((s) => msg.includes(s)) && len < 200) {
      return {
        level: "Fast",
        budget: EFFORT_LEVELS.Fast.budget,
        reasoning: "Speed signal detected in short prompt",
      };
    }

    // Extended+: explicit depth signals
    const deepSignals = [
      "thorough",
      "comprehensive",
      "detailed",
      "deep dive",
      "extensive",
      "all phases",
      "determined",
      "gründlich",
      "ausführlich",
    ];
    const hasDeepSignal = deepSignals.some((s) => msg.includes(s));

    // Comprehensive: very long prompts or explicit signals
    if (len > 2000 || msg.includes("comprehensive") || msg.includes("full system")) {
      return {
        level: "Comprehensive",
        budget: EFFORT_LEVELS.Comprehensive.budget,
        reasoning: `Long prompt (${len} chars) or comprehensive signal`,
      };
    }

    // Deep: complex + explicit signal
    if (hasDeepSignal && len > 500) {
      return {
        level: "Deep",
        budget: EFFORT_LEVELS.Deep.budget,
        reasoning: "Depth signal with substantial prompt",
      };
    }

    // Advanced: multi-domain or substantial work
    const multiSignals = ["migration", "refactor", "redesign", "architect", "parallel", "multiple"];
    if (multiSignals.some((s) => msg.includes(s)) || len > 800) {
      return {
        level: "Advanced",
        budget: EFFORT_LEVELS.Advanced.budget,
        reasoning: "Multi-domain or substantial work detected",
      };
    }

    // Extended: medium complexity
    if (hasDeepSignal || len > 400) {
      return {
        level: "Extended",
        budget: EFFORT_LEVELS.Extended.budget,
        reasoning: "Depth signal or medium-length prompt",
      };
    }

    // Loop: explicit loop/iteration mode
    if (msg.includes("loop") || msg.includes("iterate until")) {
      return {
        level: "Loop",
        budget: EFFORT_LEVELS.Loop.budget,
        reasoning: "Explicit loop/iteration mode",
      };
    }

    // Default: Standard
    return {
      level: "Standard",
      budget: EFFORT_LEVELS.Standard.budget,
      reasoning: "Default — normal request complexity",
    };
  } catch (error) {
    fileLogError("[FormatReminder] Effort detection failed", error);
    return {
      level: "Standard",
      budget: EFFORT_LEVELS.Standard.budget,
      reasoning: "Detection error — defaulting to Standard",
    };
  }
}

/**
 * Classify depth and effort level from user message
 */
export async function classifyMessage(
  userMessage: string
): Promise<ClassificationResult> {
  const effort = await detectEffortLevel(userMessage);

  let depth: Depth;

  switch (effort.level) {
    case "Instant":
      depth = "MINIMAL";
      break;
    case "Fast":
    case "Standard":
    case "Extended":
    case "Advanced":
    case "Deep":
    case "Comprehensive":
      depth = "FULL";
      break;
    case "Loop":
      depth = "FULL";
      break;
    default:
      depth = "FULL";
  }

  // Check for iteration signals
  const msg = userMessage.toLowerCase();
  const iterationSignals = [
    "continue",
    "weiter",
    "adjust",
    "fix that",
    "change the",
    "update the",
    "try again",
    "nochmal",
  ];
  if (iterationSignals.some((s) => msg.includes(s)) && msg.length < 200) {
    depth = "ITERATION";
  }

  return {
    depth,
    effort: effort.level,
    reasoning: effort.reasoning,
  };
}
