---
name: api-zod Params collision fix
description: How to avoid TypeScript re-export collision in lib/api-zod when Orval generates both Zod schemas and TS types
---

Orval generates two outputs:
1. `lib/api-zod/src/generated/api.ts` — Zod schemas + inferred TS types (e.g. `export type ListTeacherReviewsParams`)
2. `lib/api-zod/src/generated/types/*.ts` — TypeScript interfaces with the same names

When `lib/api-zod/src/index.ts` does `export * from "./generated/api"` AND `export * from "./generated/types"`, TypeScript throws TS2308 for any operation that has query parameters (e.g. `ListTeacherReviewsParams` exported from both).

**Fix:** Only export from `./generated/api` — it already contains the inferred TS types from Zod schemas.

```ts
// lib/api-zod/src/index.ts
export * from "./generated/api";
// DO NOT add: export * from "./generated/types";
```

**Why:** The generated `api.ts` already provides both the Zod validators AND the inferred TypeScript types. The `types/` directory is redundant and causes collisions for any endpoint with query parameters.

**How to apply:** After every `pnpm --filter @workspace/api-spec run codegen`, check that `lib/api-zod/src/index.ts` only has the single `api` export. The codegen script will fail at `pnpm run typecheck:libs` if both are present.
