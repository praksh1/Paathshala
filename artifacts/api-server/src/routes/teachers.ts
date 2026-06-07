import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, teacherProfilesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/teachers", async (req, res): Promise<void> => {
  const { search, subject, district, minRating, maxPrice, onlineOnly, sort, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [eq(teacherProfilesTable.approvalStatus, "approved")];

  if (subject && subject !== "All") {
    conditions.push(eq(teacherProfilesTable.subject, subject));
  }
  if (district && district !== "All Districts") {
    conditions.push(eq(teacherProfilesTable.district, district));
  }
  if (minRating) {
    conditions.push(gte(teacherProfilesTable.rating, parseFloat(minRating)));
  }
  if (maxPrice) {
    conditions.push(lte(teacherProfilesTable.pricePerSession, parseInt(maxPrice, 10)));
  }
  if (onlineOnly === "true") {
    conditions.push(eq(teacherProfilesTable.isOnline, true));
  }
  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(usersTable.name, pattern),
        ilike(teacherProfilesTable.subject, pattern),
        ilike(teacherProfilesTable.bio, pattern),
        ilike(teacherProfilesTable.location, pattern),
        ilike(teacherProfilesTable.district, pattern),
      )!
    );
  }

  const orderByCol = (() => {
    switch (sort) {
      case "students": return desc(teacherProfilesTable.totalStudents);
      case "price_asc": return asc(teacherProfilesTable.pricePerSession);
      case "price_desc": return desc(teacherProfilesTable.pricePerSession);
      case "experience": return desc(teacherProfilesTable.experienceYears);
      default: return desc(teacherProfilesTable.rating);
    }
  })();

  const where = and(...conditions);

  const [teachers, [{ total }]] = await Promise.all([
    db
      .select({
        id: teacherProfilesTable.id,
        userId: teacherProfilesTable.userId,
        name: usersTable.name,
        email: usersTable.email,
        subject: teacherProfilesTable.subject,
        subjects: teacherProfilesTable.subjects,
        bio: teacherProfilesTable.bio,
        approvalStatus: teacherProfilesTable.approvalStatus,
        location: teacherProfilesTable.location,
        district: teacherProfilesTable.district,
        experienceYears: teacherProfilesTable.experienceYears,
        pricePerSession: teacherProfilesTable.pricePerSession,
        languages: teacherProfilesTable.languages,
        isOnline: teacherProfilesTable.isOnline,
        subscriptionActive: teacherProfilesTable.subscriptionActive,
        sessionsThisMonth: teacherProfilesTable.sessionsThisMonth,
        totalStudents: teacherProfilesTable.totalStudents,
        monthlyEarnings: teacherProfilesTable.monthlyEarnings,
        rating: teacherProfilesTable.rating,
        reviewCount: teacherProfilesTable.reviewCount,
        avatarUrl: teacherProfilesTable.avatarUrl,
      })
      .from(teacherProfilesTable)
      .innerJoin(usersTable, eq(teacherProfilesTable.userId, usersTable.id))
      .where(where)
      .orderBy(orderByCol)
      .limit(limitNum)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(teacherProfilesTable)
      .innerJoin(usersTable, eq(teacherProfilesTable.userId, usersTable.id))
      .where(where),
  ]);

  res.json({ teachers, total, page: pageNum, limit: limitNum });
});

router.get("/teachers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid teacher ID" }); return; }

  const [row] = await db
    .select({
      id: teacherProfilesTable.id,
      userId: teacherProfilesTable.userId,
      name: usersTable.name,
      email: usersTable.email,
      subject: teacherProfilesTable.subject,
      subjects: teacherProfilesTable.subjects,
      bio: teacherProfilesTable.bio,
      approvalStatus: teacherProfilesTable.approvalStatus,
      location: teacherProfilesTable.location,
      district: teacherProfilesTable.district,
      experienceYears: teacherProfilesTable.experienceYears,
      pricePerSession: teacherProfilesTable.pricePerSession,
      languages: teacherProfilesTable.languages,
      isOnline: teacherProfilesTable.isOnline,
      subscriptionActive: teacherProfilesTable.subscriptionActive,
      sessionsThisMonth: teacherProfilesTable.sessionsThisMonth,
      totalStudents: teacherProfilesTable.totalStudents,
      monthlyEarnings: teacherProfilesTable.monthlyEarnings,
      rating: teacherProfilesTable.rating,
      reviewCount: teacherProfilesTable.reviewCount,
      avatarUrl: teacherProfilesTable.avatarUrl,
    })
    .from(teacherProfilesTable)
    .innerJoin(usersTable, eq(teacherProfilesTable.userId, usersTable.id))
    .where(eq(teacherProfilesTable.id, id));

  if (!row) { res.status(404).json({ error: "Teacher not found" }); return; }
  res.json(row);
});

router.patch("/teachers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid teacher ID" }); return; }

  const allowedFields = ["bio", "subject", "subjects", "location", "district", "experienceYears", "pricePerSession", "languages", "isOnline"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [profile] = await db
    .update(teacherProfilesTable)
    .set(updates)
    .where(eq(teacherProfilesTable.id, id))
    .returning();

  if (!profile) { res.status(404).json({ error: "Teacher not found" }); return; }

  const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.id, profile.userId));

  res.json({ ...profile, name: user?.name ?? "", email: user?.email ?? "" });
});

router.get("/teachers/:id/reviews", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid teacher ID" }); return; }

  const pageNum = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "10"), 10)));
  const offset = (pageNum - 1) * limitNum;

  const [profile] = await db
    .select({ userId: teacherProfilesTable.userId })
    .from(teacherProfilesTable)
    .where(eq(teacherProfilesTable.id, id));

  if (!profile) { res.status(404).json({ error: "Teacher not found" }); return; }

  const { reviewsTable } = await import("@workspace/db");
  const [reviews, [{ total }]] = await Promise.all([
    db.select().from(reviewsTable)
      .where(eq(reviewsTable.teacherId, profile.userId))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` })
      .from(reviewsTable)
      .where(eq(reviewsTable.teacherId, profile.userId)),
  ]);

  res.json({ reviews, total, page: pageNum, limit: limitNum });
});

export default router;
