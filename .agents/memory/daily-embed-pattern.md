---
name: Daily Prebuilt embed pattern
description: Platform-split DailyEmbed component (web createFrame / native WebView), lifecycle sync via left-meeting, theming, and iOS Safari permission fix.
---

## Architecture
`DailyEmbed.web.tsx` — uses `DailyIframe.createFrame()` from `@daily-co/daily-js` npm package (not CDN). Manages its own iframe inside a plain `<div>`.
`DailyEmbed.tsx` — native (Expo Go compatible): `react-native-webview` loading the Daily Prebuilt room URL directly. No custom dev client needed.

**Why:** avoids a native Daily SDK dependency (which would break Expo Go compatibility). WebView approach still gets native permission prompts and no PiP issues.

## Critical config (web)

```ts
const callFrame = DailyIframe.createFrame(containerRef.current, {
  iframeStyle: { width: "100%", height: "100%", border: "0" },
  showLeaveButton: true,   // MUST be true — this is what fires 'left-meeting'
  showFullscreenButton: true,
  theme: { colors: { accent: "#E11D48", background: "#111111", ... } } as any,
});

// After createFrame, set allow on the underlying iframe.
// Without this, iOS Safari's Permissions Policy blocks getUserMedia inside the
// cross-origin Daily iframe — causes an infinite permission request loop.
const iframe = callFrame.iframe();
if (iframe) {
  iframe.allow = "camera; microphone; autoplay; display-capture";
  iframe.style.border = "none";
}
```

## Lifecycle sync: 'left-meeting'
`callFrame.on('left-meeting', callback)` fires the instant the local user exits the call (Daily's native Leave button or any other exit path). This is the single source of truth for app cleanup + redirect. No polling, no double-press required.

- On native, bridge JS (`injectedJavaScript`) relays `left-meeting` via `postMessage` → `handleMessage` → `onLeft?.()`.
- **Store all callbacks in a stable `useRef`** — never in effect deps — to prevent frame destroy/recreate on prop changes.

## Theming
- **Web**: pass `theme: { colors: {...} }` to `createFrame()` options at creation time. Cannot be changed post-creation.
- **Native WebView**: inject CSS custom properties via `injectedJavaScript`:
  ```js
  :root{ --daily-color-bg:#111; --daily-color-accent:#E11D48; ... }
  body,.DailyApp{ background:#111!important; }
  ```

## Permission gate: do NOT add one
Do not gate `DailyEmbed` mount on a `useMediaPermissions` check. Daily Prebuilt handles its own permission UI. Mounting immediately when `roomUrl` is available avoids the iOS Safari infinite-permission-loop the gate caused.

## Teacher-left detection (student view)
Without server-issued Daily meeting tokens, `participant-left` matches `event.participant.user_name` against `watchUserName` prop (teacher's display name). If tokens are wired in later, prefer `event.participant.owner` over name-matching.
