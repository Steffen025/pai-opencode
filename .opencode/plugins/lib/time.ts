/**
 * PAI-OpenCode Time Utilities
 *
 * Time formatting functions for consistent timestamps across handlers.
 * Ported from PAI v2.5 hooks/lib/time.ts
 *
 * @module time
 */

/**
 * Get ISO timestamp (UTC)
 * Format: 2026-02-02T14:30:00.000Z
 */
export function getISOTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get PST/PDT timestamp
 * Format: 2026-02-02T06:30:00-08:00
 */
export function getPSTTimestamp(): string {
  const now = new Date();
  return now.toLocaleString('sv-SE', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(' ', 'T');
}

/**
 * Get PST/PDT date only
 * Format: 2026-02-02
 */
export function getPSTDate(): string {
  return getPSTTimestamp().slice(0, 10);
}

/**
 * Get year-month string
 * Format: 2026-02
 */
export function getYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get date string (YYYY-MM-DD)
 */
export function getDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get timestamp for filenames (no special chars)
 * Format: 2026-02-02-143000
 */
export function getFilenameTimestamp(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19).replace(/:/g, '');
  return `${date}-${time}`;
}

/**
 * Get human-readable duration from milliseconds
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  return 'just now';
}
