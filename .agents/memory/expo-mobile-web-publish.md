---
name: Expo mobile artifact web publish
description: How to make a mobile-kind Expo artifact publish as a real browser-testable website instead of an Expo Go landing page.
---

By default, the Expo artifact scaffold's production `build`/`serve` scripts (`scripts/build.js`, `server/serve.js`) produce/serve an "open in Expo Go" landing page with QR code + iOS/Android manifests — not a standalone browser web app, even when the code is web-ready (react-native-web, `Platform.OS` checks, `.web.tsx` files already present).

**Why:** the scaffold assumes native app distribution is the primary goal; web is treated as a secondary dev-preview surface only.

**How to apply:** if the user wants a stable public link to test in any browser (not just via Expo Go), rework `scripts/build.js` to run `pnpm exec expo export -p web --output-dir web-build` (set `EXPO_PUBLIC_DOMAIN` to the resolved deployment domain first, since API base URL is baked in via `process.env.EXPO_PUBLIC_DOMAIN` at build time), and rework `server/serve.js` into a plain static file server with SPA fallback (unmatched paths → `index.html`) so expo-router client routes resolve on direct link/refresh. Add `"web": { "bundler": "metro", "output": "single" }` to `app.json`. No `artifact.toml` changes needed if `[services.production]` already calls `pnpm run build` / `pnpm run serve`.
