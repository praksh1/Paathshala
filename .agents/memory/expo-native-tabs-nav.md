---
name: Expo native-tabs navigation pitfall
description: Why pushing to non-tab routes silently no-ops under Expo Router NativeTabs, and how to keep all routes navigable.
---

When an Expo Router layout conditionally returns `NativeTabs` (e.g. `unstable-native-tabs` gated on `isLiquidGlassAvailable()` for iOS 26), only the tab triggers are registered as routes. Non-tab screens that the Classic `<Tabs>` layout registered via `<Tabs.Screen ... href={null} />` (detail/modal screens like `session-create`, `classroom/[id]`, `teacher/[id]`) are NOT registered in the Native layout, so `router.push`/`replace` to them silently does nothing.

**Symptom:** a button "does nothing" on a physical iOS device but works fine on web (web falls back to the Classic layout, so the bug can't reproduce there).

**Why:** NativeTabs is a different navigator that doesn't pick up the hidden `href={null}` screen registrations.

**How to apply:** if push navigation to a detail screen no-ops only on native, check whether the layout branches into NativeTabs. Simplest robust fix is to always return the Classic `<Tabs>` layout so every screen stays registered. After removing the Native branch, also delete now-unused imports (NativeTabs, isLiquidGlassAvailable) or typecheck/lint will flag them.
