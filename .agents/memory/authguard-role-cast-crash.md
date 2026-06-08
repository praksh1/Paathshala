---
name: AuthGuard async-redirect role-cast crash
description: Why role-specific screens crash for the wrong role during login, and the guard pattern that prevents it.
---

The root AuthGuard redirects asynchronously inside a `useEffect`. During login (or a role switch), the wrong-role user is rendered for one frame before the effect fires the redirect. A teacher-only screen that does `user as Teacher` then reads teacher-only fields (e.g. `teacher.subjects.map(...)`) crashes with "Cannot read property 'map' of undefined" because a Student has no such field.

**Why:** the cast lies — the value really is the other role until the redirect completes a tick later.

**How to apply:** every role-specific screen should early-return before touching role-only fields:
`if (!user || user.role !== "teacher") return null;` (symmetric for student screens). Also defensively default array fields you map over (`(teacher.subjects ?? [])`). Don't rely on the AuthGuard alone — its redirect is one render too late.
