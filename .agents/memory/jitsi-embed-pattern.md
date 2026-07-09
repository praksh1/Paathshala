---
name: Jitsi embed persistent PiP pattern
description: How to embed meet.jit.si video calls in an Expo app across web and native without a custom signaling server, keeping other UI (e.g. a whiteboard) interactive alongside the call.
---

Use platform-split files so the same `<JitsiEmbed roomName displayName style />` API works everywhere:
- `JitsiEmbed.tsx` (native, iOS/Android): renders `react-native-webview`'s `WebView` pointed at `https://meet.jit.si/{roomName}#config...`, with `onPermissionRequest` granting camera/mic.
- `JitsiEmbed.web.tsx` (web): renders a raw `<iframe>` via `React.createElement("iframe", {...} as any)` (bypasses RN's JSX typings, which don't know the `iframe` intrinsic) with `allow="camera; microphone; fullscreen; display-capture; autoplay"` so the browser correctly prompts for camera/mic.

**Why persistent mount matters:** conditionally rendering the call only when a "Call" tab is active causes Jitsi to disconnect and reconnect (and re-request permissions) every time the user switches tabs. Instead, always mount `JitsiEmbed` and toggle its *size/position* via style (small PiP box in a corner vs. `StyleSheet.absoluteFill`) so the underlying WebView/iframe never unmounts.

**How to apply:** For any classroom/meeting screen that must show live video alongside other interactive content (e.g. a whiteboard), mount the call component once outside the tab-conditional blocks, and use `pointerEvents="box-none"` on the wrapping View plus a small fixed-size PiP box so the video doesn't block the rest of the UI.

Room name convention: derive from the domain session ID (e.g. `SikshyaSession{sessionId}`) so all participants of the same session land in the same Jitsi room automatically — no custom backend signaling needed.
