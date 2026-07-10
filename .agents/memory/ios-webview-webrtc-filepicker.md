---
name: iOS WebView WebRTC and file-picker gotchas
description: Two related iOS-only Expo/WebView quirks that silently break embedded video calls and file uploads — no error is thrown, features just don't work as expected.
---

## WebRTC silently blocked in WKWebView

Loading a video-call embed (e.g. Daily.co) via `source={{ html: "<...>" }}` (an inline HTML string) works fine on Android and web, but on iOS WKWebView disables `getUserMedia`/WebRTC entirely for pages with no real origin. There's no error — camera/mic access just never activates.

**Why:** WKWebView ties WebRTC permission grants to a real page origin. Inline HTML strings don't have one.

**How to apply:** Load the actual room URL via `source={{ uri: roomUrl }}` instead of injecting HTML. If you need to bridge events back to React Native, use `injectedJavaScript` after the real page loads rather than baking a script into an HTML string.

Even with a real `uri`, iOS may still block camera/mic if the *native app shell* hasn't independently obtained camera/microphone permission first (WKWebView doesn't reliably surface its own permission prompt for embedded calls). Request native permissions (e.g. `expo-camera`'s `requestCameraPermissionsAsync` + `expo-av`'s `Audio.requestPermissionsAsync`) in a `useEffect` before ever mounting the WebView, and gate the WebView's render behind a "granted" state.

## Mixed image+PDF `accept` breaks the iOS Photo Library picker

A single `<input type="file" accept="image/*,application/pdf">` (or the equivalent `expo-document-picker` `type: [...]` mixing image and PDF mime types) causes iOS to skip the Photo Library sheet and go straight to the Files app for both file kinds — losing the "Photo Library / Take Photo" options.

**Why:** iOS's file-picker chooser only offers the Photo Library UI when the accept list is images-only; introducing any non-image type collapses the picker to Files-app-only.

**How to apply:** When a picker must support both photos and PDFs, use two distinct pickers/buttons — one scoped to `image/*` only (opens Photo Library) and one scoped to `application/pdf` only (opens Files) — rather than one combined picker.
