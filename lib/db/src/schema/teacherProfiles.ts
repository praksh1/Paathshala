import { boolean, integer, pgTable, real, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { usersTable } from "./users";

export const teacherProfilesTable = pgTable("teacher_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" })
    .unique(),
  subject: text("subject").notNull(),
  subjects: text("subjects").array().notNull().default([]),
  bio: text("bio").notNull().default(""),
  approvalStatus: text("approval_status").notNull().default("pending"),
  location: text("location"),
  district: text("district"),
  experienceYears: integer("experience_years"),
  pricePerSession: integer("price_per_session"),
  languages: text("languages").array().notNull().default([]),
  isOnline: boolean("is_online").notNull().default(false),
  subscriptionActive: boolean("subscription_active").notNull().default(false),
  sessionsThisMonth: integer("sessions_this_month").notNull().default(0),
  totalStudents: integer("total_students").notNull().default(0),
  monthlyEarnings: integer("monthly_earnings").notNull().default(0),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTeacherProfileSchema = createInsertSchema(teacherProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTeacherProfile = z.infer<typeof insertTeacherProfileSchema>;
export type TeacherProfile = typeof teacherProfilesTable.$inferSelect;
