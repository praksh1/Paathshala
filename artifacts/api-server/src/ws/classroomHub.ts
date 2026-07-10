import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { logger } from "../lib/logger";
import { verifyToken } from "../lib/auth";

interface RoomClient {
  ws: WebSocket;
  userId: number;
  role: string;
  name: string;
}

const rooms = new Map<string, Set<RoomClient>>();

function broadcast(sessionId: string, msg: object, excludeWs?: WebSocket): void {
  const room = rooms.get(sessionId);
  if (!room) return;
  const payload = JSON.stringify(msg);
  for (const c of room) {
    if (excludeWs && c.ws === excludeWs) continue;
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(payload);
  }
}

export function broadcastSessionStatus(sessionId: string, status: string): void {
  broadcast(String(sessionId), { type: "session_status", status });
}

/**
 * Clears all tracked presence (in-memory room clients) for a session. Presence has no
 * DB-backed table — it's tracked purely in the `rooms` map for the lifetime of open
 * WebSocket connections — so "ghost" participants are stale entries left behind by
 * connections that didn't close cleanly (e.g. dev hot-reload, app backgrounding). Called
 * when a teacher (re)starts a session so the participant count is guaranteed to read 0
 * at the moment the class begins, regardless of leftover state from a previous run.
 */
export function resetRoomPresence(sessionId: string): void {
  const room = rooms.get(String(sessionId));
  if (!room) return;
  for (const client of room) {
    try {
      client.ws.close(4000, "Session restarted");
    } catch {
      // ignore
    }
  }
  rooms.delete(String(sessionId));
  broadcast(String(sessionId), { type: "presence", count: 0 });
}

export function attachClassroomHub(server: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (!url.pathname.startsWith("/api/ws")) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "http://x");
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const name = decodeURIComponent(url.searchParams.get("name") ?? "Unknown");

    if (!sessionId || !token) {
      ws.close(1008, "Missing params");
      return;
    }

    let userId: number;
    let role: string;
    try {
      const p = verifyToken(token);
      userId = p.userId;
      role = p.role;
    } catch {
      ws.close(1008, "Invalid token");
      return;
    }

    const client: RoomClient = { ws, userId, role, name };
    if (!rooms.has(sessionId)) rooms.set(sessionId, new Set());
    rooms.get(sessionId)!.add(client);
    logger.info({ sessionId, userId, role }, "ws join");

    const count = rooms.get(sessionId)!.size;
    broadcast(sessionId, { type: "presence", count });

    ws.on("message", (raw: Buffer) => {
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(raw.toString()) as Record<string, unknown>; } catch { return; }

      switch (msg.type) {
        case "chat":
          broadcast(sessionId, {
            type: "chat",
            senderName: name,
            role,
            text: msg.text,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }, ws);
          break;
        case "draw_commit":
          if (role === "teacher")
            broadcast(sessionId, {
              type: "draw_commit",
              tool: msg.tool,
              d: msg.d,
              color: msg.color,
              width: msg.width,
              x1: msg.x1,
              y1: msg.y1,
              x2: msg.x2,
              y2: msg.y2,
              cx: msg.cx,
              cy: msg.cy,
              r: msg.r,
              text: msg.text,
              x: msg.x,
              y: msg.y,
            }, ws);
          break;
        case "board_clear":
          if (role === "teacher") broadcast(sessionId, { type: "board_clear" }, ws);
          break;
        case "reaction":
          broadcast(sessionId, { type: "reaction", emoji: msg.emoji, senderName: name });
          break;
        case "material_set":
          if (role === "teacher")
            broadcast(sessionId, { type: "material_set", kind: msg.kind, dataUrl: msg.dataUrl }, ws);
          break;
        case "material_clear":
          if (role === "teacher") broadcast(sessionId, { type: "material_clear" }, ws);
          break;
      }
    });

    ws.on("close", () => {
      rooms.get(sessionId)?.delete(client);
      const remaining = rooms.get(sessionId);
      if (!remaining?.size) rooms.delete(sessionId);
      const newCount = rooms.get(sessionId)?.size ?? 0;
      broadcast(sessionId, { type: "presence", count: newCount });
    });

    ws.on("error", (err: Error) => logger.error({ err, sessionId }, "ws error"));
  });
}
