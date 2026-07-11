---
name: expo-notifications permission type mismatch
description: expo-notifications NotificationPermissionsStatus fields become inaccessible due to duplicate expo-modules-core versions; workaround is unknown cast.
---

## Rule
When `getPermissionsAsync()` / `requestPermissionsAsync()` return type fields (`status`, `granted`) cause TS2339 errors, cast the result through `unknown` before reading fields.

```ts
const result = (await Notifications.getPermissionsAsync()) as unknown as {
  status: string;
  granted: boolean;
};
if (result.granted || result.status === "granted") { ... }
```

**Why:** A duplicate `expo-modules-core` version in the pnpm dep tree causes `NotificationPermissionsStatus` (which extends `PermissionResponse`) to structurally mismatch its own declared shape — TypeScript sees the fields as non-existent even though they exist at runtime. The `granted` boolean convenience field and `status` string are both real at runtime regardless.

**How to apply:** Any time you see TS2339 on `.status` or `.granted` on a value returned from `Notifications.getPermissionsAsync()` or `requestPermissionsAsync()`, use the `unknown` cast pattern above.
