import { integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

export const disputeReasonEnum = pgEnum("dispute_reason", [
  "Payment Issue",
  "Technical Failure",
  "Inappropriate Behavior",
  "Other",
]);

export const disputeStatusEnum = pgEnum("dispute_status", ["open", "in_review", "resolved"]);

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  reason: disputeReasonEnum("reason").notNull(),
  description: text("description").notNull(),
  evidenceUrl: text("evidence_url").notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({
  id: true,
  status: true,
  createdAt: true,
});
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
