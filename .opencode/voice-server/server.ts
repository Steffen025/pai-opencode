#!/usr/bin/env bun
// $PAI_DIR/voice-server/server.ts
// Voice notification server with multi-provider TTS support
// Supports: Google Cloud TTS, ElevenLabs
// Platforms: macOS, Linux

import { serve } from "bun";
import { spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

// Load .env from OpenCode/PAI directory (single source of truth for all API keys)
// Supports both OPENCODE_DIR (new) and PAI_DIR (legacy)
const paiDir = process.env.OPENCODE_DIR 
  || process.env.PAI_DIR 
  || join(homedir(), '.opencode');
const envPath = join(paiDir, '.env');
if (existsSync(envPath)) {
  const envContent = await Bun.file(envPath).text();
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const PORT = parseInt(process.env.PAI_VOICE_PORT || "8888");

// =============================================================================
// TTS Provider Configuration
// =============================================================================
// Options: "google" | "elevenlabs" | "macos" (default: elevenlabs for backward compatibility)
// "macos" uses the built-in `say` command — free, offline, no API key needed
let TTS_PROVIDER = (process.env.TTS_PROVIDER || 'elevenlabs').toLowerCase();

// Auto-detect: if no API keys configured and on macOS, fall back to macOS Say
if (TTS_PROVIDER === 'elevenlabs' && !process.env.ELEVENLABS_API_KEY && process.platform === 'darwin') {
  if (!process.env.GOOGLE_API_KEY) {
    TTS_PROVIDER = 'macos';
    console.log('💡 No API keys found — using macOS Say as TTS fallback (free, offline)');
  }
}

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY; // pragma: allowlist secret
const DEFAULT_ELEVENLABS_VOICE = process.env.ELEVENLABS_VOICE_ID || "s3TPKV1kjDlVtZbl4Ksh";

// =============================================================================
// Google Cloud TTS Configuration - Two-Tier System
// =============================================================================
// TIER 1 (Premium):  Chirp 3: HD  - $30/1M chars - Best quality, streaming
// TIER 2 (Standard): Neural2      - $16/1M chars - Good quality, cheaper
//
// Switch tiers: GOOGLE_TTS_TIER=premium or GOOGLE_TTS_TIER=standard in .env
// =============================================================================
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // pragma: allowlist secret
const GOOGLE_TTS_TIER = (process.env.GOOGLE_TTS_TIER || 'premium').toLowerCase();

// Tier-specific default voices
const TIER_DEFAULTS = {
  premium: {
    name: 'Chirp 3: HD',
    cost: '$30/1M chars',
    defaultVoice: 'en-US-Chirp3-HD-Orus',
    voiceFormat: 'en-US-Chirp3-HD-{VoiceName}',
    features: ['Streaming', 'Low latency', 'Emotional resonance']
  },
  standard: {
    name: 'Neural2',
    cost: '$16/1M chars',
    defaultVoice: 'en-US-Neural2-J',
    voiceFormat: 'en-US-Neural2-{Letter}',
    features: ['High quality', 'Cost effective']
  }
};

const CURRENT_TIER = TIER_DEFAULTS[GOOGLE_TTS_TIER as keyof typeof TIER_DEFAULTS] || TIER_DEFAULTS.premium;
const GOOGLE_TTS_VOICE = process.env.GOOGLE_TTS_VOICE || CURRENT_TIER.defaultVoice;

// Validate provider configuration
if (TTS_PROVIDER === 'elevenlabs' && !ELEVENLABS_API_KEY) {
  console.error(`⚠️  ELEVENLABS_API_KEY not found in ${envPath}`);
  console.error('Add: ELEVENLABS_API_KEY=your_key_here to $PAI_DIR/.env');
  console.error('Or switch to Google TTS: TTS_PROVIDER=google');
}

if (TTS_PROVIDER === 'google' && !GOOGLE_API_KEY) {
  console.error(`⚠️  GOOGLE_API_KEY not found in ${envPath}`);
  console.error('Add: GOOGLE_API_KEY=your_key_here to $PAI_DIR/.env');
  console.error('Note: Enable Cloud Text-to-Speech API in Google Cloud Console');
}

// Default voice based on provider
const DEFAULT_VOICE_ID = TTS_PROVIDER === 'google' ? GOOGLE_TTS_VOICE : DEFAULT_ELEVENLABS_VOICE;

// Voice configuration types
interface VoiceConfig {
  voice_id: string;
  voice_name: string;
  stability?: number;           // ElevenLabs setting
  similarity_boost?: number;    // ElevenLabs setting
  speaking_rate?: number;       // Google Chirp 3 HD: 0.25 - 2.0 (default 1.0)
  google_voice?: string;        // Full voice name (e.g., "en-US-Chirp3-HD-Orus")
  chirp3_hd_voice?: string;     // Just the voice name (e.g., "Orus")
  description: string;
}

interface VoicesConfig {
  default_volume?: number;
  voices: Record<string, VoiceConfig>;
}

// 13 Emotional Presets - Prosody System
const EMOTIONAL_PRESETS: Record<string, { stability: number; similarity_boost: number }> = {
  'excited': { stability: 0.7, similarity_boost: 0.9 },
  'celebration': { stability: 0.65, similarity_boost: 0.85 },
  'insight': { stability: 0.55, similarity_boost: 0.8 },
  'creative': { stability: 0.5, similarity_boost: 0.75 },
  'success': { stability: 0.6, similarity_boost: 0.8 },
  'progress': { stability: 0.55, similarity_boost: 0.75 },
  'investigating': { stability: 0.6, similarity_boost: 0.85 },
  'debugging': { stability: 0.55, similarity_boost: 0.8 },
  'learning': { stability: 0.5, similarity_boost: 0.75 },
  'pondering': { stability: 0.65, similarity_boost: 0.8 },
  'focused': { stability: 0.7, similarity_boost: 0.85 },
  'caution': { stability: 0.4, similarity_boost: 0.6 },
  'urgent': { stability: 0.3, similarity_boost: 0.9 },
};

// Load voice configuration
let voicesConfig: VoicesConfig | null = null;
try {
  const voicesPath = join(paiDir, 'config', 'voice-personalities.json');
  if (existsSync(voicesPath)) {
    const voicesContent = readFileSync(voicesPath, 'utf-8');
    voicesConfig = JSON.parse(voicesContent);
    console.log('✅ Loaded voice personalities from config');
  }
} catch (error) {
  console.warn('⚠️  Failed to load voice personalities, using defaults');
}

// Extract emotional marker from message
function extractEmotionalMarker(message: string): { cleaned: string; emotion?: string } {
  const emojiToEmotion: Record<string, string> = {
    '💥': 'excited', '🎉': 'celebration', '💡': 'insight', '🎨': 'creative',
    '✨': 'success', '📈': 'progress', '🔍': 'investigating', '🐛': 'debugging',
    '📚': 'learning', '🤔': 'pondering', '🎯': 'focused', '⚠️': 'caution', '🚨': 'urgent'
  };

  const emotionMatch = message.match(/\[(💥|🎉|💡|🎨|✨|📈|🔍|🐛|📚|🤔|🎯|⚠️|🚨)\s+(\w+)\]/);
  if (emotionMatch) {
    const emoji = emotionMatch[1];
    const emotionName = emotionMatch[2].toLowerCase();
    if (emojiToEmotion[emoji] === emotionName) {
      return {
        cleaned: message.replace(emotionMatch[0], '').trim(),
        emotion: emotionName
      };
    }
  }
  return { cleaned: message };
}

// Get voice configuration by voice ID or agent name
function getVoiceConfig(identifier: string): VoiceConfig | null {
  if (!voicesConfig) return null;
  if (voicesConfig.voices[identifier]) return voicesConfig.voices[identifier];
  for (const config of Object.values(voicesConfig.voices)) {
    if (config.voice_id === identifier) return config;
  }
  return null;
}

// Resolve voice ID - handles "default" and env var lookups for both providers
function resolveVoiceId(voiceId: string | null, agentName: string | null = null): string {
  // If we have an agent name, check for agent-specific env var first
  if (agentName) {
    // Check provider-specific env var first
    if (TTS_PROVIDER === 'google') {
      const googleEnvKey = `GOOGLE_TTS_VOICE_${agentName.toUpperCase()}`;
      const googleVoice = process.env[googleEnvKey];
      if (googleVoice) {
        console.log(`🎭 Using Google voice for ${agentName}: ${googleVoice}`);
        return googleVoice;
      }
    } else {
      const elevenLabsEnvKey = `ELEVENLABS_VOICE_${agentName.toUpperCase()}`;
      const elevenLabsVoice = process.env[elevenLabsEnvKey];
      if (elevenLabsVoice) {
        return elevenLabsVoice;
      }
    }
  }

  // If voiceId is "default" or empty, use fallback chain
  if (!voiceId || voiceId === 'default') {
    return DEFAULT_VOICE_ID;
  }

  // Otherwise use the provided voiceId
  return voiceId;
}

// Sanitize input for TTS - allow natural speech, block dangerous characters
function sanitizeForSpeech(input: string): string {
  return input
    .replace(/<script/gi, '')
    .replace(/\.\.\//g, '')
    .replace(/[;&|><`$\\]/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .trim()
    .substring(0, 500);
}

// Validate input
function validateInput(input: any): { valid: boolean; error?: string; sanitized?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Invalid input type' };
  }
  if (input.length > 500) {
    return { valid: false, error: 'Message too long (max 500 characters)' };
  }
  const sanitized = sanitizeForSpeech(input);
  if (!sanitized || sanitized.length === 0) {
    return { valid: false, error: 'Message contains no valid content after sanitization' };
  }
  return { valid: true, sanitized };
}

// =============================================================================
// TTS Providers
// =============================================================================

// ElevenLabs TTS Generation
async function generateSpeechElevenLabs(
  text: string,
  voiceId: string,
  voiceSettings?: { stability: number; similarity_boost: number }
): Promise<ArrayBuffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const settings = voiceSettings || { stability: 0.5, similarity_boost: 0.5 };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: settings,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
}

// Google Cloud TTS Generation - Chirp 3: HD
// Model: Chirp 3: HD (Premium, Streaming-capable)
// Cost: $30/1M chars (1M chars/month FREE)
async function generateSpeechGoogle(
  text: string,
  voice?: string,
  speakingRate: number = 1.0
): Promise<ArrayBuffer> {
  if (!GOOGLE_API_KEY) {
    throw new Error('Google API key not configured. Add GOOGLE_API_KEY to your .env file.');
  }

  const voiceName = voice || GOOGLE_TTS_VOICE;
  // Extract language code from voice name
  // Handles both formats:
  // - Chirp 3 HD: "en-US-Chirp3-HD-Orus" -> "en-US"
  // - Neural2/Studio: "en-US-Neural2-J" -> "en-US"
  const languageCode = voiceName.split('-').slice(0, 2).join('-');

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

  // Chirp 3 HD uses plain text input (not SSML)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speakingRate,  // Chirp 3 HD supports 0.25x - 2.0x
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google TTS API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Google returns base64-encoded audio in the 'audioContent' field
  if (!data.audioContent) {
    throw new Error('Google TTS: No audio content in response');
  }

  // Decode base64 to ArrayBuffer
  const binaryString = atob(data.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// macOS Say TTS Generation — free, offline, no API key needed
// Uses the built-in `say` command on macOS
async function generateSpeechMacOS(
  text: string,
  voice: string = 'Samantha',
  speakingRate: number = 1.0
): Promise<{ type: 'macos-say'; text: string; voice: string; rate: number }> {
  // macOS say doesn't generate audio files by default — we return a marker
  // and handle playback differently in playAudioInternal
  return { type: 'macos-say', text, voice, rate: speakingRate };
}

// Unified speech generation - routes to the configured provider
async function generateSpeech(
  text: string,
  voiceId: string,
  voiceSettings?: { stability: number; similarity_boost: number },
  speakingRate: number = 1.0
): Promise<ArrayBuffer> {
  if (TTS_PROVIDER === 'google') {
    return generateSpeechGoogle(text, voiceId, speakingRate);
  } else {
    return generateSpeechElevenLabs(text, voiceId, voiceSettings);
  }
}

// Get volume setting from config (defaults to 0.5 = 50%)
// Reads fresh from disk each time to pick up runtime changes
function getVolumeSetting(): number {
  try {
    const voicesPath = join(paiDir, 'config', 'voice-personalities.json');
    if (existsSync(voicesPath)) {
      const content = readFileSync(voicesPath, 'utf-8');
      const config = JSON.parse(content);
      if (typeof config.default_volume === 'number') {
        const vol = config.default_volume;
        if (vol >= 0 && vol <= 1) return vol;
      }
    }
  } catch {
    // Fall through to default
  }
  return 0.5;
}

// =============================================================================
// Cross-Platform Audio Playback
// =============================================================================

// Play audio - queued to prevent overlapping speech
async function playAudio(audioBuffer: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    audioQueue.push({ audioBuffer, resolve, reject });
    console.log(`🎵 Audio queued (queue length: ${audioQueue.length})`);
    processAudioQueue();
  });
}

// =============================================================================
// Cross-Platform Notifications
// =============================================================================

// Send notification with voice
async function sendNotification(
  title: string,
  message: string,
  voiceEnabled = true,
  voiceId: string | null = null
) {
  const titleValidation = validateInput(title);
  const messageValidation = validateInput(message);

  if (!titleValidation.valid) throw new Error(`Invalid title: ${titleValidation.error}`);
  if (!messageValidation.valid) throw new Error(`Invalid message: ${messageValidation.error}`);

  const safeTitle = titleValidation.sanitized!;
  let safeMessage = messageValidation.sanitized!;

  // Extract emotional marker if present
  const { cleaned, emotion } = extractEmotionalMarker(safeMessage);
  safeMessage = cleaned;

  // Generate and play voice
  const apiKeyConfigured = TTS_PROVIDER === 'google' ? GOOGLE_API_KEY :
                           TTS_PROVIDER === 'macos' ? true :
                           ELEVENLABS_API_KEY;
  if (voiceEnabled && apiKeyConfigured) {
    try {
      const voiceConfig = voiceId ? getVoiceConfig(voiceId) : null;
      const agentName = voiceConfig?.voice_name || voiceId;
      const voice = resolveVoiceId(voiceConfig?.voice_id || voiceId, agentName);

      // Determine voice settings (priority: emotional > personality > defaults)
      let voiceSettings = { stability: 0.5, similarity_boost: 0.5 };
      let speakingRate = 1.0;

      if (emotion && EMOTIONAL_PRESETS[emotion]) {
        voiceSettings = EMOTIONAL_PRESETS[emotion];
        console.log(`🎭 Emotion: ${emotion}`);
      } else if (voiceConfig) {
        voiceSettings = {
          stability: voiceConfig.stability || 0.5,
          similarity_boost: voiceConfig.similarity_boost || 0.5
        };
        speakingRate = voiceConfig.speaking_rate || 1.0;
        console.log(`👤 Personality: ${voiceConfig.description}`);
      }

      console.log(`🎙️  Generating speech (voice: ${voice}, rate: ${speakingRate})`);

      if (TTS_PROVIDER === 'macos' && process.platform === 'darwin') {
        // macOS Say — direct playback, no audio buffer needed
        const macVoice = voice !== DEFAULT_VOICE_ID ? voice : 'Samantha';
        await playMacOSSay(safeMessage, macVoice, speakingRate);
      } else {
        const audioBuffer = await generateSpeech(safeMessage, voice, voiceSettings, speakingRate);
        await playAudio(audioBuffer);
      }
    } catch (error) {
      console.error("Failed to generate/play speech:", error);
    }
  }

  // Display desktop notification (platform-aware)
  try {
    if (process.platform === 'linux') {
      // Linux: use notify-send
      spawn('/usr/bin/notify-send', [safeTitle, safeMessage]);
    } else if (process.platform === 'darwin') {
      // macOS: use osascript
      const escapedTitle = safeTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const escapedMessage = safeMessage.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const script = `display notification "${escapedMessage}" with title "${escapedTitle}" sound name ""`;
      spawn('/usr/bin/osascript', ['-e', script]);
    }
  } catch (error) {
    console.error("Notification display error:", error);
  }
}

// =============================================================================
// Audio Queue - Prevents Overlapping Speech
// =============================================================================
interface QueuedAudio {
  audioBuffer: ArrayBuffer;
  resolve: () => void;
  reject: (error: Error) => void;
}

const audioQueue: QueuedAudio[] = [];
let isPlaying = false;

async function processAudioQueue(): Promise<void> {
  if (isPlaying || audioQueue.length === 0) return;

  isPlaying = true;
  while (audioQueue.length > 0) {
    const item = audioQueue.shift()!;
    try {
      await playAudioInternal(item.audioBuffer);
      item.resolve();
    } catch (error) {
      item.reject(error as Error);
    }
  }
  isPlaying = false;
}

// Original playAudio renamed to internal
async function playAudioInternal(audioBuffer: ArrayBuffer): Promise<void> {
  const tempFile = `/tmp/voice-${Date.now()}.mp3`;
  await Bun.write(tempFile, audioBuffer);
  const volume = getVolumeSetting();

  return new Promise((resolve, reject) => {
    let player: string;
    let args: string[];

    if (process.platform === 'darwin') {
      player = '/usr/bin/afplay';
      args = ['-v', volume.toString(), tempFile];
    } else {
      if (existsSync('/usr/bin/mpg123')) {
        player = '/usr/bin/mpg123';
        args = ['-q', tempFile];
      } else if (existsSync('/usr/bin/mpv')) {
        player = '/usr/bin/mpv';
        args = ['--no-terminal', '--volume=' + (volume * 100), tempFile];
      } else if (existsSync('/snap/bin/mpv')) {
        player = '/snap/bin/mpv';
        args = ['--no-terminal', '--volume=' + (volume * 100), tempFile];
      } else {
        console.warn('⚠️  No audio player found. Install mpg123 or mpv for audio playback.');
        spawn('/bin/rm', [tempFile]);
        resolve();
        return;
      }
    }

    const proc = spawn(player, args);

    proc.on('error', (error) => {
      console.error('Error playing audio:', error);
      spawn('/bin/rm', [tempFile]);
      reject(error);
    });

    proc.on('exit', (code) => {
      spawn('/bin/rm', [tempFile]);
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`${player} exited with code ${code}`));
      }
    });
  });
}

// macOS Say playback — queued like other audio to prevent overlap
async function playMacOSSay(text: string, voice: string = 'Samantha', rate: number = 1.0): Promise<void> {
  return new Promise((resolve, reject) => {
    // Convert rate: say uses words-per-minute (default ~175), our rate is a multiplier
    const wpm = Math.round(175 * rate);
    const volume = getVolumeSetting();

    // say command: -v voice -r rate
    const args = ['-v', voice, '-r', wpm.toString(), text];

    console.log(`🍎 macOS Say: voice=${voice}, rate=${wpm}wpm`);

    const proc = spawn('/usr/bin/say', args);

    proc.on('error', (error) => {
      console.error('macOS Say error:', error);
      reject(error);
    });

    proc.on('exit', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`say exited with code ${code}`));
      }
    });
  });
}

// Rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

// Start HTTP server
const server = serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const clientIp = req.headers.get('x-forwarded-for') || 'localhost';

    const corsHeaders = {
      "Access-Control-Allow-Origin": "http://localhost",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ status: "error", message: "Rate limit exceeded" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Main notification endpoint
    if (url.pathname === "/notify" && req.method === "POST") {
      try {
        const data = await req.json();
        const title = data.title || "PAI Notification";
        const message = data.message || "Task completed";
        const voiceEnabled = data.voice_enabled !== false;
        const voiceId = data.voice_id || data.voice_name || null;

        if (voiceId && typeof voiceId !== 'string') {
          throw new Error('Invalid voice_id');
        }

        console.log(`📨 Notification: "${title}" - "${message.substring(0, 50)}..."`);

        await sendNotification(title, message, voiceEnabled, voiceId);

        return new Response(
          JSON.stringify({ status: "success", message: "Notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error: any) {
        console.error("Notification error:", error);
        return new Response(
          JSON.stringify({ status: "error", message: error.message || "Internal server error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: error.message?.includes('Invalid') ? 400 : 500 }
        );
      }
    }

    // Health check endpoint
    if (url.pathname === "/health") {
      const googleInfo = TTS_PROVIDER === 'google' ? {
        configured: !!GOOGLE_API_KEY,
        tier: GOOGLE_TTS_TIER,
        model: CURRENT_TIER.name,
        cost: CURRENT_TIER.cost,
        voice: GOOGLE_TTS_VOICE
      } : { configured: !!GOOGLE_API_KEY, voice: GOOGLE_TTS_VOICE };

      return new Response(
        JSON.stringify({
          status: "healthy",
          port: PORT,
          platform: process.platform,
          tts_provider: TTS_PROVIDER === 'google' ? `Google Cloud TTS (${CURRENT_TIER.name})` : TTS_PROVIDER === 'macos' ? 'macOS Say (built-in)' : 'ElevenLabs',
          tier: TTS_PROVIDER === 'google' ? GOOGLE_TTS_TIER : null,
          default_voice: DEFAULT_VOICE_ID,
          api_key_configured: TTS_PROVIDER === 'google' ? !!GOOGLE_API_KEY : !!ELEVENLABS_API_KEY,
          audio_queue: {
            length: audioQueue.length,
            is_playing: isPlaying
          },
          providers: {
            active: TTS_PROVIDER,
            google: googleInfo,
            elevenlabs: { configured: !!ELEVENLABS_API_KEY, voice: DEFAULT_ELEVENLABS_VOICE },
            macos: { available: process.platform === 'darwin', voice: 'Samantha' }
          },
          named_agents: ['pai', 'intern', 'engineer', 'architect']
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response("PAI Voice Server - POST to /notify", {
      headers: corsHeaders,
      status: 200
    });
  },
});

// Startup logs
console.log(`🚀 Voice Server running on port ${PORT}`);
console.log(`🖥️  Platform: ${process.platform}`);
if (TTS_PROVIDER === 'google') {
  console.log(`🎙️  TTS Provider: Google Cloud TTS (${CURRENT_TIER.name})`);
  console.log(`📊 Tier: ${GOOGLE_TTS_TIER.toUpperCase()} - ${CURRENT_TIER.cost}`);
  console.log(`🗣️  Default voice: ${DEFAULT_VOICE_ID}`);
  console.log(`🔑 Google API Key: ${GOOGLE_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`🎯 Features: ${CURRENT_TIER.features.join(', ')}`);
  console.log(`💡 Switch tier: GOOGLE_TTS_TIER=premium or GOOGLE_TTS_TIER=standard in .env`);
} else if (TTS_PROVIDER === 'macos') {
  console.log(`🎙️  TTS Provider: macOS Say (built-in, free, offline)`);
  console.log(`🗣️  Default voice: Samantha`);
  console.log(`💰 Cost: FREE (no API key needed)`);
  console.log(`💡 Switch to cloud TTS: Set TTS_PROVIDER=google or TTS_PROVIDER=elevenlabs in .env`);
} else {
  console.log(`🎙️  TTS Provider: ElevenLabs`);
  console.log(`🗣️  Default voice: ${DEFAULT_VOICE_ID}`);
  console.log(`🔑 ElevenLabs API Key: ${ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  console.log(`💰 Cost: ~$0.30/1k chars (10k chars/month FREE)`);
}
console.log(`📡 POST to http://localhost:${PORT}/notify`);
console.log(`🔒 Security: CORS restricted to localhost, rate limiting enabled`);
