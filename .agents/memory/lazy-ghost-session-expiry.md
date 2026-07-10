---
name: Lazy ghost-session expiry
description: Seed/bot-generated "live" sessions never get flipped to completed by any real action; expire them lazily on read.
---

Seeded or test-generated sessions can be inserted with `status: "live"` but there is no teacher action that ever ends them (no real class was taught). If the UI only trusts the stored `status` column, these become permanent "ghost" live sessions cluttering Live Now feeds.

**Why:** discovered while removing bot-generated live sessions from the student teacher-profile screen — the sessions had a `date` far in the past but `status` still `"live"`.

**How to apply:** on any endpoint that filters `status = "live"`, first compute an end-of-session timestamp (`date + duration + grace period`) for all rows currently marked live, and bulk-update any that have already passed to `"completed"` before returning results. This avoids needing a cron job/worker and keeps the fix contained to the read path.
