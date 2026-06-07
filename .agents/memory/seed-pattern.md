---
name: Sikshya seed script pattern
description: How the seed script accesses the DB schema without going through the lib build system
---

The seed script at `scripts/src/seed.ts` imports the DB schema via a relative path rather than the `@workspace/db` package alias:

```ts
import * as schema from "../../lib/db/src/schema/index.js";
```

It also creates its own Drizzle instance using `pg` directly:

```ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
```

**Why:** `scripts/` is a leaf workspace package (not a lib). When running with `tsx` (not a compiled build), it can't use the `@workspace/db` alias directly because there's no tsc build step. Relative imports work because tsx resolves them at runtime.

**How to apply:** Always run the seed script with `pnpm --filter @workspace/scripts run seed`. The script needs `DATABASE_URL` in env (set as a Replit secret). It clears all data and re-seeds, so don't run in production.
