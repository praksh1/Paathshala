---
name: Expo tabs absolute bar overlaps full-screen screens
description: When tab bar is position:absolute, it renders over non-tab screens (classroom, modals) unless explicitly hidden per screen.
---

When the Expo Router `<Tabs>` layout uses `tabBarStyle: { position: "absolute" }`, the tab bar floats over every screen in the layout — including screens registered with `href: null` (non-tab routes like classroom, session-create). This means touch targets at the bottom of those screens (chat input, send button) become unreachable.

**Symptom:** chat message send button times out in Playwright; tapping bottom elements of a full-screen modal does nothing.

**Why:** `position: absolute` removes the tab bar from layout flow so it doesn't push content up, but it still renders on top of everything.

**How to apply:** For each non-tab screen in the layout that should be truly full-screen, add `tabBarStyle: { display: "none" }` to its `Tabs.Screen options`:
```tsx
<Tabs.Screen name="classroom/[id]" options={{ href: null, tabBarStyle: { display: "none" } }} />
```
This must be done in BOTH `(teacher)/_layout.tsx` and `(student)/_layout.tsx` for their respective non-tab screens.
