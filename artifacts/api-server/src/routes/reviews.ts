import { and, desc, eq, gte, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, reviewsTable, sessionEnrollmentsTable, sessionsTable, teacherProfilesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const RATING_WINDOW_DAYS = 15;

async function findRatableSession(studentId: number, teacherId: number) {
  const cutoff = new Date(Date.now() - RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [eligible] = await db
    .select({ sessionId: sessionsTable.id, date: sessionsTable.date })
    .from(sessionEnrollmentsTable)
    .innerJoin(sessionsTable, eq(sessionEnrollmentsTable.sessionId, sessionsTable.id))
    .where(and(
      eq(sessionEnrollmentsTable.studentId, studentId),
      eq(sessionsTable.teacherId, teacherId),
      eq(sessionsTable.status, "completed"),
      gte(sessionsTable.date, cutoff),
    ))
    .orderBy(desc(sessionsTable.date))
    .limit(1);

  return eligible ?? null;
}

// A student may only rate a teacher they actually attended a completed session with,
// and only within 15 days of that session — this must be checked server-side since
// the search/profile pages are otherwise open to any logged-in student.
router.get("/reviews/can-rate", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const teacherId = parseInt(String(req.query.teacherId ?? ""), 10);
  if (isNaN(teacherId)) { res.status(400).json({ error: "teacherId is required" }); return; }

  const session = await findRatableSession(user.userId, teacherId);
  res.json({ canRate: !!session, sessionId: session?.sessionId ?? null });
});

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  const { teacherId, rating, comment } = req.body as {
    teacherId?: number; rating?: number; comment?: string;
  };

  if (!teacherId || rating === undefined || comment === undefined) {
    res.status(400).json({ error: "teacherId, rating, and comment are required" });
    return;
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  const ratableSession = await findRatableSession(user.userId, teacherId);
  if (!ratableSession) {
    res.status(403).json({
      error: "You can only rate a teacher after attending a completed session with them, within 15 days of that session.",
    });
    return;
  }

  const [studentUser] = await db.select({ name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, user.userId));

  const [review] = await db.insert(reviewsTable).values({
    teacherId,
    studentId: user.userId,
    studentName: studentUser?.name ?? "Anonymous",
    rating,
    comment: comment ?? "",
  }).returning();

  const [{ avgRating, count }] = await db
    .select({
      avgRating: sql<number>`avg(rating)::numeric(3,2)`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.teacherId, teacherId));

  await db.update(teacherProfilesTable)
    .set({
      rating: Number(avgRating) || 0,
      reviewCount: count,
    })
    .where(eq(teacherProfilesTable.userId, teacherId));

  res.status(201).json(review);
});

export default router;
