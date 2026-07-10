/**
 * Daily.co room URL resolution.
 *
 * Until real Daily.co credentials are wired up, this derives a room URL from
 * `EXPO_PUBLIC_DAILY_DOMAIN` (e.g. "sikshya.daily.co") + a sanitized room name.
 * Once an API key / domain is provided, set EXPO_PUBLIC_DAILY_DOMAIN and rooms
 * will resolve automatically — no other code changes needed.
 */

const DEFAULT_DAILY_DOMAIN = "sikshya.daily.co";

export function sanitizeRoomName(rawId: string): string {
  return "sikshya" + rawId.replace(/[^a-zA-Z0-9]/g, "");
}

export function getDailyRoomUrl(rawId: string): string {
  const domain = process.env.EXPO_PUBLIC_DAILY_DOMAIN || DEFAULT_DAILY_DOMAIN;
  const roomName = sanitizeRoomName(rawId);
  return `https://${domain}/${roomName}`;
}
