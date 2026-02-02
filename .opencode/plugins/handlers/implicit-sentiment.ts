/**
 * ImplicitSentimentCapture Handler
 *
 * PURPOSE:
 * Detects emotional signals in user messages to infer satisfaction/dissatisfaction
 * when no explicit rating is given. Uses AI inference to understand nuanced sentiment
 * like frustration, excitement, or disappointment from natural language.
 *
 * TRIGGER: User message submission (called from pai-unified.ts)
 *
 * OUTPUT:
 * - Writes to: MEMORY/LEARNING/SIGNALS/ratings.jsonl (source: "implicit")
 * - Writes to: MEMORY/LEARNING/<category>/<YYYY-MM>/*.md (for low ratings)
 * - Returns sentiment analysis result
 *
 * SENTIMENT EXAMPLES:
 * - "What the fuck, why did you break it?" → rating 1-2 (frustration)
 * - "Oh my god, this is amazing!" → rating 9-10 (excitement)
 * - "Hmm, that's not quite right" → rating 4 (mild dissatisfaction)
 * - "Check the logs" → 5 (neutral, logged as baseline)
 *
 * RATING SCALE:
 * - 1-2: Strong frustration, anger, disappointment
 * - 3-4: Mild frustration, dissatisfaction
 * - 5: Neutral (logged as baseline for feature requests)
 * - 6-7: Satisfaction, approval
 * - 8-9: Strong approval, impressed
 * - 10: Extraordinary enthusiasm
 *
 * @module implicit-sentiment
 * @version 1.0.0
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { inference } from '../../skills/PAI/Tools/Inference';
import { getIdentity, getPrincipal } from '../lib/identity';
import { getLearningCategory } from '../lib/learning-utils';
import { getISOTimestamp, getYearMonth, getFilenameTimestamp } from '../lib/time';
import { getLearningDir, getMemoryDir } from '../lib/paths';
import { fileLog, fileLogError } from '../lib/file-logger';

const PRINCIPAL_NAME = getPrincipal().name;
const ASSISTANT_NAME = getIdentity().name;

interface SentimentResult {
  rating: number | null;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  summary: string;
  detailed_context: string;
}

interface ImplicitRatingEntry {
  timestamp: string;
  rating: number;
  session_id: string;
  source: 'implicit';
  sentiment_summary: string;
  confidence?: number;
}

const SENTIMENT_SYSTEM_PROMPT = `Analyze ${PRINCIPAL_NAME}'s message for emotional sentiment toward ${ASSISTANT_NAME} (the AI assistant).

CONTEXT: This is a personal AI system. ${PRINCIPAL_NAME} is the ONLY user. Never say "users" - always "${PRINCIPAL_NAME}."

OUTPUT FORMAT (JSON only):
{
  "rating": <1-10 or null>,
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": <0.0-1.0>,
  "summary": "<brief explanation, 10 words max>",
  "detailed_context": "<comprehensive analysis for learning, 100-256 words>"
}

DETAILED_CONTEXT REQUIREMENTS (critical for learning system):
Write 100-256 words covering:
1. What ${PRINCIPAL_NAME} was trying to accomplish
2. What ${ASSISTANT_NAME} did (or failed to do)
3. Why ${PRINCIPAL_NAME} is frustrated/satisfied (the root cause)
4. What specific behavior triggered this reaction
5. What ${ASSISTANT_NAME} should have done differently (for negative) or what worked well (for positive)
6. Any patterns this reveals about ${PRINCIPAL_NAME}'s expectations

This context will be used retroactively to improve ${ASSISTANT_NAME}, so include enough detail that someone reading it months later can understand exactly what went wrong or right.

RATING SCALE:
- 1-2: Strong frustration, anger, disappointment with ${ASSISTANT_NAME}
- 3-4: Mild frustration, dissatisfaction
- 5: Neutral (no strong sentiment)
- 6-7: Satisfaction, approval
- 8-9: Strong approval, impressed
- 10: Extraordinary enthusiasm, blown away

CRITICAL DISTINCTIONS:
- Profanity can indicate EITHER frustration OR excitement
  - "What the fuck?!" + complaint about work = LOW (1-3)
  - "Holy shit, this is amazing!" = HIGH (9-10)
- Context is KEY: Is the emotion directed AT ${ASSISTANT_NAME}'s work?
- Sarcasm: "Oh great, another error" = negative despite "great"

WHEN TO RETURN null FOR RATING:
- Neutral technical questions ("Can you check the logs?")
- Simple commands ("Do it", "Yes", "Continue")
- No emotional indicators present
- Emotion unrelated to ${ASSISTANT_NAME}'s work

EXAMPLES:
${PRINCIPAL_NAME}: "What the fuck, why did you delete my file?"
→ {"rating": 1, "sentiment": "negative", "confidence": 0.95, "summary": "Angry about deleted file", "detailed_context": "..."}

${PRINCIPAL_NAME}: "Oh my god, this is fucking incredible, you nailed it!"
→ {"rating": 10, "sentiment": "positive", "confidence": 0.95, "summary": "Extremely impressed with result", "detailed_context": "..."}

${PRINCIPAL_NAME}: "Fix the auth bug"
→ {"rating": null, "sentiment": "neutral", "confidence": 0.9, "summary": "Neutral command, no sentiment", "detailed_context": ""}

${PRINCIPAL_NAME}: "Hmm, that's not quite right"
→ {"rating": 4, "sentiment": "negative", "confidence": 0.6, "summary": "Mild dissatisfaction", "detailed_context": "..."}

${PRINCIPAL_NAME}: "Perfect, exactly what I needed"
→ {"rating": 8, "sentiment": "positive", "confidence": 0.85, "summary": "Satisfied with result", "detailed_context": "..."}`;

const MIN_PROMPT_LENGTH = 3;
const MIN_CONFIDENCE = 0.5;
const ANALYSIS_TIMEOUT = 25000;

/**
 * Check if prompt is an explicit rating (defer to ExplicitRatingCapture)
 */
function isExplicitRating(prompt: string): boolean {
  const trimmed = prompt.trim();
  const ratingPattern = /^(10|[1-9])(?:\s*[-:]\s*|\s+)?(.*)$/;
  const match = trimmed.match(ratingPattern);

  if (!match) return false;

  const comment = match[2]?.trim();
  if (comment) {
    const sentenceStarters = /^(items?|things?|steps?|files?|lines?|bugs?|issues?|errors?|times?|minutes?|hours?|days?|seconds?|percent|%|th\b|st\b|nd\b|rd\b|of\b|in\b|at\b|to\b|the\b|a\b|an\b)/i;
    if (sentenceStarters.test(comment)) {
      return false;
    }
  }

  return true;
}

/**
 * Get recent conversation context from transcript
 */
function getRecentContext(transcriptPath: string, maxTurns: number = 3): string {
  try {
    if (!transcriptPath || !existsSync(transcriptPath)) return '';

    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');

    const turns: { role: string; text: string }[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);

        if (entry.type === 'user' && entry.message?.content) {
          let text = '';
          if (typeof entry.message.content === 'string') {
            text = entry.message.content;
          } else if (Array.isArray(entry.message.content)) {
            text = entry.message.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ');
          }
          if (text.trim()) {
            turns.push({ role: 'User', text: text.slice(0, 200) });
          }
        }

        if (entry.type === 'assistant' && entry.message?.content) {
          const text = typeof entry.message.content === 'string'
            ? entry.message.content
            : Array.isArray(entry.message.content)
              ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
              : '';
          if (text) {
            const summaryMatch = text.match(/SUMMARY:\s*([^\n]+)/i);
            const shortText = summaryMatch ? summaryMatch[1] : text.slice(0, 150);
            turns.push({ role: 'Assistant', text: shortText });
          }
        }
      } catch {}
    }

    const recentTurns = turns.slice(-maxTurns);
    if (recentTurns.length === 0) return '';

    return recentTurns.map(t => `${t.role}: ${t.text}`).join('\n');
  } catch {
    return '';
  }
}

/**
 * Analyze sentiment using Haiku (fast tier)
 */
async function analyzeSentiment(prompt: string, context: string): Promise<SentimentResult | null> {
  const userPrompt = context
    ? `CONTEXT:\n${context}\n\nCURRENT MESSAGE:\n${prompt}`
    : prompt;

  const result = await inference({
    systemPrompt: SENTIMENT_SYSTEM_PROMPT,
    userPrompt,
    expectJson: true,
    timeout: 20000,
    level: 'fast',  // fast = haiku (quick/cheap)
  });

  if (!result.success || !result.parsed) {
    fileLog(`[ImplicitSentiment] Inference failed: ${result.error}`, 'error');
    return null;
  }

  return result.parsed as SentimentResult;
}

/**
 * Write implicit rating to ratings.jsonl
 * NOTE: Ratings are stored in LEARNING/SIGNALS/ (consolidated from separate SIGNALS/)
 */
function writeImplicitRating(entry: ImplicitRatingEntry): void {
  const signalsDir = join(getLearningDir(), 'SIGNALS');
  const ratingsFile = join(signalsDir, 'ratings.jsonl');

  if (!existsSync(signalsDir)) {
    mkdirSync(signalsDir, { recursive: true });
  }

  appendFileSync(ratingsFile, JSON.stringify(entry) + '\n', 'utf-8');
  fileLog(`[ImplicitSentiment] Wrote implicit rating ${entry.rating} to ${ratingsFile}`, 'info');
}

/**
 * Capture low rating as learning opportunity
 */
function captureLowRatingLearning(
  rating: number,
  sentimentSummary: string,
  detailedContext: string,
  transcriptPath: string
): void {
  if (rating >= 6) return;

  const yearMonth = getYearMonth();
  const category = getLearningCategory(detailedContext, sentimentSummary);
  const learningsDir = join(getLearningDir(), category, yearMonth);

  if (!existsSync(learningsDir)) {
    mkdirSync(learningsDir, { recursive: true });
  }

  // Get response context
  let responseContext = '';
  try {
    if (transcriptPath && existsSync(transcriptPath)) {
      const content = readFileSync(transcriptPath, 'utf-8');
      const lines = content.trim().split('\n');
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'assistant' && entry.message?.content) {
            const text = typeof entry.message.content === 'string'
              ? entry.message.content
              : Array.isArray(entry.message.content)
                ? entry.message.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
                : '';
            if (text) responseContext = text;
          }
        } catch {}
      }
      responseContext = responseContext.slice(0, 500);
    }
  } catch {}

  const timestamp = getFilenameTimestamp();
  const filename = `${timestamp}_LEARNING_sentiment-rating-${rating}.md`;
  const filepath = join(learningsDir, filename);

  const content = `---
capture_type: LEARNING
timestamp: ${getISOTimestamp()}
rating: ${rating}
source: implicit-sentiment
auto_captured: true
tags: [sentiment-detected, implicit-rating, improvement-opportunity]
---

# Implicit Low Rating Detected: ${rating}/10

**Date:** ${getISOTimestamp().slice(0, 10)}
**Rating:** ${rating}/10
**Detection Method:** Sentiment Analysis
**Sentiment Summary:** ${sentimentSummary}

---

## Detailed Analysis (for Learning System)

${detailedContext || 'No detailed analysis available'}

---

## Assistant Response Context

${responseContext || 'No response context available'}

---

## Improvement Notes

This response triggered a ${rating}/10 implicit rating based on detected user sentiment.

**Quick Summary:** ${sentimentSummary}

**Root Cause Analysis:** Review the detailed analysis above to understand what went wrong and how to prevent similar issues.

**Action Items:**
- Review the assistant response context to identify specific failure points
- Consider whether this represents a pattern that needs systemic correction
- Update relevant skills, workflows, or constitutional principles if needed

---
`;

  writeFileSync(filepath, content, 'utf-8');
  fileLog(`[ImplicitSentiment] Captured low rating learning to ${filepath}`, 'info');
}

/**
 * Handle implicit sentiment capture for a user prompt
 *
 * @param prompt - The user's message text
 * @param sessionId - Current session identifier
 * @param transcriptPath - Optional path to conversation transcript (for context)
 * @returns Sentiment analysis result or null
 */
export async function handleImplicitSentiment(
  prompt: string,
  sessionId: string,
  transcriptPath?: string
): Promise<{ rating: number | null; sentiment: string; confidence: number } | null> {
  try {
    fileLog('[ImplicitSentiment] Handler started', 'info');

    // Skip if explicit rating (let ExplicitRatingCapture handle)
    if (isExplicitRating(prompt)) {
      fileLog('[ImplicitSentiment] Explicit rating detected, deferring to ExplicitRatingCapture', 'info');
      return null;
    }

    if (prompt.length < MIN_PROMPT_LENGTH) {
      fileLog('[ImplicitSentiment] Prompt too short, exiting', 'debug');
      return null;
    }

    const context = transcriptPath ? getRecentContext(transcriptPath) : '';

    const analysisPromise = analyzeSentiment(prompt, context);
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), ANALYSIS_TIMEOUT)
    );

    const sentiment = await Promise.race([analysisPromise, timeoutPromise]);

    if (!sentiment) {
      fileLog('[ImplicitSentiment] Analysis failed or timed out', 'warn');
      return null;
    }

    // Neutral sentiment gets rating 5 (baseline for feature requests)
    if (sentiment.rating === null) {
      sentiment.rating = 5;
      fileLog('[ImplicitSentiment] Neutral sentiment, assigning baseline rating 5', 'info');
    }

    if (sentiment.confidence < MIN_CONFIDENCE) {
      fileLog(`[ImplicitSentiment] Low confidence (${sentiment.confidence}), not logging`, 'info');
      return null;
    }

    fileLog(`[ImplicitSentiment] Detected: ${sentiment.rating}/10 - ${sentiment.summary}`, 'info');

    const entry: ImplicitRatingEntry = {
      timestamp: getISOTimestamp(),
      rating: sentiment.rating,
      session_id: sessionId,
      source: 'implicit',
      sentiment_summary: sentiment.summary,
      confidence: sentiment.confidence,
    };

    writeImplicitRating(entry);

    if (sentiment.rating < 6 && transcriptPath) {
      captureLowRatingLearning(
        sentiment.rating,
        sentiment.summary,
        sentiment.detailed_context || '',
        transcriptPath
      );
    }

    fileLog('[ImplicitSentiment] Done', 'info');

    return {
      rating: sentiment.rating,
      sentiment: sentiment.sentiment,
      confidence: sentiment.confidence,
    };
  } catch (err) {
    fileLogError('[ImplicitSentiment] Error', err);
    return null;
  }
}
