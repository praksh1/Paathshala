---
name: scripts package rootDir fix
description: seed.ts must import lib/db via workspace package name, not a relative path into lib/db/src, to avoid rootDir violations in tsc.
---

## Rule
`scripts/src/seed.ts` must import the DB schema via the workspace package, not a relative path:

```ts
// CORRECT
import * as schema from "@workspace/db/schema";

// WRONG — violates rootDir '/home/.../scripts/src'
import * as schema from "../../lib/db/src/schema/index.js";
```

Also ensure `@workspace/db` is declared in `scripts/package.json` dependencies.

**Why:** `scripts/tsconfig.json` sets `"rootDir": "src"`. A relative import that resolves to files outside that directory causes `TS6059: File is not under rootDir` for every file in `lib/db/src/schema/`. tsx runtime can follow the path fine, but `tsc --noEmit` rejects it.

**How to apply:** Any new script in `scripts/src/` that needs DB access should import from `@workspace/db` or `@workspace/db/schema`, and `@workspace/db` must be listed in `scripts/package.json` dependencies.
