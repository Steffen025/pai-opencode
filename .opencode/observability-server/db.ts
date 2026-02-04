/**
 * SQLite Database Module for Observability Server
 * 
 * Handles event and session persistence using Bun's native SQLite.
 * 
 * @module observability-server/db
 * @version 1.0.0
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

// Database path - configurable via environment
const openCodeDir = process.env.OPENCODE_DIR || join(homedir(), '.opencode');
const DEFAULT_DB_PATH = join(openCodeDir, 'observability-server', 'data', 'events.db');
const DB_PATH = process.env.PAI_OBSERVABILITY_DB_PATH || DEFAULT_DB_PATH;

// Retention period in days
const RETENTION_DAYS = parseInt(process.env.PAI_OBSERVABILITY_RETENTION_DAYS || "30");

let db: Database | null = null;

/**
 * Event record structure
 */
export interface ObservabilityEvent {
  id: string;
  timestamp: string;
  session_id: string;
  event_type: string;
  data: Record<string, any>;
}

/**
 * Session record structure
 */
export interface SessionRecord {
  id: string;
  started_at: string;
  ended_at: string | null;
  event_count: number;
  tool_count: number;
  rating_avg: number | null;
  status: 'active' | 'completed' | 'error';
}

/**
 * Initialize database with schema
 */
export function initDatabase(): Database {
  if (db) return db;

  // Ensure data directory exists
  const dataDir = dirname(DB_PATH);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  
  // Enable WAL mode for better concurrent access
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");

  // Create events table
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      event_count INTEGER DEFAULT 0,
      tool_count INTEGER DEFAULT 0,
      rating_avg REAL,
      status TEXT DEFAULT 'active'
    )
  `);

  // Create indexes for common queries
  db.run("CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)");
  db.run("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)");
  db.run("CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)");

  console.log(`📊 Database initialized: ${DB_PATH}`);
  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Insert a new event
 */
export function insertEvent(event: ObservabilityEvent): void {
  const database = getDatabase();
  
  const stmt = database.prepare(`
    INSERT INTO events (id, timestamp, session_id, event_type, data)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    event.id,
    event.timestamp,
    event.session_id,
    event.event_type,
    JSON.stringify(event.data)
  );

  // Update session event count
  updateSessionEventCount(event.session_id, event.event_type);
}

/**
 * Update session event count
 */
function updateSessionEventCount(sessionId: string, eventType: string): void {
  const database = getDatabase();
  
  // Upsert session
  database.run(`
    INSERT INTO sessions (id, started_at, event_count, tool_count)
    VALUES (?, datetime('now'), 1, ?)
    ON CONFLICT(id) DO UPDATE SET
      event_count = event_count + 1,
      tool_count = tool_count + ?
  `, [
    sessionId,
    eventType.startsWith('tool.') ? 1 : 0,
    eventType.startsWith('tool.') ? 1 : 0
  ]);
}

/**
 * Query events with filters
 */
export interface EventQuery {
  type?: string;
  session_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function queryEvents(query: EventQuery = {}): ObservabilityEvent[] {
  const database = getDatabase();
  
  let sql = "SELECT * FROM events WHERE 1=1";
  const params: any[] = [];

  if (query.type) {
    sql += " AND event_type = ?";
    params.push(query.type);
  }

  if (query.session_id) {
    sql += " AND session_id = ?";
    params.push(query.session_id);
  }

  if (query.from) {
    sql += " AND timestamp >= ?";
    params.push(query.from);
  }

  if (query.to) {
    sql += " AND timestamp <= ?";
    params.push(query.to);
  }

  sql += " ORDER BY timestamp DESC";
  sql += ` LIMIT ? OFFSET ?`;
  params.push(query.limit || 100);
  params.push(query.offset || 0);

  const stmt = database.prepare(sql);
  const rows = stmt.all(...params) as any[];

  return rows.map(row => ({
    ...row,
    data: JSON.parse(row.data)
  }));
}

/**
 * Get a single event by ID
 */
export function getEvent(id: string): ObservabilityEvent | null {
  const database = getDatabase();
  const stmt = database.prepare("SELECT * FROM events WHERE id = ?");
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    ...row,
    data: JSON.parse(row.data)
  };
}

/**
 * Query sessions with filters
 */
export interface SessionQuery {
  status?: 'active' | 'completed' | 'error';
  limit?: number;
  offset?: number;
}

export function querySessions(query: SessionQuery = {}): SessionRecord[] {
  const database = getDatabase();
  
  let sql = "SELECT * FROM sessions WHERE 1=1";
  const params: any[] = [];

  if (query.status) {
    sql += " AND status = ?";
    params.push(query.status);
  }

  sql += " ORDER BY started_at DESC";
  sql += ` LIMIT ? OFFSET ?`;
  params.push(query.limit || 50);
  params.push(query.offset || 0);

  const stmt = database.prepare(sql);
  return stmt.all(...params) as SessionRecord[];
}

/**
 * Get a single session by ID
 */
export function getSession(id: string): SessionRecord | null {
  const database = getDatabase();
  const stmt = database.prepare("SELECT * FROM sessions WHERE id = ?");
  return stmt.get(id) as SessionRecord | null;
}

/**
 * Update session status and end time
 */
export function completeSession(sessionId: string, status: 'completed' | 'error' = 'completed'): void {
  const database = getDatabase();
  
  database.run(`
    UPDATE sessions 
    SET ended_at = datetime('now'), status = ?
    WHERE id = ?
  `, [status, sessionId]);
}

/**
 * Update session rating average
 */
export function updateSessionRating(sessionId: string, rating: number): void {
  const database = getDatabase();
  
  // Calculate running average
  database.run(`
    UPDATE sessions 
    SET rating_avg = COALESCE(
      (rating_avg * (event_count - 1) + ?) / event_count,
      ?
    )
    WHERE id = ?
  `, [rating, rating, sessionId]);
}

/**
 * Get aggregated statistics
 */
export interface ObservabilityStats {
  total_events: number;
  total_sessions: number;
  active_sessions: number;
  events_today: number;
  tools_today: number;
  avg_rating: number | null;
  security_blocks: number;
  event_types: Record<string, number>;
}

export function getStats(): ObservabilityStats {
  const database = getDatabase();
  
  const today = new Date().toISOString().split('T')[0];
  
  const totalEvents = (database.prepare("SELECT COUNT(*) as count FROM events").get() as any).count;
  const totalSessions = (database.prepare("SELECT COUNT(*) as count FROM sessions").get() as any).count;
  const activeSessions = (database.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'active'").get() as any).count;
  const eventsToday = (database.prepare("SELECT COUNT(*) as count FROM events WHERE timestamp >= ?").get(today) as any).count;
  const toolsToday = (database.prepare("SELECT COUNT(*) as count FROM events WHERE timestamp >= ? AND event_type LIKE 'tool.%'").get(today) as any).count;
  const avgRating = (database.prepare("SELECT AVG(rating_avg) as avg FROM sessions WHERE rating_avg IS NOT NULL").get() as any).avg;
  const securityBlocks = (database.prepare("SELECT COUNT(*) as count FROM events WHERE event_type = 'security.block'").get() as any).count;
  
  // Event type distribution
  const typeRows = database.prepare(`
    SELECT event_type, COUNT(*) as count 
    FROM events 
    GROUP BY event_type
  `).all() as any[];
  
  const eventTypes: Record<string, number> = {};
  for (const row of typeRows) {
    eventTypes[row.event_type] = row.count;
  }

  return {
    total_events: totalEvents,
    total_sessions: totalSessions,
    active_sessions: activeSessions,
    events_today: eventsToday,
    tools_today: toolsToday,
    avg_rating: avgRating,
    security_blocks: securityBlocks,
    event_types: eventTypes
  };
}

/**
 * Clean up old events based on retention policy
 */
export function cleanupOldEvents(): number {
  const database = getDatabase();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  const cutoff = cutoffDate.toISOString();

  const result = database.run(
    "DELETE FROM events WHERE timestamp < ?",
    [cutoff]
  );

  // Also clean up old completed sessions
  database.run(
    "DELETE FROM sessions WHERE ended_at IS NOT NULL AND ended_at < ?",
    [cutoff]
  );

  return result.changes;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Get database path (for health checks)
 */
export function getDatabasePath(): string {
  return DB_PATH;
}
