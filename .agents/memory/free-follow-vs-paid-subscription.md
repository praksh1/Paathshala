---
name: Free follow vs paid subscription
description: Don't conflate a teacher's own paid platform subscription with a student's free "follow/subscribe" relationship to a teacher.
---

In this app, "subscription" is overloaded:
1. A teacher pays the platform monthly (tiered: sessions/month + price) — lives on the teacher's own profile row.
2. A student can "subscribe" (follow) a teacher for free, just to bookmark them on their dashboard — no payment involved.

**Why:** the product spec called both actions "subscribe," but they have entirely different semantics, actors, and billing implications. Modeling them as the same relationship would make it impossible to reason about which side is paying whom.

**How to apply:** keep them as separate schema concerns — tier/price fields on the teacher's own profile row, and a separate many-to-many join table (student, teacher) with a unique constraint for the free follow relationship. Never charge money for the follow action.
