/**
 * VoiceNotification Handler for PAI-OpenCode
 *
 * PURPOSE:
 * Sends completion messages to the voice server for TTS playback.
 * Extracts the 🗣️ voice line from responses and sends to TTS service.
 *
 * Supports:
 * - ElevenLabs via voice server (PAI 2.5 standard)
 * - Google Cloud TTS (PAI-OpenCode addition)
 *
 * Based on PAI v2.5 hooks/handlers/VoiceNotification.ts
 *
 * @module voice-notification
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getOpenCodeDir, getStateDir, getWorkDir } from '../lib/paths';
import { getIdentity, getSettings } from '../lib/identity';
import { getISOTimestamp } from '../lib/time';
import { fileLog } from '../lib/file-logger';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

type VoiceEngine = 'elevenlabs' | 'google' | 'macos';

interface ElevenLabsPayload {
  message: string;
  title?: string;
  voice_enabled?: boolean;
  voice_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    speed: number;
    use_speaker_boost: boolean;
  };
  volume?: number;
}

interface VoiceEvent {
  timestamp: string;
  session_id: string;
  event_type: 'sent' | 'failed' | 'skipped';
  message: string;
  character_count: number;
  voice_engine: VoiceEngine;
  voice_id: string;
  status_code?: number;
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

// ElevenLabs voice server endpoint (PAI 2.5 standard)
const ELEVENLABS_SERVER_URL = 'http://localhost:8888/notify';

// Google Cloud TTS endpoint
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// ============================================================================
// Voice Event Logging
// ============================================================================

function getActiveWorkDir(): string | null {
  try {
    const currentWorkPath = join(getStateDir(), 'current-work.json');
    if (!existsSync(currentWorkPath)) return null;
    const content = readFileSync(currentWorkPath, 'utf-8');
    const state = JSON.parse(content);
    if (state.work_dir) {
      const workPath = join(getWorkDir(), state.work_dir);
      if (existsSync(workPath)) return workPath;
    }
  } catch {
    // Silent fail
  }
  return null;
}

function logVoiceEvent(event: VoiceEvent): void {
  const line = JSON.stringify(event) + '\n';

  try {
    const voiceDir = join(getOpenCodeDir(), 'MEMORY', 'VOICE');
    if (!existsSync(voiceDir)) {
      mkdirSync(voiceDir, { recursive: true });
    }
    appendFileSync(join(voiceDir, 'voice-events.jsonl'), line);
  } catch {
    // Silent fail
  }

  try {
    const workDir = getActiveWorkDir();
    if (workDir) {
      appendFileSync(join(workDir, 'voice.jsonl'), line);
    }
  } catch {
    // Silent fail
  }
}

// ============================================================================
// Voice Completion Validation (PAI 2.5 standard)
// ============================================================================

/**
 * Validate voice completion message
 */
function isValidVoiceCompletion(message: string | undefined): boolean {
  if (!message) return false;
  if (message.length < 5) return false;
  // Contains markdown (shouldn't be spoken)
  if (/```|`|\*\*|__|\[.*\]\(.*\)/.test(message)) return false;
  // Contains file paths
  if (/\/[\w-]+\/[\w-]+\//.test(message)) return false;
  return true;
}

/**
 * Get fallback voice message
 */
function getVoiceFallback(): string {
  return 'Task completed.';
}

// ============================================================================
// ElevenLabs TTS (PAI 2.5 Standard)
// ============================================================================

async function sendElevenLabs(
  message: string,
  sessionId: string
): Promise<boolean> {
  const identity = getIdentity();
  const voiceId = identity.voiceId || 's3TPKV1kjDlVtZbl4Ksh';
  const voiceSettings = identity.voice;

  const payload: ElevenLabsPayload = {
    message,
    title: `${identity.name} says`,
    voice_enabled: true,
    voice_id: voiceId,
    voice_settings: voiceSettings
      ? {
          stability: voiceSettings.stability ?? 0.5,
          similarity_boost: voiceSettings.similarity_boost ?? 0.75,
          style: voiceSettings.style ?? 0.0,
          speed: voiceSettings.speed ?? 1.0,
          use_speaker_boost: voiceSettings.use_speaker_boost ?? true,
        }
      : undefined,
  };

  const baseEvent: Omit<VoiceEvent, 'event_type' | 'status_code' | 'error'> = {
    timestamp: getISOTimestamp(),
    session_id: sessionId,
    message,
    character_count: message.length,
    voice_engine: 'elevenlabs',
    voice_id: voiceId,
  };

  try {
    const response = await fetch(ELEVENLABS_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      fileLog(`[Voice:ElevenLabs] Server error: ${response.statusText}`, 'error');
      logVoiceEvent({
        ...baseEvent,
        event_type: 'failed',
        status_code: response.status,
        error: response.statusText,
      });
      return false;
    }

    logVoiceEvent({ ...baseEvent, event_type: 'sent', status_code: response.status });
    fileLog(`[Voice:ElevenLabs] Sent: "${message.substring(0, 50)}..."`, 'info');
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    fileLog(`[Voice:ElevenLabs] Failed: ${errorMsg}`, 'debug');
    logVoiceEvent({ ...baseEvent, event_type: 'failed', error: errorMsg });
    return false;
  }
}

// ============================================================================
// Google Cloud TTS (PAI-OpenCode Addition)
// ============================================================================

interface GoogleTTSRequest {
  input: { text: string };
  voice: {
    languageCode: string;
    name: string;
  };
  audioConfig: {
    audioEncoding: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
    speakingRate?: number;
    pitch?: number;
  };
}

async function sendGoogleTTS(
  message: string,
  sessionId: string
): Promise<boolean> {
  const settings = getSettings();
  const googleApiKey = settings.env?.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_API_KEY;

  if (!googleApiKey) {
    fileLog('[Voice:Google] No API key configured (GOOGLE_TTS_API_KEY)', 'debug');
    return false;
  }

  // Get Google voice config from settings or use defaults
  const googleConfig = (settings as any).voice?.google || {
    languageCode: 'de-DE',
    voiceName: 'de-DE-Neural2-B',
    speakingRate: 1.0,
    pitch: 0.0,
  };

  const requestBody: GoogleTTSRequest = {
    input: { text: message },
    voice: {
      languageCode: googleConfig.languageCode || 'de-DE',
      name: googleConfig.voiceName || 'de-DE-Neural2-B',
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: googleConfig.speakingRate || 1.0,
      pitch: googleConfig.pitch || 0.0,
    },
  };

  const baseEvent: Omit<VoiceEvent, 'event_type' | 'status_code' | 'error'> = {
    timestamp: getISOTimestamp(),
    session_id: sessionId,
    message,
    character_count: message.length,
    voice_engine: 'google',
    voice_id: googleConfig.voiceName || 'de-DE-Neural2-B',
  };

  try {
    const response = await fetch(`${GOOGLE_TTS_URL}?key=${googleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      fileLog(`[Voice:Google] API error: ${response.status}`, 'error');
      logVoiceEvent({
        ...baseEvent,
        event_type: 'failed',
        status_code: response.status,
        error: errorText.substring(0, 200),
      });
      return false;
    }

    const data = await response.json() as { audioContent: string };
    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    // Save to temp file and play (macOS)
    const tempFile = `/tmp/pai-voice-${Date.now()}.mp3`;
    writeFileSync(tempFile, audioBuffer);

    try {
      await execAsync(`afplay "${tempFile}"`);
    } finally {
      // Cleanup temp file
      try { unlinkSync(tempFile); } catch { /* ignore */ }
    }

    logVoiceEvent({ ...baseEvent, event_type: 'sent', status_code: response.status });
    fileLog(`[Voice:Google] Played: "${message.substring(0, 50)}..."`, 'info');
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    fileLog(`[Voice:Google] Failed: ${errorMsg}`, 'error');
    logVoiceEvent({ ...baseEvent, event_type: 'failed', error: errorMsg });
    return false;
  }
}

// ============================================================================
// Engine Detection
// ============================================================================

async function isElevenLabsAvailable(): Promise<boolean> {
  try {
    const response = await fetch(ELEVENLABS_SERVER_URL.replace('/notify', '/health'), {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function isGoogleTTSConfigured(): boolean {
  const settings = getSettings();
  return !!(settings.env?.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_API_KEY);
}

function isMacOS(): boolean {
  return process.platform === 'darwin';
}

// ============================================================================
// macOS say Command (Fallback)
// ============================================================================

async function sendMacOSSay(
  message: string,
  sessionId: string
): Promise<boolean> {
  if (!isMacOS()) {
    return false;
  }

  const settings = getSettings();
  const macosConfig = (settings as any).voice?.macos || { voice: 'Daniel', rate: 200 };

  const baseEvent: Omit<VoiceEvent, 'event_type' | 'status_code' | 'error'> = {
    timestamp: getISOTimestamp(),
    session_id: sessionId,
    message,
    character_count: message.length,
    voice_engine: 'macos',
    voice_id: macosConfig.voice,
  };

  try {
    // Escape message for shell
    const escapedMessage = message.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    await execAsync(`say -v "${macosConfig.voice}" -r ${macosConfig.rate} "${escapedMessage}"`);

    logVoiceEvent({ ...baseEvent, event_type: 'sent' });
    fileLog(`[Voice:macOS] Spoke: "${message.substring(0, 50)}..."`, 'info');
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    fileLog(`[Voice:macOS] Failed: ${errorMsg}`, 'error');
    logVoiceEvent({ ...baseEvent, event_type: 'failed', error: errorMsg });
    return false;
  }
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle voice notification for a response.
 *
 * Engine priority:
 * 1. ElevenLabs (if voice server available) - PAI 2.5 standard
 * 2. Google Cloud TTS (if API key configured) - PAI-OpenCode addition
 *
 * @param voiceCompletion - The voice message to speak (already extracted)
 * @param sessionId - Current session ID
 * @returns true if voice was sent, false otherwise
 */
export async function handleVoiceNotification(
  voiceCompletion: string,
  sessionId: string = 'unknown'
): Promise<boolean> {
  // Validate voice completion
  if (!isValidVoiceCompletion(voiceCompletion)) {
    fileLog(`[Voice] Invalid completion: "${voiceCompletion?.slice(0, 50)}..."`, 'warn');
    voiceCompletion = getVoiceFallback();
  }

  // Skip empty or too-short messages
  if (!voiceCompletion || voiceCompletion.length < 5) {
    fileLog('[Voice] Skipping - message too short or empty', 'debug');
    return false;
  }

  // Try ElevenLabs first (PAI 2.5 standard)
  if (await isElevenLabsAvailable()) {
    if (await sendElevenLabs(voiceCompletion, sessionId)) {
      return true;
    }
  }

  // Fallback to Google TTS (PAI-OpenCode addition)
  if (isGoogleTTSConfigured()) {
    fileLog('[Voice] ElevenLabs unavailable, trying Google TTS', 'info');
    if (await sendGoogleTTS(voiceCompletion, sessionId)) {
      return true;
    }
  }

  // Final fallback: macOS say command
  if (isMacOS()) {
    fileLog('[Voice] Cloud TTS unavailable, using macOS say', 'info');
    if (await sendMacOSSay(voiceCompletion, sessionId)) {
      return true;
    }
  }

  fileLog('[Voice] No TTS engine available', 'warn');
  return false;
}

/**
 * Extract voice completion from response text
 * Looks for 🗣️ pattern in the response
 */
export function extractVoiceCompletion(text: string): string | null {
  if (!text) return null;

  // Pattern: 🗣️ Name: message
  const match = text.match(/🗣️\s*[\w\s]+:\s*(.+?)(?:\n|$)/);
  if (match) {
    return match[1].trim();
  }

  return null;
}

/**
 * Check if any voice engine is available
 */
export async function isVoiceAvailable(): Promise<boolean> {
  if (await isElevenLabsAvailable()) return true;
  if (isGoogleTTSConfigured()) return true;
  if (isMacOS()) return true;
  return false;
}
