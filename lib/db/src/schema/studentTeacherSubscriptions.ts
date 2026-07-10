import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

export const studentTeacherSubscriptionsTable = pgTable("student_teacher_subscriptions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  teacherId: integer("teacher_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique().on(table.studentId, table.teacherId),
]);

export const insertStudentTeacherSubscriptionSchema = createInsertSchema(studentTeacherSubscriptionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStudentTeacherSubscription = z.infer<typeof insertStudentTeacherSubscriptionSchema>;
export type StudentTeacherSubscription = typeof studentTeacherSubscriptionsTable.$inferSelect;
