#!/usr/bin/env bun

/**
 * GetTranscript.ts - Extract transcript from YouTube video
 *
 * Usage:
 *   bun ~/.opencode/skills/Videotranscript/Tools/GetTranscript.ts <youtube-url>
 *   bun ~/.opencode/skills/Videotranscript/Tools/GetTranscript.ts <youtube-url> --save <output-file>
 *
 * Examples:
 *   bun ~/.opencode/skills/Videotranscript/Tools/GetTranscript.ts "https://www.youtube.com/watch?v=A1b2C3d4E5F"
 *   bun ~/.opencode/skills/Videotranscript/Tools/GetTranscript.ts "https://youtu.be/A1b2C3d4E5F" --save transcript.txt
 *
 * @author PAI System
 * @version 1.0.0
 */

import { execFileSync } from 'child_process';
import { writeFileSync } from 'fs';

// Allowed YouTube domains
const ALLOWED_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be'];

/**
 * Validate and sanitize YouTube URL
 * Returns video ID if valid, null if invalid
 */
function validateYouTubeUrl(url: string): { isValid: boolean; videoId?: string; error?: string } {
  try {
    const parsedUrl = new URL(url);
    
    // Check if host is in allowlist
    if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
      return { isValid: false, error: `Invalid host: ${parsedUrl.hostname}` };
    }
    
    // Extract video ID
    let videoId: string | null = null;
    
    if (parsedUrl.hostname === 'youtu.be') {
      // Short URL format: youtu.be/VIDEO_ID
      videoId = parsedUrl.pathname.slice(1); // Remove leading /
    } else if (parsedUrl.pathname.startsWith('/shorts/')) {
      // Shorts format: youtube.com/shorts/VIDEO_ID
      videoId = parsedUrl.pathname.split('/shorts/')[1]?.split('/')[0]; // Get ID after /shorts/
    } else {
      // Standard format: youtube.com/watch?v=VIDEO_ID
      videoId = parsedUrl.searchParams.get('v');
    }
    
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return { isValid: false, error: 'Invalid or missing video ID' };
    }
    
    return { isValid: true, videoId };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

const HELP = `
GetTranscript - Extract transcript from YouTube video using fabric

Usage:
  bun GetTranscript.ts <youtube-url> [options]

Options:
  --save <file>    Save transcript to file
  --help           Show this help message

Examples:
  bun GetTranscript.ts "https://www.youtube.com/watch?v=abc123"
  bun GetTranscript.ts "https://youtu.be/xyz789" --save ~/transcript.txt

Supported URL formats:
  - https://www.youtube.com/watch?v=VIDEO_ID
  - https://youtu.be/VIDEO_ID
  - https://www.youtube.com/watch?v=VIDEO_ID&t=123
  - https://youtube.com/shorts/VIDEO_ID
`;

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(HELP);
  process.exit(0);
}

// Find URL (first arg that looks like a URL)
const urlArg = args.find(arg => arg.includes('youtube.com') || arg.includes('youtu.be'));

if (!urlArg) {
  console.error('❌ Error: No YouTube URL provided');
  console.log('\nUsage: bun GetTranscript.ts <youtube-url>');
  process.exit(1);
}

// Validate URL before processing
const validation = validateYouTubeUrl(urlArg);
if (!validation.isValid || !validation.videoId) {
  console.error(`❌ Error: ${validation.error || 'Invalid YouTube URL'}`);
  console.log('\nUsage: bun GetTranscript.ts <youtube-url>');
  process.exit(1);
}

// Reconstruct clean URL for fabric
const cleanUrl = `https://www.youtube.com/watch?v=${validation.videoId}`;

// Check for --save option with validation
const saveIndex = args.indexOf('--save');
let outputFile: string | null = null;

if (saveIndex !== -1) {
  // Validate that --save has a following non-flag argument
  if (saveIndex + 1 >= args.length || args[saveIndex + 1].startsWith('-')) {
    console.error('❌ Error: Missing file path after --save');
    console.error('   Usage: bun GetTranscript.ts <youtube-url> --save <output-file>');
    process.exit(1);
  }
  outputFile = args[saveIndex + 1];
}

// Extract transcript using fabric with safe args array
console.log(`📺 Extracting transcript from: ${cleanUrl}`);

try {
  // Use execFileSync with array args to prevent shell injection
  const transcript = execFileSync('fabric', ['-y', cleanUrl], {
    encoding: 'utf-8',
    timeout: 120000, // 2 minute timeout
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer for long transcripts
  });

  if (!transcript.trim()) {
    console.error('⚠️ No transcript available for this video');
    process.exit(1);
  }

  console.log(`✅ Transcript extracted: ${transcript.length} characters\n`);

  if (outputFile) {
    writeFileSync(outputFile, transcript, 'utf-8');
    console.log(`💾 Saved to: ${outputFile}`);
  } else {
    console.log('--- TRANSCRIPT START ---\n');
    console.log(transcript);
    console.log('\n--- TRANSCRIPT END ---');
  }

} catch (error: any) {
  if (error.status === 1) {
    console.error('❌ Failed to extract transcript');
    console.error('Possible reasons:');
    console.error('  - Video has no captions/transcript');
    console.error('  - Video is private or restricted');
    console.error('  - Invalid URL');
  } else {
    console.error('❌ Error:', error.message);
  }
  process.exit(1);
}
