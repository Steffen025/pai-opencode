/**
 * PAI Installer v4.0 — Web Server
 * Bun HTTP + WebSocket server for the thick-client web installer.
 * Serves static files and handles WebSocket communication.
 */

// Prevent unhandled errors from crashing silently — log then exit cleanly
process.on("uncaughtException", (err) => {
  console.error("[PAI Installer] Uncaught exception:", err.message);
  process.exit(1);
});
process.on("unhandledRejection", (err: any) => {
  console.error("[PAI Installer] Unhandled rejection:", err?.message || err);
  process.exit(1);
});

import { resolve, relative, join, extname } from "path";
import { handleWsMessage, addClient, removeClient } from "./routes";

const _rawPort = parseInt(process.env.PAI_INSTALL_PORT ?? "", 10);
const PORT = Number.isInteger(_rawPort) && _rawPort >= 1 && _rawPort <= 65535
  ? _rawPort
  : (() => {
      if (process.env.PAI_INSTALL_PORT !== undefined) {
        console.warn(`[PAI Installer] Invalid PAI_INSTALL_PORT "${process.env.PAI_INSTALL_PORT}", falling back to 1337`);
      }
      return 1337;
    })();
const PUBLIC_DIR = join(import.meta.dir, "..", "public");

// ─── MIME Types ──────────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

// ─── Inactivity Timeout ──────────────────────────────────────────

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes
let inactivityTimer: Timer | null = null;

function resetInactivity(): void {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    console.log("\n[PAI Installer] Shutting down due to inactivity.");
    process.exit(0);
  }, INACTIVITY_MS);
}

// ─── Server ──────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  hostname: "127.0.0.1", // Localhost only — never expose to network

  async fetch(req, server) {
    resetInactivity();

    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const origin = req.headers.get("origin");
      const allowedOrigins = [
        `http://127.0.0.1:${PORT}`,
        `http://localhost:${PORT}`,
      ];
      if (!origin || !allowedOrigins.includes(origin)) {
        return new Response("Forbidden", { status: 403 });
      }
      const upgraded = server.upgrade(req);
      if (!upgraded) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return undefined as any;
    }

    // Static file serving
    const requestedPath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const fullPath = resolve(PUBLIC_DIR, requestedPath);

    // Security: prevent directory traversal using resolve + relative
    const rel = relative(PUBLIC_DIR, fullPath);
    if (rel.startsWith("..") || rel === "..") {
      return new Response("Forbidden", { status: 403 });
    }

    // Async file serving using Bun-native APIs
    const file = Bun.file(fullPath);
    if (await file.exists()) {
      // Don't serve directories (check via size - directories have size 0 in Bun)
      const stat = await file.stat();
      if (stat && stat.isDirectory()) {
        return new Response("Not Found", { status: 404 });
      }
      const ext = extname(fullPath);
      const mime = MIME_TYPES[ext] || "application/octet-stream";
      return new Response(file, {
        headers: {
          "content-type": mime,
          "cache-control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // SPA fallback: only for HTML navigation requests with no file extension.
    // Paths like /missing.js or /app.css have extensions → return 404.
    // Paths like /dashboard or / have no extension → serve index.html for SPA routing.
    const pathname = url.pathname;
    const hasExtension = extname(pathname) !== "";
    const acceptsHtml = req.method === "GET" && (req.headers.get("accept") ?? "").includes("text/html");
    if (acceptsHtml && !hasExtension) {
      const indexPath = join(PUBLIC_DIR, "index.html");
      const indexFile = Bun.file(indexPath);
      if (await indexFile.exists()) {
        return new Response(indexFile, {
          headers: { "content-type": "text/html", "cache-control": "no-cache" },
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws) {
      addClient(ws);
      ws.send(JSON.stringify({ type: "connected", port: PORT }));
    },
    message(ws, message) {
      resetInactivity();
      handleWsMessage(ws, typeof message === "string" ? message : message.toString());
    },
    close(ws) {
      removeClient(ws);
    },
  },
});

resetInactivity();

console.log(`PAI Installer server running on http://127.0.0.1:${PORT}/`);

export { server };
