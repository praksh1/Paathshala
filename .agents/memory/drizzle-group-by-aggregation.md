---
name: Drizzle group-by aggregation errors
description: Complex Drizzle grouped SQL queries (array_agg + case-expression group by) can fail at query time even when they build/typecheck fine.
---

A Drizzle query combining a `case when` grouping expression with `array_agg(... order by ...)` and a `filter (where ...)` count in the same `select` failed at runtime with an opaque Postgres error, despite compiling correctly.

**Why:** Drizzle's raw SQL template composition for grouped aggregates is easy to get subtly wrong (e.g. mismatched group-by expression duplication across select/group by/order by), and the resulting Postgres error message from `NodePgPreparedQuery` is often generic/unhelpful for diagnosing it.

**How to apply:** For per-user conversation/thread-style aggregations over modest data volumes (e.g. a single user's messages), prefer fetching raw rows with a simple `where`/`orderBy` and aggregating in JS. It's easier to get correct, easier to debug, and fast enough at this scale. Reach for grouped SQL only when volume genuinely requires it, and test the exact query directly against the dev DB before trusting it.
