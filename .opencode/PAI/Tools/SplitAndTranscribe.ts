#!/usr/bin/env bun

/**
 * split-and-transcribe.ts
 *
 * Helper to split large audio files and transcribe them
 */

import { spawn } from "child_process";
import { mkdirSync, rmSync, readdirSync, statSync } from "fs";
import { join, basename, extname } from "path";
import OpenAI from "openai";
import { createReadStream } from "fs";
import { writeFile } from "fs/promises";

interface ChunkInfo {
  path: string;
  index: number;
}

/**
 * Convert SRT/VTT timestamp string to total seconds.
 * Supports "HH:MM:SS,mmm" (SRT) and "HH:MM:SS.mmm" (VTT).
 */
function srtTimeToSeconds(ts: string): number {
  const [hhmmss, ms = "0"] = ts.replace(",", ".").split(".");
  const parts = hhmmss.split(":").map(Number);
  const [hh, mm, ss] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  return hh * 3600 + mm * 60 + ss + Number(ms) / 1000;
}

/**
 * Convert total seconds back to SRT timestamp "HH:MM:SS,mmm".
 */
function secondsToSrtTime(totalSeconds: number): string {
  const ms = Math.round((totalSeconds % 1) * 1000);
  const s = Math.floor(totalSeconds) % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/**
 * Shift all SRT timestamps in a transcript by offsetSeconds.
 * Renumbers subtitle blocks sequentially starting from startIndex.
 */
function shiftSrtTimestamps(srtContent: string, offsetSeconds: number, startIndex: number): { shifted: string; blockCount: number } {
  // SRT timestamp line pattern: "HH:MM:SS,mmm --> HH:MM:SS,mmm"
  const tsPattern = /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/g;
  let blockCount = 0;
  const shifted = srtContent
    .replace(/^\d+$/gm, () => String(startIndex + blockCount++)) // renumber blocks
    .replace(tsPattern, (_match, start, end) => {
      const newStart = secondsToSrtTime(srtTimeToSeconds(start) + offsetSeconds);
      const newEnd = secondsToSrtTime(srtTimeToSeconds(end) + offsetSeconds);
      return `${newStart} --> ${newEnd}`;
    });
  return { shifted, blockCount };
}

/**
 * Split audio file into chunks using FFmpeg
 */
async function splitAudioFile(
  filePath: string,
  chunkSizeMB: number = 20
): Promise<{chunks: ChunkInfo[], tempDir: string, chunkMinutes: number}> {
  const tempDir = `/tmp/transcript-${Date.now()}`;
  mkdirSync(tempDir, { recursive: true });

  const ext = extname(filePath);
  const chunkPattern = join(tempDir, `chunk_%03d${ext}`);

  // Calculate chunk duration (assuming ~1MB per minute for audio)
  const chunkMinutes = chunkSizeMB;

  console.log(`Splitting file into ~${chunkSizeMB}MB chunks...`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-i",
      filePath,
      "-f",
      "segment",
      "-segment_time",
      `${chunkMinutes * 60}`, // Convert to seconds
      "-c",
      "copy",
      chunkPattern,
    ]);

    ffmpeg.stderr.on("data", (data) => {
      // FFmpeg outputs to stderr, filter for progress
      const output = data.toString();
      if (output.includes("time=")) {
        process.stdout.write(".");
      }
    });

    ffmpeg.on("close", (code) => {
      console.log(""); // New line after dots
      if (code !== 0) {
        reject(new Error(`FFmpeg exited with code ${code}`));
        return;
      }

      // Get all chunk files
      const files = readdirSync(tempDir).filter((f) =>
        f.startsWith("chunk_")
      );
      files.sort();

      const chunks: ChunkInfo[] = files.map((file, index) => ({
        path: join(tempDir, file),
        index: index + 1,
      }));

      console.log(`✓ Split into ${chunks.length} chunks`);
      resolve({ chunks, tempDir, chunkMinutes });
    });

    ffmpeg.on("error", reject);
  });
}

/**
 * Transcribe a single chunk
 */
async function transcribeChunk(
  chunk: ChunkInfo,
  openai: OpenAI,
  format: string
): Promise<string> {
  const fileStream = createReadStream(chunk.path) as any;

  const transcription = await openai.audio.transcriptions.create({
    file: fileStream,
    model: "whisper-1",
    response_format: format === "txt" ? "text" : (format as any),
    language: "en",
  });

  return typeof transcription === "string"
    ? transcription
    : JSON.stringify(transcription, null, 2);
}

/**
 * Main function for split and transcribe
 */
export async function splitAndTranscribe(
  filePath: string,
  apiKey: string,
  format: string = "txt"
): Promise<string> {
  const openai = new OpenAI({ apiKey });

  const fileSizeMB = statSync(filePath).size / (1024 * 1024);

  console.log(`File size: ${fileSizeMB.toFixed(2)} MB (exceeds 25MB limit)`);
  console.log("Splitting file for transcription...");

  // Split file into 20MB chunks (safe margin under 25MB)
  const { chunks, tempDir, chunkMinutes } = await splitAudioFile(filePath, 20);

  try {
    const transcripts: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkSizeMB = statSync(chunk.path).size / (1024 * 1024);

      console.log(
        `\nTranscribing chunk ${chunk.index}/${chunks.length} (${chunkSizeMB.toFixed(2)} MB)...`
      );

      const transcript = await transcribeChunk(chunk, openai, format);
      transcripts.push(transcript);

      console.log(`✓ Chunk ${chunk.index} complete`);
    }

    console.log("\n✓ All chunks transcribed");

    // Merge transcripts
    const CHUNK_DURATION_SECONDS = chunkMinutes * 60;
    let merged: string;
    if (format === "txt") {
      merged = transcripts.join("\n\n");
    } else if (format === "json") {
      // Each chunk returns a transcription object — collect into a JSON array
      try {
        const parsed = transcripts.map(t => JSON.parse(t));
        merged = JSON.stringify(parsed, null, 2);
      } catch {
        // Fall back to newline-joined raw strings if parsing fails
        merged = transcripts.join("\n");
      }
    } else {
      // SRT/VTT: shift timestamps by chunk offset so all blocks have correct absolute times
      let totalBlocks = 0;
      const shiftedChunks: string[] = [];
      for (let i = 0; i < transcripts.length; i++) {
        const offsetSeconds = i * CHUNK_DURATION_SECONDS;
        const { shifted, blockCount } = shiftSrtTimestamps(transcripts[i], offsetSeconds, totalBlocks + 1);
        shiftedChunks.push(shifted.trim());
        totalBlocks += blockCount;
      }
      merged = shiftedChunks.join("\n\n");
    }

    return merged;
  } finally {
    // Cleanup temp directory
    rmSync(tempDir, { recursive: true, force: true });
    console.log("✓ Cleaned up temporary files");
  }
}

// CLI usage
if (import.meta.main) {
  const filePath = process.argv[2];
  const format = process.argv[3] || "txt";

  if (!filePath) {
    console.error("Usage: bun split-and-transcribe.ts <file> [format]");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not set");
    process.exit(1);
  }

  splitAndTranscribe(filePath, process.env.OPENAI_API_KEY, format)
    .then((transcript) => {
      console.log("\nFinal transcript:\n");
      console.log(transcript);
    })
    .catch((error) => {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    });
}
