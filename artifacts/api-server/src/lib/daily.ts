import { logger } from "./logger";

const DAILY_API_BASE = "https://api.daily.co/v1";

export function sanitizeRoomName(rawId: string): string {
  return "sikshya" + rawId.replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Ensures a Daily.co room exists for the given session, creating it via the REST API
 * if it doesn't already exist. Daily rooms are NOT created automatically just by
 * visiting a room URL — joining a URL for a room that was never created via the API
 * fails with "The meeting you're trying to join does not exist." This must be called
 * (idempotently) before any client attempts to join the room's WebView/iframe.
 *
 * Returns the room URL to join. Falls back to a best-effort URL guess (without
 * guaranteeing the room exists) if DAILY_API_KEY isn't configured, so local/dev
 * environments without a key don't hard-crash — but joining will fail in that case.
 */
export async function ensureDailyRoom(sessionId: string | number): Promise<string> {
  const roomName = sanitizeRoomName(String(sessionId));
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    logger.warn({ roomName }, "DAILY_API_KEY not set; skipping Daily room creation");
    const domain = process.env.EXPO_PUBLIC_DAILY_DOMAIN || "sikshya.daily.co";
    return `https://${domain}/${roomName}`;
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const getRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, { headers });
  if (getRes.ok) {
    const room = (await getRes.json()) as { url: string };
    return room.url;
  }

  if (getRes.status !== 404) {
    const body = await getRes.text();
    logger.error({ roomName, status: getRes.status, body }, "Failed to look up Daily room");
    throw new Error(`Daily room lookup failed: ${getRes.status}`);
  }

  const createRes = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: roomName,
      privacy: "public",
      properties: {
        enable_chat: false,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
      },
    }),
  });

  if (!createRes.ok) {
    // Room may have been created concurrently by a race (teacher + student both
    // triggering ensureDailyRoom at once) — treat "already exists" as success.
    if (createRes.status === 400) {
      const body = await createRes.text();
      if (body.includes("already exists")) {
        const domain = process.env.EXPO_PUBLIC_DAILY_DOMAIN || "sikshya.daily.co";
        return `https://${domain}/${roomName}`;
      }
    }
    const body = await createRes.text();
    logger.error({ roomName, status: createRes.status, body }, "Failed to create Daily room");
    throw new Error(`Daily room creation failed: ${createRes.status}`);
  }

  const created = (await createRes.json()) as { url: string };
  return created.url;
}
