/**
 * Question Tracking Handler
 *
 * Inspired by PAI v4.0.3 QuestionAnswered.hook.ts
 * Triggered by: message.updated (event bus), tool.execute.after (AskUserQuestion)
 *
 * NOTE: The upstream QuestionAnswered hook is Kitty-terminal specific (tab color reset).
 * This OpenCode port focuses on the SEMANTIC value: tracking Q&A pairs for memory.
 *
 * PURPOSE:
 * Detects when the AI asked a question (via AskUserQuestion tool) and the user
 * answered it. Stores Q&A pairs in MEMORY/STATE/questions.jsonl for:
 * - Session continuity (what was asked/answered)
 * - Learning patterns (what kinds of clarifications are needed)
 * - Context for future sessions
 *
 * STORAGE: MEMORY/STATE/questions.jsonl (append-only log)
 *
 * @module question-tracking
 */

import * as fs from "fs";
import * as path from "path";
import { fileLog, fileLogError } from "../lib/file-logger";
import { getStateDir, ensureDir } from "../lib/paths";

interface QAPair {
	timestamp: string;
	sessionId: string;
	question: string;
	answer: string;
	tool_call_id?: string;
}

const QUESTIONS_LOG = "questions.jsonl";

/**
 * Record a question-answer pair when AskUserQuestion tool is used.
 *
 * @param question - The question that was asked
 * @param answer - The user's answer
 * @param sessionId - Current session ID
 * @param toolCallId - Optional tool call ID for correlation
 */
export async function trackQuestionAnswered(
	question: string,
	answer: string,
	sessionId: string,
	toolCallId?: string,
): Promise<void> {
	if (!question || !answer) return;

	try {
		const stateDir = getStateDir();
		await ensureDir(stateDir);

		const entry: QAPair = {
			timestamp: new Date().toISOString(),
			sessionId,
			question: question.slice(0, 500),
			answer: answer.slice(0, 500),
			...(toolCallId ? { tool_call_id: toolCallId } : {}),
		};

		const logPath = path.join(stateDir, QUESTIONS_LOG);
		await fs.promises.appendFile(
			logPath,
			JSON.stringify(entry) + "\n",
			"utf-8",
		);

		fileLog(
			`[QuestionTracking] Q&A recorded: "${question.slice(0, 60)}..."`,
			"info",
		);
	} catch (error) {
		fileLogError("[QuestionTracking] Failed to record Q&A (non-blocking)", error);
	}
}

/**
 * Detect if a tool result is an answer to an AskUserQuestion call.
 * Returns the answer text if detected, null otherwise.
 */
export function extractAskUserQuestionAnswer(
	tool: string,
	args: Record<string, unknown>,
	result: unknown,
): { question: string; answer: string } | null {
	// Only process AskUserQuestion tool results
	if (
		tool !== "AskUserQuestion" &&
		!tool.toLowerCase().includes("ask_user") &&
		!tool.toLowerCase().includes("question")
	) {
		return null;
	}

	const question = (args.question as string) || "";
	const answer =
		typeof result === "string"
			? result
			: (result as any)?.answer ||
				(result as any)?.response ||
				JSON.stringify(result || "");

	if (!question || !answer) return null;

	return {
		question: question.slice(0, 500),
		answer: String(answer).slice(0, 500),
	};
}
