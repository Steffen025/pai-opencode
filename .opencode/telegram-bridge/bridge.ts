#!/usr/bin/env bun
/**
 * PAI Telegram Bridge — Session Persistante
 *
 * Connecte Telegram à OpenCode en réutilisant la même session.
 * Chaque message continue la conversation précédente.
 * Supporte les images via --file.
 */

import { Bot } from "grammy";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";

// --- Config ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
const ALLOWED_USERS = process.env.ALLOWED_USERS?.split(",").map(Number) || []; // vide = tout le monde
const SESSION_TITLE = "Kirito Telegram Bridge";
const TELEGRAM_CONTEXT_MODE = process.env.TELEGRAM_CONTEXT_MODE?.trim() || "telegram";
const TELEGRAM_CONTEXT_PREFIX = process.env.TELEGRAM_CONTEXT_PREFIX?.trim() || "";
// Chaîne de fallback : si un provider est bloqué, on passe au suivant
const DEFAULT_MODELS = [
  "google/gemini-2.5-flash",
  "anthropic/claude-sonnet-4-6",
  "anthropic/claude-3-5-haiku-latest",
];
const MODEL_CHAIN = parseModelChain(process.env.OPENCODE_MODELS);
let currentModelIndex = 0;
const RUN_TIMEOUT_SECONDS = Number(process.env.OPENCODE_RUN_TIMEOUT_SECONDS || "90");
const TASKER_RUN_TIMEOUT_SECONDS = Number(process.env.TASKER_RUN_TIMEOUT_SECONDS || String(Math.max(RUN_TIMEOUT_SECONDS, 180)));
const MEDIA_DIR = "/tmp/kirito-telegram-media";
const SUMMARY_DIR = "/root/.opencode/telegram-bridge/sessions";
const SUMMARY_FILE = join(SUMMARY_DIR, "last-summary.md");
const MODEL_STATE_FILE = join(SUMMARY_DIR, "model-state.json");
const SESSION_STATE_FILE = join(SUMMARY_DIR, "session-state.json");
const POLLING_LOCK_FILE = join(SUMMARY_DIR, "telegram-polling.lock");
const POLLING_LOCK_REFRESH_MS = Number(process.env.TELEGRAM_POLLING_LOCK_REFRESH_MS || "15000");
const POLLING_LOCK_STALE_MS = Number(process.env.TELEGRAM_POLLING_LOCK_STALE_MS || "60000");
const SOUL_FILE = "/root/.opencode/soul.md";
const TELOS_FILE = "/root/.opencode/skills/PAI/USER/TELOS/TELOS.md";

type ModelState = {
  preferredModelIndex: number;
  currentModelIndex: number;
  pendingAutoResetToPreferred: boolean;
};

type LastFallback = {
  at: string;
  from: string;
  to: string;
};

type SessionState = {
  sessionId: string | null;
};

type PollingLockState = {
  pid: number;
  owner: string;
  acquiredAt: string;
  updatedAt: string;
};

type BridgeMetrics = {
  totalRequests: number;
  successfulResponses: number;
  timedOutRuns: number;
  fallbackSwitches: number;
  stoppedRequests: number;
  permissionErrors: number;
  providerUnavailable: number;
  maxQueueDepth: number;
  latencySamplesMs: number[];
  taskerQueued: number;
  taskerCompleted: number;
  taskerFailed: number;
};

type TaskerJob = {
  id: string;
  chatId: number;
  prompt: string;
  enqueuedAt: number;
};

// --- State ---
let sessionId: string | null = null;
let lastSummary: string | null = null;
let soulContext: string | null = null;
let telosContext: string | null = null;
let busy = false;
const messageQueue: Array<{ resolve: () => void; fn: () => Promise<void> }> = [];
let currentOpencodeProc: Bun.Subprocess | null = null;
let currentRunId = 0;
const manuallyStoppedRuns = new Set<number>();
let preferredModelIndex = 0;
let pendingAutoResetToPreferred = false;
let lastFallback: LastFallback | null = null;
let taskerBusy = false;
const taskerQueue: TaskerJob[] = [];
const TASKER_SESSION_TITLE = "Kirito Tasker Background";
const bridgeStartedAt = Date.now();
let pollingLockHeld = false;
let pollingLockHeartbeat: ReturnType<typeof setInterval> | null = null;
const LATENCY_WINDOW_SIZE = 50;
const metrics: BridgeMetrics = {
  totalRequests: 0,
  successfulResponses: 0,
  timedOutRuns: 0,
  fallbackSwitches: 0,
  stoppedRequests: 0,
  permissionErrors: 0,
  providerUnavailable: 0,
  maxQueueDepth: 0,
  latencySamplesMs: [],
  taskerQueued: 0,
  taskerCompleted: 0,
  taskerFailed: 0,
};

if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN manquant. Configure la variable d'environnement du service.");
}

const bot = new Bot(BOT_TOKEN);

// --- Helpers ---

async function ensureMediaDir() {
  await mkdir(MEDIA_DIR, { recursive: true });
}

async function ensureSummaryDir() {
  await mkdir(SUMMARY_DIR, { recursive: true });
}

function parseModelChain(rawModels: string | undefined): string[] {
  const normalized = (rawModels || DEFAULT_MODELS.join(","))
    .split(",")
    .map((model) => model.trim())
    .filter((model) => model.length > 0);

  return normalized.length > 0 ? normalized : DEFAULT_MODELS;
}

function logStructured(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    event,
    ...fields,
  }));
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readPollingLock(): Promise<PollingLockState | null> {
  try {
    const raw = await readFile(POLLING_LOCK_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PollingLockState>;
    if (typeof parsed.pid !== "number" || !Number.isFinite(parsed.pid)) return null;
    return {
      pid: parsed.pid,
      owner: typeof parsed.owner === "string" ? parsed.owner : "unknown",
      acquiredAt: typeof parsed.acquiredAt === "string" ? parsed.acquiredAt : new Date(0).toISOString(),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

async function writePollingLock(acquiredAt?: string): Promise<void> {
  const now = new Date().toISOString();
  const payload: PollingLockState = {
    pid: process.pid,
    owner: SESSION_TITLE,
    acquiredAt: acquiredAt || now,
    updatedAt: now,
  };
  await writeFile(POLLING_LOCK_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

async function acquirePollingLock(): Promise<boolean> {
  await ensureSummaryDir();
  const existing = await readPollingLock();

  if (existing && existing.pid !== process.pid) {
    const updatedAtMs = Date.parse(existing.updatedAt);
    const ageMs = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs : Number.POSITIVE_INFINITY;
    const holderAlive = isPidAlive(existing.pid);
    const stale = !holderAlive || ageMs > POLLING_LOCK_STALE_MS;

    if (!stale) {
      logStructured("telegram_polling_lock_contention", {
        lockFile: POLLING_LOCK_FILE,
        holderPid: existing.pid,
        holderOwner: existing.owner,
        holderAgeMs: Math.max(0, Math.round(ageMs)),
        currentPid: process.pid,
      });
      return false;
    }

    logStructured("telegram_polling_lock_stale_recovered", {
      lockFile: POLLING_LOCK_FILE,
      holderPid: existing.pid,
      holderOwner: existing.owner,
      holderAlive,
      holderAgeMs: Number.isFinite(ageMs) ? Math.max(0, Math.round(ageMs)) : null,
      staleThresholdMs: POLLING_LOCK_STALE_MS,
      currentPid: process.pid,
    });
  }

  await writePollingLock(existing?.acquiredAt);
  pollingLockHeld = true;
  logStructured("telegram_polling_lock_acquired", {
    lockFile: POLLING_LOCK_FILE,
    pid: process.pid,
    refreshMs: POLLING_LOCK_REFRESH_MS,
    staleMs: POLLING_LOCK_STALE_MS,
  });

  pollingLockHeartbeat = setInterval(() => {
    void writePollingLock().catch((error: unknown) => {
      logStructured("telegram_polling_lock_refresh_failed", {
        lockFile: POLLING_LOCK_FILE,
        pid: process.pid,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, POLLING_LOCK_REFRESH_MS);

  return true;
}

async function releasePollingLock(reason: string): Promise<void> {
  if (!pollingLockHeld) return;
  if (pollingLockHeartbeat) {
    clearInterval(pollingLockHeartbeat);
    pollingLockHeartbeat = null;
  }

  const existing = await readPollingLock();
  if (existing?.pid === process.pid) {
    await unlink(POLLING_LOCK_FILE).catch(() => {
      // ignore
    });
  }

  pollingLockHeld = false;
  logStructured("telegram_polling_lock_released", {
    lockFile: POLLING_LOCK_FILE,
    pid: process.pid,
    reason,
  });
}

function setupPollingLockCleanup(): void {
  const releaseAndExit = (signal: string) => {
    void releasePollingLock(`signal:${signal}`).finally(() => {
      process.exit(0);
    });
  };

  process.once("SIGINT", () => releaseAndExit("SIGINT"));
  process.once("SIGTERM", () => releaseAndExit("SIGTERM"));

  process.once("beforeExit", () => {
    void releasePollingLock("beforeExit");
  });

  process.once("uncaughtException", (error) => {
    logStructured("telegram_bridge_uncaught_exception", {
      message: error?.message || "unknown",
    });
    void releasePollingLock("uncaughtException").finally(() => {
      process.exit(1);
    });
  });
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

function formatMs(ms: number): string {
  return `${Math.round(ms)}ms`;
}

function recordLatency(ms: number): void {
  metrics.latencySamplesMs.push(ms);
  if (metrics.latencySamplesMs.length > LATENCY_WINDOW_SIZE) {
    metrics.latencySamplesMs.shift();
  }
}

function getLatencyStats(): { avgMs: number; p95Ms: number; sampleSize: number } {
  const sampleSize = metrics.latencySamplesMs.length;
  if (sampleSize === 0) {
    return { avgMs: 0, p95Ms: 0, sampleSize: 0 };
  }

  const sorted = [...metrics.latencySamplesMs].sort((a, b) => a - b);
  const avgMs = sorted.reduce((acc, value) => acc + value, 0) / sampleSize;
  const p95Index = Math.max(0, Math.ceil(sampleSize * 0.95) - 1);
  const p95Ms = sorted[p95Index];

  return { avgMs, p95Ms, sampleSize };
}

function normalizeModelIndex(index: number): number {
  if (!Number.isFinite(index)) return 0;
  if (index < 0) return 0;
  if (index >= MODEL_CHAIN.length) return MODEL_CHAIN.length - 1;
  return index;
}

async function saveModelState(): Promise<void> {
  await ensureSummaryDir();
  const payload: ModelState = {
    preferredModelIndex,
    currentModelIndex,
    pendingAutoResetToPreferred,
  };
  await writeFile(MODEL_STATE_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

async function loadModelState(): Promise<void> {
  try {
    const raw = await readFile(MODEL_STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ModelState>;

    preferredModelIndex = normalizeModelIndex(Number(parsed.preferredModelIndex ?? 0));
    currentModelIndex = normalizeModelIndex(Number(parsed.currentModelIndex ?? preferredModelIndex));
    pendingAutoResetToPreferred = Boolean(parsed.pendingAutoResetToPreferred);
  } catch {
    preferredModelIndex = 0;
    currentModelIndex = 0;
    pendingAutoResetToPreferred = false;
  }
}

async function saveSessionState(): Promise<void> {
  await ensureSummaryDir();
  const payload: SessionState = { sessionId };
  await writeFile(SESSION_STATE_FILE, JSON.stringify(payload, null, 2), "utf-8");
}

async function loadSessionState(): Promise<void> {
  try {
    const raw = await readFile(SESSION_STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    sessionId = typeof parsed.sessionId === "string" && parsed.sessionId.trim() ? parsed.sessionId : null;
  } catch {
    sessionId = null;
  }
}

/**
 * Charge le dernier résumé de session sauvegardé.
 */
async function loadLastSummary(): Promise<string | null> {
  try {
    const content = await readFile(SUMMARY_FILE, "utf-8");
    return content.trim() || null;
  } catch {
    return null;
  }
}

async function loadContextFile(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    return content.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Charge le fichier SOUL.md (regles de fond) au demarrage.
 */
async function loadSoulContext(): Promise<string | null> {
  return loadContextFile(SOUL_FILE);
}

/**
 * Charge le fichier TELOS.md (mission/cadre long terme) au demarrage.
 */
async function loadTelosContext(): Promise<string | null> {
  return loadContextFile(TELOS_FILE);
}

/**
 * Sauvegarde un résumé de session.
 */
async function saveSummary(summary: string): Promise<void> {
  await ensureSummaryDir();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  // Sauvegarder dans le fichier courant
  await writeFile(SUMMARY_FILE, summary, "utf-8");
  // Archiver aussi avec timestamp
  await writeFile(join(SUMMARY_DIR, `summary-${timestamp}.md`), summary, "utf-8");
  console.log(`  [summary] Résumé sauvegardé (${summary.length} chars)`);
}

/**
 * Demande à OpenCode de résumer la session en cours.
 */
async function summarizeSession(): Promise<string> {
  if (!sessionId) return "Aucune session active à résumer.";

  const summaryPrompt = `Fais un résumé concis de notre conversation dans cette session. 
Inclus:
- Les sujets abordés
- Les décisions prises  
- Les actions effectuées
- Le contexte important à retenir pour la prochaine session

Format: bullet points, max 500 mots. Pas de format PAI/Algorithm.`;

  return await sendToOpenCode(summaryPrompt);
}

/**
 * Détecte si une erreur indique un blocage provider (rate limit, auth, quota).
 */
function isProviderBlocked(stdout: string, stderr: string): boolean {
  const combined = (stdout + stderr).toLowerCase();
  const blockedPatterns = [
    "rate limit",
    "rate_limit",
    "too many requests",
    "429",
    "quota",
    "overloaded",
    "capacity",
    "unauthorized",
    "401",
    "403",
    "forbidden",
    "credit",
    "billing",
    "exceeded",
    "unavailable",
    "503",
    "service unavailable",
    "oauth",
    "token expired",
    "session expired",
    "authentication",
  ];
  return blockedPatterns.some((p) => combined.includes(p));
}

/**
 * Détecte les erreurs de permission locale (non liées au provider).
 */
function isPermissionError(stdout: string, stderr: string): boolean {
  const combined = (stdout + stderr).toLowerCase();
  const permissionPatterns = [
    "permission requested: external_directory",
    "auto-rejecting",
    "permission denied",
    "access denied",
    "operation not permitted",
  ];
  return permissionPatterns.some((p) => combined.includes(p));
}

/**
 * Retourne le modèle courant.
 */
function getCurrentModel(): string {
  return MODEL_CHAIN[currentModelIndex];
}

function getContextPrefix(): string {
  if (TELEGRAM_CONTEXT_PREFIX) return TELEGRAM_CONTEXT_PREFIX;
  if (TELEGRAM_CONTEXT_MODE === "desktop") {
    return (
      "[Contexte Telegram en mode desktop: garde la meme logique et sequence de reponse qu'en desktop, " +
      "mais adapte le format pour Telegram. Interdits: '🤖 PAI ALGORITHM', '📋 SUMMARY', '🗣️', " +
      "sections systeme, notation interne. Format attendu: reponse naturelle, directe, concise, en 1-3 paragraphes " +
      "ou puces simples si utile.]"
    );
  }
  return "[Contexte: tu réponds via Telegram. Sois concis, pas de format PAI/Algorithm, juste une réponse directe et naturelle.]";
}

/**
 * Passe au modèle suivant dans la chaîne. Retourne true si un fallback existe.
 */
function switchToNextModel(): boolean {
  if (currentModelIndex + 1 < MODEL_CHAIN.length) {
    const fromModel = getCurrentModel();
    currentModelIndex++;
    const toModel = getCurrentModel();
    metrics.fallbackSwitches++;
    pendingAutoResetToPreferred = true;
    lastFallback = {
      at: new Date().toISOString(),
      from: fromModel,
      to: toModel,
    };
    console.log(`  [fallback] Passage au modèle: ${toModel}`);
    void saveModelState();
    return true;
  }
  return false;
}

/**
 * Réinitialise sur le modèle principal (appelé périodiquement).
 */
function resetToMainModel(): void {
  if (busy || currentOpencodeProc) {
    return;
  }

  if (!pendingAutoResetToPreferred) {
    return;
  }

  if (currentModelIndex !== preferredModelIndex) {
    currentModelIndex = preferredModelIndex;
    console.log(`  [fallback] Retour au modèle préféré: ${getCurrentModel()}`);
  }

  pendingAutoResetToPreferred = false;
  void saveModelState();
}

/**
 * Exécute opencode run avec un modèle donné. Retourne { text, stdout, stderr, success }.
 */
async function runOpenCode(model: string, message: string, files?: string[]): Promise<{
  text: string;
  stdout: string;
  stderr: string;
  success: boolean;
  stopped: boolean;
  timedOut: boolean;
}> {
  const args = ["/usr/local/bin/opencode", "run", "--format", "json", "--model", model];

  if (sessionId) {
    args.push("--session", sessionId);
  } else {
    args.push("--title", SESSION_TITLE);
  }

  if (files && files.length > 0) {
    for (const f of files) {
      args.push("--file", f);
    }
  }

  let contextPrefix = getContextPrefix();
  const hasAttachedFiles = Boolean(files && files.length > 0);

  if (!sessionId && (telosContext || soulContext)) {
    const governanceHeader =
      `\n\nHierarchie de gouvernance (obligatoire):\n` +
      `1) TELOS.md\n` +
      `2) DAIDENTITY.md\n` +
      `3) SOUL.md\n` +
      `4) AISTEERINGRULES.md (surtout coding)\n` +
      `En cas de conflit: TELOS et DAIDENTITY priment.`;

    const telosBlock = telosContext
      ? `\n\nDirectives TELOS:\n${telosContext}\nFin directives TELOS.`
      : "";
    const soulBlock = soulContext
      ? `\n\nRegles SOUL:\n${soulContext}\nFin des regles SOUL.`
      : "";

    const bootstrapBlock = `${governanceHeader}${telosBlock}${soulBlock}`;
    contextPrefix = contextPrefix ? `${contextPrefix}${bootstrapBlock}` : bootstrapBlock.trimStart();
  }

  // NOTE: avec opencode run + --file, un prompt multiline injecte depuis lastSummary
  // peut etre interprete comme chemin/fichier et provoquer "File not found".
  // On n'injecte donc pas le resume sur les runs media/documents.
  if (!hasAttachedFiles && !sessionId && lastSummary) {
    const summaryBlock = `\n\nResume de la session precedente (contexte de continuite):\n${lastSummary}\nFin du resume.`;
    contextPrefix = contextPrefix ? `${contextPrefix}${summaryBlock}` : summaryBlock.trimStart();
  }

  const finalMessage = contextPrefix ? `${contextPrefix}\n\n${message}` : message;
  if (hasAttachedFiles) {
    // opencode CLI: --file est un argument array. Sans separateur "--",
    // le message final peut etre interprete comme un autre chemin de fichier.
    args.push("--");
  }
  args.push(finalMessage);

  console.log(`  [opencode] model: ${model} | cmd: ${args.slice(1, 6).join(" ")}...`);

  const runId = ++currentRunId;
  const wrappedArgs = [
    "/usr/bin/timeout",
    "--signal=TERM",
    `${RUN_TIMEOUT_SECONDS}s`,
    ...args,
  ];

  const proc = Bun.spawn(wrappedArgs, {
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      HOME: "/root",
      PATH: "/root/.bun/bin:/usr/local/bin:/usr/bin:/bin",
      XDG_DATA_HOME: "/root/.local/share",
    },
  });
  currentOpencodeProc = proc;

  console.log(`  [opencode] PID: ${proc.pid}`);

  let timedOut = false;
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (exitCode === 124) {
    timedOut = true;
    console.log(`  [timeout] ${model} > ${RUN_TIMEOUT_SECONDS}s, fallback`);
  }
  if (stderr.trim()) {
    console.log(`  [stderr] ${stderr.trim().substring(0, 300)}`);
  }

  let textParts: string[] = [];
  let capturedSessionId: string | null = null;

  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.sessionID && !capturedSessionId) {
        capturedSessionId = event.sessionID;
      }
      if (event.type === "text" && event.part?.text) {
        textParts.push(event.part.text);
      }
    } catch {
      // pas du JSON
    }
  }

  if (capturedSessionId) {
    if (!sessionId) {
      console.log(`  [session] Nouvelle session: ${capturedSessionId}`);
    }
    sessionId = capturedSessionId;
    void saveSessionState();
  }

  const stopped = manuallyStoppedRuns.has(runId);
  if (stopped) {
    manuallyStoppedRuns.delete(runId);
  }

  if (currentOpencodeProc?.pid === proc.pid) {
    currentOpencodeProc = null;
  }

  const text = textParts.join("").trim();
  return { text, stdout, stderr, success: !stopped && text.length > 0, stopped, timedOut };
}

/**
 * Arrête la requête OpenCode en cours.
 */
function stopCurrentRun(): boolean {
  if (!currentOpencodeProc) return false;

  const pid = currentOpencodeProc.pid;
  manuallyStoppedRuns.add(currentRunId);

  try {
    currentOpencodeProc.kill();
  } catch {
    // ignore
  }

  // Sécurité: tuer les sous-processus opencode run éventuellement orphelins
  try {
    Bun.spawn(["/usr/bin/pkill", "-f", "opencode run --format json"], {
      stdout: "ignore",
      stderr: "ignore",
    });
  } catch {
    // ignore
  }

  console.log(`  [stop] Requête arrêtée manuellement (PID ${pid})`);
  return true;
}

/**
 * Envoie un message à OpenCode avec fallback automatique entre providers.
 */
async function sendToOpenCode(message: string, files?: string[]): Promise<string> {
  metrics.totalRequests++;
  const requestStartedAt = Date.now();
  const modelAtStart = getCurrentModel();

  const finalize = (
    text: string,
    opts?: {
      success?: boolean;
      stopped?: boolean;
      permissionError?: boolean;
      providerUnavailable?: boolean;
    }
  ): string => {
    recordLatency(Date.now() - requestStartedAt);
    if (opts?.success) metrics.successfulResponses++;
    if (opts?.stopped) metrics.stoppedRequests++;
    if (opts?.permissionError) metrics.permissionErrors++;
    if (opts?.providerUnavailable) metrics.providerUnavailable++;
    return text;
  };

  // Essayer avec le modèle courant
  const result = await runOpenCode(getCurrentModel(), message, files);
  if (result.timedOut) {
    metrics.timedOutRuns++;
  }

  if (result.stopped) {
    return finalize("⛔ Requête arrêtée manuellement.", { stopped: true });
  }

  if (result.success) {
    return finalize(result.text, { success: true });
  }

  if (isPermissionError(result.stdout, result.stderr)) {
    return finalize(
      "⛔ Accès refusé par la policy locale (permission de fichier/répertoire).\n" +
      "Donne l'accès requis ou déplace le fichier dans un dossier autorisé, puis réessaie."
    , { permissionError: true });
  }

  // Échec — vérifier si c'est un blocage provider
  if (result.timedOut || isProviderBlocked(result.stdout, result.stderr)) {
    console.log(`  [fallback] Provider bloqué sur ${getCurrentModel()}`);

    // Essayer les modèles suivants dans la chaîne
    while (switchToNextModel()) {
      console.log(`  [fallback] Tentative avec ${getCurrentModel()}...`);
      const retryResult = await runOpenCode(getCurrentModel(), message, files);
      if (retryResult.timedOut) {
        metrics.timedOutRuns++;
      }

      if (retryResult.stopped) {
        return finalize("⛔ Requête arrêtée manuellement.", { stopped: true });
      }

      if (retryResult.success) {
        return finalize(
          `⚠️ Changement automatique de modèle\n` +
          `De: ${modelAtStart}\n` +
          `Vers: ${getCurrentModel()}\n\n` +
          `${retryResult.text}`
        , { success: true });
      }

      if (isPermissionError(retryResult.stdout, retryResult.stderr)) {
        return finalize(
          "⛔ Accès refusé par la policy locale (permission de fichier/répertoire).\n" +
          "Donne l'accès requis ou déplace le fichier dans un dossier autorisé, puis réessaie."
        , { permissionError: true });
      }

      if (!(retryResult.timedOut || isProviderBlocked(retryResult.stdout, retryResult.stderr))) {
        // Erreur non liée au provider, pas la peine de continuer le fallback
        break;
      }
    }

    return finalize("Tous les providers sont indisponibles. Réessaie plus tard.", {
      providerUnavailable: true,
    });
  }

  return finalize(result.text || "Pas de réponse. Réessaie.");
}

function createTaskerJobId(): string {
  return `tsk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function runTaskerOpenCode(model: string, message: string): Promise<{ text: string; stdout: string; stderr: string; success: boolean; timedOut: boolean }> {
  const args = [
    "/usr/local/bin/opencode",
    "run",
    "--format",
    "json",
    "--model",
    model,
    "--title",
    TASKER_SESSION_TITLE,
    `${getContextPrefix()}\n\n[TASKER BACKGROUND MODE: execute the task and return concise completion output.]\n\n${message}`,
  ];

  const wrappedArgs = [
    "/usr/bin/timeout",
    "--signal=TERM",
    `${TASKER_RUN_TIMEOUT_SECONDS}s`,
    ...args,
  ];

  const proc = Bun.spawn(wrappedArgs, {
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      HOME: "/root",
      PATH: "/root/.bun/bin:/usr/local/bin:/usr/bin:/bin",
      XDG_DATA_HOME: "/root/.local/share",
    },
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const timedOut = exitCode === 124;
  let textParts: string[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "text" && event.part?.text) {
        textParts.push(event.part.text);
      }
    } catch {
      // ignore non-json lines
    }
  }

  const text = textParts.join("").trim();
  return { text, stdout, stderr, success: text.length > 0, timedOut };
}

async function sendToOpenCodeTasker(message: string): Promise<string> {
  const startIndex = preferredModelIndex;
  const orderedModels = [
    ...MODEL_CHAIN.slice(startIndex),
    ...MODEL_CHAIN.slice(0, startIndex),
  ];

  for (const model of orderedModels) {
    const result = await runTaskerOpenCode(model, message);
    if (result.success) {
      return result.text;
    }
    if (isPermissionError(result.stdout, result.stderr)) {
      return (
        "⛔ Tasker background job blocked by local policy permissions. " +
        "Grant required access and retry."
      );
    }
    if (!(result.timedOut || isProviderBlocked(result.stdout, result.stderr))) {
      return result.text || "Tasker job failed without provider fallback condition.";
    }
  }

  return "Tasker could not complete the job: all providers unavailable or timed out.";
}

async function enqueueTaskerJob(ctx: any, prompt: string): Promise<void> {
  const job: TaskerJob = {
    id: createTaskerJobId(),
    chatId: ctx.chat.id,
    prompt,
    enqueuedAt: Date.now(),
  };

  taskerQueue.push(job);
  metrics.taskerQueued++;
  const position = taskerQueue.length;

  await ctx.reply(
    `🛠️ Tasker job queued\n` +
    `Job ID: ${job.id}\n` +
    `Queue position: ${position}\n` +
    `I remain available in chat while Tasker runs this in background.`
  );

  void processTaskerQueue(ctx.api);
}

async function processTaskerQueue(api: any): Promise<void> {
  if (taskerBusy || taskerQueue.length === 0) return;
  taskerBusy = true;

  const job = taskerQueue.shift()!;
  const waitSeconds = Math.max(0, Math.round((Date.now() - job.enqueuedAt) / 1000));

  try {
    await api.sendMessage(job.chatId, `▶️ Tasker started job ${job.id} (queued ${waitSeconds}s).`);
    const result = await sendToOpenCodeTasker(job.prompt);
    metrics.taskerCompleted++;
    const formatted = formatForTelegram(result);
    await api.sendMessage(job.chatId, `✅ Tasker completed ${job.id}\n\n${formatted}`, {
      parse_mode: "Markdown",
    }).catch(async () => {
      await api.sendMessage(job.chatId, `✅ Tasker completed ${job.id}\n\n${formatted}`);
    });
  } catch (error: any) {
    metrics.taskerFailed++;
    await api.sendMessage(job.chatId, `❌ Tasker failed ${job.id}: ${error.message || "unknown error"}`);
  } finally {
    taskerBusy = false;
    void processTaskerQueue(api);
  }
}

function extractTaskerPrompt(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().startsWith("tasker:")) {
    return trimmed.slice("tasker:".length).trim() || null;
  }
  return null;
}

// Toutes les 10 minutes, essayer de revenir au modèle principal
setInterval(() => {
  resetToMainModel();
}, 10 * 60 * 1000);

/**
 * Télécharge un fichier depuis Telegram et le sauvegarde localement.
 */
async function downloadTelegramFile(bot: Bot, fileId: string, ext: string): Promise<string> {
  await ensureMediaDir();
  const file = await bot.api.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const localPath = join(MEDIA_DIR, `${fileId}.${ext}`);
  await writeFile(localPath, Buffer.from(arrayBuffer));
  return localPath;
}

/**
 * Nettoie les fichiers temporaires.
 */
async function cleanupFiles(files: string[]) {
  for (const f of files) {
    try {
      await unlink(f);
    } catch {
      // ignore
    }
  }
}

/**
 * Formate la réponse pour Telegram (max 4096 chars, escape markdown).
 */
function formatForTelegram(text: string): string {
  // Telegram a une limite de 4096 caractères
  if (text.length > 4000) {
    text = text.substring(0, 3997) + "...";
  }
  return text;
}

function getCommandsHelpText(): string {
  return (
    "Commandes disponibles:\n\n" +
    "/start - Affiche le message d'accueil et les commandes principales.\n" +
    "/commands - Affiche la liste complete des commandes et leur definition.\n" +
    "/session - Affiche la session courante, le modele actif, la queue et l'etat busy.\n" +
    "/summarize - Genere un resume de la session active (ou affiche le dernier resume).\n" +
    "/reset - Termine la session en cours, sauvegarde un resume, puis repart sur une nouvelle session.\n" +
    "/stop - Arrete la requete OpenCode en cours et vide la file d'attente.\n" +
    "/tasker <demande> - Lance une tache agent en arriere-plan sans bloquer le chat.\n" +
    "/health - Affiche la sante du bridge (uptime, modele, queue, fallback).\n" +
    "/models - Affiche le modele courant et la chaine de fallback.\n" +
    "/models <nom> - Selectionne un modele de la chaine (ex: /models anthropic).\n" +
    "/models reset - Revient au modele principal (index 0 / premier modele).\n" +
    "/model - Alias de /models.\n\n" +
    "Notes:\n" +
    "- Sans commande, tout message texte/photo/document est envoye a OpenCode.\n" +
    "- Prefixe 'tasker: ...' pour deleguer une tache simple en arriere-plan.\n" +
    "- Les commandes ne sont executees que pour les utilisateurs autorises."
  );
}

/**
 * Queue de messages — un seul message traité à la fois.
 */
async function enqueue(fn: () => Promise<void>): Promise<void> {
  return new Promise((resolve) => {
    messageQueue.push({ resolve, fn });
    if (messageQueue.length > metrics.maxQueueDepth) {
      metrics.maxQueueDepth = messageQueue.length;
    }
    processQueue();
  });
}

async function processQueue() {
  if (busy || messageQueue.length === 0) return;
  busy = true;

  const item = messageQueue.shift()!;
  try {
    await item.fn();
  } catch (err) {
    console.error("  [queue] Erreur:", err);
  } finally {
    busy = false;
    item.resolve();
    processQueue();
  }
}

/**
 * Vérifie si l'utilisateur est autorisé.
 */
function isAllowed(userId: number): boolean {
  if (ALLOWED_USERS.length === 0) return true;
  return ALLOWED_USERS.includes(userId);
}

// --- Bot Handlers ---

// Messages texte (les commandes /... passent au middleware bot.command)
bot.on("message:text", async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) {
    await ctx.reply("Non autorisé.");
    return;
  }

  const text = ctx.message.text;

  // Laisser les commandes continuer vers bot.command()
  if (text.startsWith("/")) {
    await next();
    return;
  }

  const taskerPrompt = extractTaskerPrompt(text);
  if (taskerPrompt) {
    await enqueueTaskerJob(ctx, taskerPrompt);
    return;
  }

  const userName = ctx.from?.first_name || "User";

  console.log(`\n[msg] ${userName} (${userId}): ${text.substring(0, 80)}`);

  void enqueue(async () => {
    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      // Relancer le typing toutes les 5s
      const typingInterval = setInterval(() => {
        ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
      }, 5000);

      const response = await sendToOpenCode(text);
      clearInterval(typingInterval);

      const formatted = formatForTelegram(response);
      await ctx.reply(formatted, { parse_mode: "Markdown" }).catch(async () => {
        // Fallback sans Markdown si le parsing échoue
        await ctx.reply(formatted);
      });

      console.log(`  [ok] Réponse envoyée (${formatted.length} chars) | Session: ${sessionId}`);
    } catch (error: any) {
      console.error(`  [err] ${error.message}`);
      await ctx.reply(`Erreur: ${error.message}`);
    }
  });
});

// Messages avec photo
bot.on("message:photo", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  const userName = ctx.from?.first_name || "User";
  const caption = ctx.message.caption || "Décris cette image.";
  const photos = ctx.message.photo;
  const largest = photos[photos.length - 1]; // meilleure résolution

  console.log(`\n[img] ${userName} (${userId}): photo + "${caption.substring(0, 50)}"`);

  void enqueue(async () => {
    let localPath: string | null = null;
    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      const typingInterval = setInterval(() => {
        ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
      }, 5000);

      // Télécharger l'image
      localPath = await downloadTelegramFile(bot, largest.file_id, "jpg");
      console.log(`  [img] Téléchargé: ${localPath}`);

      // Envoyer à OpenCode avec le fichier
      const response = await sendToOpenCode(caption, [localPath]);
      clearInterval(typingInterval);

      const formatted = formatForTelegram(response);
      await ctx.reply(formatted, { parse_mode: "Markdown" }).catch(async () => {
        await ctx.reply(formatted);
      });

      console.log(`  [ok] Réponse image envoyée (${formatted.length} chars)`);
    } catch (error: any) {
      console.error(`  [err] ${error.message}`);
      await ctx.reply(`Erreur: ${error.message}`);
    } finally {
      if (localPath) await cleanupFiles([localPath]);
    }
  });
});

// Messages avec document (fichiers)
bot.on("message:document", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  const userName = ctx.from?.first_name || "User";
  const doc = ctx.message.document;
  const caption = ctx.message.caption || `Analyse ce fichier: ${doc.file_name}`;
  const ext = doc.file_name?.split(".").pop() || "bin";

  console.log(`\n[doc] ${userName} (${userId}): ${doc.file_name}`);

  void enqueue(async () => {
    let localPath: string | null = null;
    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      const typingInterval = setInterval(() => {
        ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
      }, 5000);

      localPath = await downloadTelegramFile(bot, doc.file_id, ext);
      const response = await sendToOpenCode(caption, [localPath]);
      clearInterval(typingInterval);

      const formatted = formatForTelegram(response);
      await ctx.reply(formatted, { parse_mode: "Markdown" }).catch(async () => {
        await ctx.reply(formatted);
      });

      console.log(`  [ok] Réponse doc envoyée (${formatted.length} chars)`);
    } catch (error: any) {
      console.error(`  [err] ${error.message}`);
      await ctx.reply(`Erreur: ${error.message}`);
    } finally {
      if (localPath) await cleanupFiles([localPath]);
    }
  });
});

// Commandes spéciales
bot.command("start", async (ctx) => {
  await ctx.reply(
    "Kirito en ligne.\n\n" +
    "Envoie-moi un message texte ou une image.\n" +
    "Session persistante — je me souviens de notre conversation.\n\n" +
    "/reset — Résumer + nouvelle session\n" +
    "/summarize — Résumé de la session en cours\n" +
    "/session — Info session actuelle\n" +
    "/stop — Arrêter la requête en cours\n" +
    "/tasker <demande> — Exécuter une tâche simple en arrière-plan\n" +
    "/health — État du bridge\n" +
    "/models — Voir/changer le modèle\n" +
    "/commands — Toutes les commandes"
  );
});

bot.command("commands", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  await ctx.reply(getCommandsHelpText());
});

bot.command("health", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  const fallbackLine = lastFallback
    ? `${lastFallback.from} -> ${lastFallback.to} (${lastFallback.at})`
    : "aucun";
  const latency = getLatencyStats();
  const successRate =
    metrics.totalRequests > 0
      ? ((metrics.successfulResponses / metrics.totalRequests) * 100).toFixed(1)
      : "0.0";

  await ctx.reply(
    `Bridge: OK\n` +
    `Uptime: ${formatDuration(Date.now() - bridgeStartedAt)}\n` +
    `Modèle actif: ${getCurrentModel()} (${currentModelIndex + 1}/${MODEL_CHAIN.length})\n` +
    `Modèle préféré: ${MODEL_CHAIN[preferredModelIndex]}\n` +
    `Queue: ${messageQueue.length}\n` +
    `Queue max: ${metrics.maxQueueDepth}\n` +
    `Occupé: ${busy ? "oui" : "non"}\n` +
    `Session active: ${sessionId ? "oui" : "non"}\n` +
    `Dernier fallback: ${fallbackLine}\n` +
    `Requêtes: ${metrics.totalRequests} (succès ${metrics.successfulResponses}, ${successRate}%)\n` +
    `Timeouts run: ${metrics.timedOutRuns}\n` +
    `Switches fallback: ${metrics.fallbackSwitches}\n` +
    `Stops manuels: ${metrics.stoppedRequests}\n` +
    `Erreurs permission: ${metrics.permissionErrors}\n` +
      `Providers indisponibles: ${metrics.providerUnavailable}\n` +
      `Tasker queue: ${taskerQueue.length}\n` +
      `Tasker occupé: ${taskerBusy ? "oui" : "non"}\n` +
      `Tasker jobs: ${metrics.taskerQueued} (ok ${metrics.taskerCompleted}, fail ${metrics.taskerFailed})\n` +
      `Latence moy (fenêtre ${latency.sampleSize}): ${formatMs(latency.avgMs)}\n` +
      `Latence p95 (fenêtre ${latency.sampleSize}): ${formatMs(latency.p95Ms)}`
  );
});

bot.command("tasker", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  const prompt = ctx.message.text.replace(/^\/tasker(?:@\w+)?/, "").trim();
  if (!prompt) {
    await ctx.reply(
      "Usage: /tasker <demande>\n" +
      "Exemple: /tasker Prépare un plan de correction pour le ticket #21"
    );
    return;
  }

  await enqueueTaskerJob(ctx, prompt);
});

bot.command("stop", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  const stopped = stopCurrentRun();
  const queued = messageQueue.length;
  if (queued > 0) {
    messageQueue.splice(0, queued);
  }

  if (stopped) {
    await ctx.reply(
      `⛔ Requête en cours arrêtée.\n` +
      `Messages en attente supprimés: ${queued}.\n` +
      `Tasker background n'est pas interrompu par /stop.`
    );
  } else {
    await ctx.reply("Aucune requête en cours à arrêter.");
  }
});

async function handleModelCommand(ctx: any) {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  const arg = ctx.message.text.replace(/^\/models?(?:@\w+)?/, "").trim();

  if (!arg) {
    await ctx.reply(
      `Modèle actuel: ${getCurrentModel()}\n` +
      `Position: ${currentModelIndex + 1}/${MODEL_CHAIN.length}\n\n` +
      `Chaîne de fallback:\n` +
      MODEL_CHAIN.map((m, i) => `${i === currentModelIndex ? "→" : "  "} ${m}`).join("\n") +
      `\n\nModèle préféré: ${MODEL_CHAIN[preferredModelIndex]}` +
      `\nReset auto en attente: ${pendingAutoResetToPreferred ? "oui" : "non"}` +
      `\n\n/models reset — Revenir au modèle principal`
    );
    return;
  }

  if (arg === "reset") {
    preferredModelIndex = 0;
    currentModelIndex = 0;
    pendingAutoResetToPreferred = false;
    await saveModelState();
    await ctx.reply(`Modèle réinitialisé: ${getCurrentModel()}`);
    return;
  }

  const idx = MODEL_CHAIN.findIndex((m) => m.includes(arg));
  if (idx >= 0) {
    currentModelIndex = idx;
    preferredModelIndex = idx;
    pendingAutoResetToPreferred = false;
    await saveModelState();
    await ctx.reply(`Modèle changé: ${getCurrentModel()}`);
    console.log(`\n[model] Changé manuellement: ${getCurrentModel()}`);
  } else {
    await ctx.reply(`Modèle "${arg}" non trouvé dans la chaîne.\nDisponibles: ${MODEL_CHAIN.join(", ")}`);
  }
}

bot.command("reset", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  if (!sessionId) {
    await ctx.reply("Aucune session active.");
    return;
  }

  void enqueue(async () => {
    const oldSession = sessionId;
    await ctx.reply("Résumé de la session en cours...");
    await ctx.api.sendChatAction(ctx.chat.id, "typing");

    const typingInterval = setInterval(() => {
      ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
    }, 5000);

    try {
      const summary = await summarizeSession();
      clearInterval(typingInterval);

      await saveSummary(summary);
      lastSummary = summary;
      sessionId = null;
      await saveSessionState();

      const formatted = formatForTelegram(
        `Session terminée (${oldSession})\n\n` +
        `📝 Résumé sauvegardé:\n${summary}\n\n` +
        `Prochain message = nouvelle session avec ce contexte.`
      );
      await ctx.reply(formatted);
      console.log(`\n[reset] Session ${oldSession} → null (résumé sauvegardé)`);
    } catch (error: any) {
      clearInterval(typingInterval);
      // Reset quand même en cas d'erreur
      sessionId = null;
      await saveSessionState();
      await ctx.reply(`Session réinitialisée (sans résumé: ${error.message})`);
      console.log(`\n[reset] Session ${oldSession} → null (erreur résumé: ${error.message})`);
    }
  });
});

bot.command("summarize", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  if (!sessionId) {
    // Afficher le dernier résumé sauvegardé
    if (lastSummary) {
      await ctx.reply(`📝 Dernier résumé sauvegardé:\n\n${formatForTelegram(lastSummary)}`);
    } else {
      await ctx.reply("Aucune session active et aucun résumé sauvegardé.");
    }
    return;
  }

  void enqueue(async () => {
    await ctx.reply("Génération du résumé...");
    await ctx.api.sendChatAction(ctx.chat.id, "typing");

    const typingInterval = setInterval(() => {
      ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
    }, 5000);

    try {
      const summary = await summarizeSession();
      clearInterval(typingInterval);

      await ctx.reply(formatForTelegram(`📝 Résumé de la session:\n\n${summary}`));
      console.log(`\n[summarize] Résumé généré (${summary.length} chars)`);
    } catch (error: any) {
      clearInterval(typingInterval);
      await ctx.reply(`Erreur: ${error.message}`);
    }
  });
});

bot.command("session", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAllowed(userId)) return;

  await ctx.reply(
    `Session: ${sessionId || "aucune (sera créée au prochain message)"}\n` +
    `Modèle: ${getCurrentModel()} (${currentModelIndex + 1}/${MODEL_CHAIN.length})\n` +
    `Chaîne: ${MODEL_CHAIN.join(" → ")}\n` +
    `Résumé précédent: ${lastSummary ? "oui" : "non"}\n` +
    `Queue: ${messageQueue.length} message(s) en attente\n` +
    `Occupé: ${busy}\n` +
    `Tasker queue: ${taskerQueue.length}\n` +
    `Tasker occupé: ${taskerBusy ? "oui" : "non"}`
  );
});

bot.command("model", handleModelCommand);
bot.command("models", handleModelCommand);

// --- Start ---

// Charger le dernier résumé au démarrage
lastSummary = await loadLastSummary();
soulContext = await loadSoulContext();
telosContext = await loadTelosContext();
await loadSessionState();
await loadModelState();
await saveModelState();

console.log("====================================");
console.log("  Kirito Telegram Bridge v2.2");
console.log("  Session persistante + résumés");
console.log("  Token: configuré via environment");
console.log(`  Model: ${getCurrentModel()}`);
console.log(`  Model chain: ${MODEL_CHAIN.join(" -> ")}`);
console.log(`  Users: ${ALLOWED_USERS.length > 0 ? ALLOWED_USERS.join(", ") : "tous"}`);
console.log(`  Résumé chargé: ${lastSummary ? "oui" : "non"}`);
console.log(`  TELOS chargé: ${telosContext ? "oui" : "non"}`);
console.log(`  SOUL chargé: ${soulContext ? "oui" : "non"}`);
console.log("====================================");

bot.catch((err) => {
  console.error("[bot error]", err.message);
});

const pollingLockAcquired = await acquirePollingLock();
if (!pollingLockAcquired) {
  logStructured("telegram_polling_lock_start_skipped", {
    lockFile: POLLING_LOCK_FILE,
    pid: process.pid,
  });
  process.exit(0);
}

setupPollingLockCleanup();
bot.start();
