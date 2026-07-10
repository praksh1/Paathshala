---
name: Daily.co embed replacing Jitsi
description: Platform-split Daily.co Prebuilt embed pattern (web iframe / native WebView) and how teacher-left detection works without server-issued tokens.
---

Sikshya's classroom video moved from Jitsi to Daily.co Prebuilt, keeping the same platform-split component shape that worked for Jitsi:
- Web: load `@daily-co/daily-js` from the unpkg CDN, `DailyIframe.createFrame` into a plain `<div>`, `callFrame.join({ url, userName })`.
- Native (iOS/Android): no native SDK/dev-client needed — a `WebView` loads a small inline HTML page that does the same CDN load + `createFrame` + `join`, and bridges events back to React Native via `window.ReactNativeWebView.postMessage`.

**Why:** avoids adding a native Daily SDK dependency (would require a custom dev client, breaking Expo Go compatibility) while still getting a fully native permission prompt and no PiP/floating-window issues, matching the constraints that shaped the original Jitsi embed.

**Teacher-left detection:** without a server that mints Daily meeting tokens (API key not wired up yet — see `EXPO_PUBLIC_DAILY_DOMAIN` in `utils/daily.ts`), Daily's `participant-left` event has no reliable `owner`/role field. Detection instead matches `event.participant.user_name` against the known teacher display name passed in as a `watchUserName` prop from the student screen. If/when server-issued meeting tokens are added, prefer switching to the token's owner claim over name-matching (name-matching breaks if two participants share a display name).

**How to apply:** if Daily.co tokens/API key get wired in later, revisit `DailyEmbed.tsx` / `DailyEmbed.web.tsx` to use `event.participant.owner` instead of name-matching, and update `getDailyRoomUrl` in `utils/daily.ts` to use real room-creation API calls instead of the domain+sanitized-name URL guess.
