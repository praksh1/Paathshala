---
name: Sikshya teacher ID convention
description: How teacher IDs map between the DB, API, and the mobile app Teacher type
---

The mobile app has its own `Teacher` type used throughout all screens. The DB has two tables: `users` (userId) and `teacher_profiles` (profileId).

**Convention:**
- `Teacher.id` in mobile = `String(teacherProfiles.id)` (the profile ID, used in URL routing and API path `/teachers/:id`)
- `Teacher.userId` in mobile = `users.id` (the user foreign key, used for sessions and reviews queries)

**API routes use profileId in paths:**
- `GET /teachers/:id` — `:id` is `teacherProfiles.id`
- `GET /teachers/:id/reviews` — `:id` is `teacherProfiles.id`
- `PATCH /teachers/:id` — `:id` is `teacherProfiles.id`

**Sessions/reviews use userId as foreign key:**
- `GET /sessions?teacherId=X` — `X` is `users.id` (teacher's userId)
- `POST /reviews` — `teacherId` field is `users.id`

**Why:** The API routes follow REST convention using the profile resource ID, but the DB schema uses `userId` as the FK in sessions and reviews (not profileId). So the mobile app needs both IDs and must use the right one for each query.

**How to apply:** When a screen fetches sessions for a teacher, use `teacher.userId`. When navigating to teacher detail or fetching teacher info, use `teacher.id` (the profile ID).
