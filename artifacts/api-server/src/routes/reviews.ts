import { eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, reviewsTable, teacherProfilesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

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
