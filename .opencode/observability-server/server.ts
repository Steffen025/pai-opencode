#!/usr/bin/env bun
/**
 * Observability Server for PAI-OpenCode
 * 
 * Real-time monitoring dashboard with event capture, SQLite persistence,
 * and SSE streaming for live updates.
 * 
 * Port: 8889 (configurable via PAI_OBSERVABILITY_PORT)
 * 
 * @module observability-server
 * @version 1.0.0
 */

import { serve } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

import {
  initDatabase,
  insertEvent,
  queryEvents,
  getEvent,
  querySessions,
  getSession,
  completeSession,
  getStats,
  cleanupOldEvents,
  getDatabasePath,
  type ObservabilityEvent,
  type EventQuery,
  type SessionQuery,
} from "./db";

// Configuration
const PORT = parseInt(process.env.PAI_OBSERVABILITY_PORT || "8889");
const ENABLED = process.env.PAI_OBSERVABILITY_ENABLED !== "false";

// CORS headers for local development
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// SSE clients for real-time streaming
const sseClients = new Set<ReadableStreamDefaultController>();

/**
 * Broadcast event to all SSE clients
 */
function broadcastToSSE(event: ObservabilityEvent): void {
  const data = JSON.stringify(event);
  const message = `data: ${data}\n\n`;
  
  for (const client of sseClients) {
    try {
      client.enqueue(new TextEncoder().encode(message));
    } catch {
      // Client disconnected, will be cleaned up
      sseClients.delete(client);
    }
  }
}

/**
 * Create SSE response stream
 */
function createSSEStream(): Response {
  const stream = new ReadableStream({
    start(controller) {
      sseClients.add(controller);
      
      // Send initial heartbeat
      controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
      
      // Setup heartbeat interval
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          sseClients.delete(controller);
        }
      }, 30000);
    },
    cancel(controller) {
      sseClients.delete(controller);
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Parse URL search params to query object
 */
function parseEventQuery(url: URL): EventQuery {
  return {
    type: url.searchParams.get("type") || undefined,
    session_id: url.searchParams.get("session_id") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    limit: url.searchParams.has("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
    offset: url.searchParams.has("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
  };
}

/**
 * Parse session query params
 */
function parseSessionQuery(url: URL): SessionQuery {
  const status = url.searchParams.get("status");
  return {
    status: status === 'active' || status === 'completed' || status === 'error' ? status : undefined,
    limit: url.searchParams.has("limit") ? parseInt(url.searchParams.get("limit")!) : undefined,
    offset: url.searchParams.has("offset") ? parseInt(url.searchParams.get("offset")!) : undefined,
  };
}

/**
 * JSON response helper
 */
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Main request handler
 */
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // =========================================================================
  // Health Check
  // =========================================================================
  if (path === "/health" && method === "GET") {
    return jsonResponse({
      status: "healthy",
      version: "1.0.0",
      port: PORT,
      database: getDatabasePath(),
      sse_clients: sseClients.size,
      timestamp: new Date().toISOString(),
    });
  }

  // =========================================================================
  // Event Ingestion (POST /events)
  // =========================================================================
  if (path === "/events" && method === "POST") {
    try {
      const event = await req.json() as ObservabilityEvent;
      
      // Validate required fields
      if (!event.id || !event.timestamp || !event.session_id || !event.event_type) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      // Insert into database
      insertEvent(event);
      
      // Broadcast to SSE clients
      broadcastToSSE(event);
      
      return jsonResponse({ status: "ok", id: event.id }, 201);
    } catch (error: any) {
      console.error("Event ingestion error:", error);
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // =========================================================================
  // Event Queries (GET /api/events)
  // =========================================================================
  if (path === "/api/events" && method === "GET") {
    try {
      const query = parseEventQuery(url);
      const events = queryEvents(query);
      return jsonResponse({ events, count: events.length });
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // Single event by ID
  if (path.startsWith("/api/events/") && method === "GET") {
    const id = path.replace("/api/events/", "");
    
    // SSE Stream
    if (id === "stream") {
      return createSSEStream();
    }
    
    const event = getEvent(id);
    if (!event) {
      return jsonResponse({ error: "Event not found" }, 404);
    }
    return jsonResponse(event);
  }

  // =========================================================================
  // Session Queries (GET /api/sessions)
  // =========================================================================
  if (path === "/api/sessions" && method === "GET") {
    try {
      const query = parseSessionQuery(url);
      const sessions = querySessions(query);
      return jsonResponse({ sessions, count: sessions.length });
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // Single session by ID
  if (path.startsWith("/api/sessions/") && method === "GET") {
    const id = path.replace("/api/sessions/", "");
    const session = getSession(id);
    if (!session) {
      return jsonResponse({ error: "Session not found" }, 404);
    }
    
    // Include events for this session
    const events = queryEvents({ session_id: id, limit: 1000 });
    return jsonResponse({ ...session, events });
  }

  // =========================================================================
  // Statistics (GET /api/stats)
  // =========================================================================
  if (path === "/api/stats" && method === "GET") {
    try {
      const stats = getStats();
      return jsonResponse(stats);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // =========================================================================
  // Cleanup Endpoint (POST /api/cleanup)
  // =========================================================================
  if (path === "/api/cleanup" && method === "POST") {
    try {
      const deleted = cleanupOldEvents();
      return jsonResponse({ status: "ok", deleted_events: deleted });
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 500);
    }
  }

  // =========================================================================
  // Dashboard (GET /)
  // =========================================================================
  if (path === "/" && method === "GET") {
    // For now, return a simple status page
    // Vue dashboard will be added in Phase 3
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>PAI-OpenCode Observability</title>
  <style>
    body { font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #0d1117; color: #c9d1d9; }
    h1 { color: #58a6ff; }
    .card { background: #161b22; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #30363d; }
    .stat { display: inline-block; margin-right: 30px; }
    .stat-value { font-size: 32px; font-weight: bold; color: #58a6ff; }
    .stat-label { color: #8b949e; font-size: 14px; }
    pre { background: #0d1117; padding: 15px; border-radius: 6px; overflow-x: auto; }
    a { color: #58a6ff; }
  </style>
</head>
<body>
  <h1>🔭 PAI-OpenCode Observability</h1>
  <div class="card">
    <h2>Server Status</h2>
    <div class="stat">
      <div class="stat-value">✓</div>
      <div class="stat-label">Status</div>
    </div>
    <div class="stat">
      <div class="stat-value">${PORT}</div>
      <div class="stat-label">Port</div>
    </div>
    <div class="stat">
      <div class="stat-value">${sseClients.size}</div>
      <div class="stat-label">SSE Clients</div>
    </div>
  </div>
  
  <div class="card">
    <h2>API Endpoints</h2>
    <ul>
      <li><a href="/health">/health</a> - Health check</li>
      <li><a href="/api/stats">/api/stats</a> - Statistics</li>
      <li><a href="/api/events">/api/events</a> - Query events</li>
      <li><a href="/api/sessions">/api/sessions</a> - Query sessions</li>
      <li><code>POST /events</code> - Ingest events</li>
      <li><a href="/api/events/stream">/api/events/stream</a> - SSE real-time stream</li>
    </ul>
  </div>
  
  <div class="card">
    <h2>Live Event Stream</h2>
    <pre id="events">Connecting...</pre>
    <script>
      const eventsEl = document.getElementById('events');
      const events = [];
      const es = new EventSource('/api/events/stream');
      es.onmessage = (e) => {
        if (e.data) {
          try {
            const event = JSON.parse(e.data);
            events.unshift(\`[\${event.timestamp}] \${event.event_type}: \${JSON.stringify(event.data).substring(0, 80)}...\`);
            if (events.length > 20) events.pop();
            eventsEl.textContent = events.join('\\n');
          } catch {}
        }
      };
      es.onerror = () => { eventsEl.textContent = 'Connection lost. Reconnecting...'; };
      es.onopen = () => { eventsEl.textContent = 'Connected. Waiting for events...'; };
    </script>
  </div>
  
  <p style="color: #8b949e; font-size: 12px;">
    PAI-OpenCode Observability Server v1.0.0 | 
    <a href="https://github.com/Steffen025/pai-opencode">GitHub</a>
  </p>
</body>
</html>`;
    
    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }

  // 404 for unmatched routes
  return jsonResponse({ error: "Not found" }, 404);
}

// =========================================================================
// Server Startup
// =========================================================================

if (!ENABLED) {
  console.log("⏸️  Observability server disabled (PAI_OBSERVABILITY_ENABLED=false)");
  process.exit(0);
}

// Initialize database
initDatabase();

// Schedule cleanup (run daily)
setInterval(() => {
  const deleted = cleanupOldEvents();
  if (deleted > 0) {
    console.log(`🧹 Cleanup: removed ${deleted} old events`);
  }
}, 24 * 60 * 60 * 1000);

// Start server
const server = serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`🔭 Observability Server running on http://localhost:${PORT}`);
console.log(`📊 Database: ${getDatabasePath()}`);
console.log(`📡 SSE stream: http://localhost:${PORT}/api/events/stream`);
console.log(`🏥 Health check: http://localhost:${PORT}/health`);
