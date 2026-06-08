---
name: Expo Router "/" route conflict traps logout
description: Why router.replace("/") fails to escape a role tab group in the Sikshya app, and the fix pattern.
---

# Expo Router root-index conflict (Sikshya)

If multiple files resolve to the same `/` path — e.g. `app/index.tsx`, `app/(teacher)/index.tsx`, `app/(student)/index.tsx` (route groups are transparent and do not add a URL segment) — then `router.replace("/")` from *inside* a group does NOT leave that group. Logout appeared to "white-out": blank content with the role tab bar still visible, because it stayed on `(teacher)/index` which renders `null` once `user` is cleared.

**Rule:** navigate to an *unambiguous* route to escape a group, never to `/`.

**Fix pattern used here:**
- Role-selection landing lives at its own route `app/welcome.tsx` (unambiguous).
- `app/index.tsx` is a pure auth gate (spinner while loading; teacher→Redirect `(teacher)`, student→Redirect `(student)`, else→Redirect `/welcome`).
- All logout handlers call `router.replace("/welcome")`.
- Deleted dead `app/(tabs)/` group that also collided at `/`.

**Related AuthGuard gotcha:** a guard that redirects logged-in users to their role group with `if (!inRoleGroup && !inAuthGroup) router.replace(roleHome)` will bounce them off any *shared* top-level route (e.g. `app/notifications.tsx`, `segments[0] === "notifications"`), making a bell/link look like a no-op. Whitelist shared screens (`onSharedScreen`) in the guard.

**Why:** route groups don't disambiguate the URL, so "/" matching is positional; and a too-aggressive AuthGuard treats every non-group route as "wrong place."
