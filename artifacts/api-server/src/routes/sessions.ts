import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessionsTable, sessionEnrollmentsTable, teacherProfilesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { broadcastSessionStatus, resetRoomPresence } from "../ws/classroomHub";
import { ensureDailyRoom } from "../lib/daily";

const router: IRouter = Router();

router.get("/sessions", async (req, res): Promise<void> => {
  const { teacherId, studentId, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, parseInt(limit, 10) || 20);
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (teacherId) conditions.push(eq(sessionsTable.teacherId, parseInt(teacherId, 10)));
  if (status) conditions.push(eq(sessionsTable.status, status));

  if (studentId) {
    const enrolled = await db
      .select({ sessionId: sessionEnrollmentsTable.sessionId })
      .from(sessionEnrollmentsTable)
      .where(eq(sessionEnrollmentsTable.studentId, parseInt(studentId, 10)));
    const sessionIds = enrolled.map((e) => e.sessionId);
    if (sessionIds.length === 0) {
      res.json({ sessions: [], total: 0, page: pageNum, limit: limitNum });
      return;
    }
    conditions.push(sql`${sessionsTable.id} = ANY(ARRAY[${sql.join(sessionIds.map((id) => sql`${id}`), sql`,`)}]::int[])`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  if (status === "live") {
    // Ghost/bot-generated "live" sessions (e.g. from seed data) never get moved to
    // "completed" by a real teacher action. Lazily auto-expire any "live" session whose
    // scheduled end time (date + duration + grace) has already passed, so the Sessions
    // tab and Live Now section only ever show genuinely active classes.
    const staleLive = await db
      .select({ id: sessionsTable.id, date: sessionsTable.date, duration: sessionsTable.duration })
      .from(sessionsTable)
      .where(eq(sessionsTable.status, "live"));

    const staleIds = staleLive
      .filter((s) => {
        const endMs = new Date(s.date).getTime() + (s.duration + 15) * 60 * 1000;
        return endMs < Date.now();
      })
      .map((s) => s.id);

    if (staleIds.length > 0) {
      await db.update(sessionsTable).set({ status: "completed" }).where(
        sql`${sessionsTable.id} = ANY(ARRAY[${sql.join(staleIds.map((id) => sql`${id}`), sql`,`)}]::int[])`
      );
      for (const staleId of staleIds) {
        broadcastSessionStatus(String(staleId), "completed");
      }
    }

    const liveSessions = await db
      .selectDistinctOn([sessionsTable.teacherId])
      .from(sessionsTable)
      .where(where)
      .orderBy(sessionsTable.teacherId, desc(sessionsTable.date));

    const sorted = liveSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const total = sorted.length;
    const paged = sorted.slice(offset, offset + limitNum);

    res.json({ sessions: paged, total, page: pageNum, limit: limitNum });
    return;
  }

  const [sessions, [{ total }]] = await Promise.all([
    db.select().from(sessionsTable).where(where).orderBy(desc(sessionsTable.date)).limit(limitNum).offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(sessionsTable).where(where),
  ]);

  res.json({ sessions, total, page: pageNum, limit: limitNum });
});

router.post("/sessions", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  if (user.role !== "teacher") {
    res.status(403).json({ error: "Only teachers can create sessions" });
    return;
  }

  const { subject, topic, date, duration, maxStudents, price } = req.body as {
    subject?: string; topic?: string; date?: string;
    duration?: number; maxStudents?: number; price?: number;
  };

  if (!subject || !topic || !date) {
    res.status(400).json({ error: "subject, topic, and date are required" });
    return;
  }

  const [userRow] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, user.userId));

  const [session] = await db.insert(sessionsTable).values({
    teacherId: user.userId,
    teacherName: userRow?.name ?? "Unknown",
    subject,
    topic,
    date: new Date(date),
    duration: duration ?? 60,
    maxStudents: maxStudents ?? 20,
    enrolledCount: 0,
    price: price ?? 0,
    status: "upcoming",
  }).returning();

  res.status(201).json(session);
});

const DEFAULT_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English",
  "Nepali", "Computer Science", "Economics", "Accountancy", "Social Studies",
];

router.get("/sessions/subjects", async (_req, res): Promise<void> => {
  const rows = await db.selectDistinct({ subject: sessionsTable.subject }).from(sessionsTable);
  const dbSubjects = rows.map((r) => r.subject).filter((s): s is string => !!s && s.trim().length > 0);
  const merged = Array.from(new Set([...DEFAULT_SUBJECTS, ...dbSubjects]));
  res.json({ subjects: merged });
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

// Ensures a Daily.co room exists for this session and returns its join URL. Daily rooms
// must be explicitly created via the REST API before anyone can join them — visiting a
// room URL for a room that was never created fails with "The meeting you're trying to
// join does not exist." Both the teacher (on start) and students (on join) call this so
// the room is guaranteed to exist regardless of who gets there first.
router.get("/sessions/:id/room", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  try {
    const roomUrl = await ensureDailyRoom(id);
    res.json({ roomUrl });
  } catch (err) {
    req.log.error({ err, sessionId: id }, "Failed to ensure Daily room");
    res.status(502).json({ error: "Failed to set up video room" });
  }
});

const ALLOWED_STATUSES = ["upcoming", "live", "completed", "cancelled"];

router.patch("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const user = req.user!;
  if (user.role !== "teacher") {
    res.status(403).json({ error: "Only teachers can update sessions" });
    return;
  }

  const { status, topic } = req.body as { status?: string; topic?: string };
  const updates: Record<string, unknown> = {};
  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    updates.status = status;
  }
  if (topic !== undefined) updates.topic = topic;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [existing] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Session not found" }); return; }
  if (existing.teacherId !== user.userId) {
    res.status(403).json({ error: "You can only update your own sessions" });
    return;
  }

  if (status === "live") {
    const staleLiveSessions = await db
      .select({ id: sessionsTable.id })
      .from(sessionsTable)
      .where(and(eq(sessionsTable.teacherId, user.userId), eq(sessionsTable.status, "live"), sql`${sessionsTable.id} != ${id}`));

    if (staleLiveSessions.length > 0) {
      await db.update(sessionsTable).set({ status: "completed" }).where(
        and(eq(sessionsTable.teacherId, user.userId), eq(sessionsTable.status, "live"), sql`${sessionsTable.id} != ${id}`)
      );
      for (const stale of staleLiveSessions) {
        broadcastSessionStatus(String(stale.id), "completed");
      }
    }

    // Force-clear any stale/"ghost" presence left over from a previous run of this same
    // session (e.g. a connection that never closed cleanly) so the participant count
    // reads exactly 0 the moment the teacher starts the class.
    resetRoomPresence(String(id));

    // Proactively create the Daily.co room the moment the teacher starts the session,
    // so it already exists by the time either side's WebView tries to join it.
    try {
      await ensureDailyRoom(id);
    } catch (err) {
      req.log.error({ err, sessionId: id }, "Failed to pre-create Daily room on session start");
    }
  }

  const [session] = await db.update(sessionsTable).set(updates).where(eq(sessionsTable.id, id)).returning();

  if (status !== undefined) {
    broadcastSessionStatus(String(id), status);
  }

  res.json(session);
});

router.post("/sessions/:id/enroll", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid session ID" }); return; }

  const user = req.user!;
  const { paymentMethod } = req.body as { paymentMethod?: string };

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  if (session.enrolledCount >= session.maxStudents) {
    res.status(409).json({ error: "Session is full" });
    return;
  }

  const existing = await db.select({ id: sessionEnrollmentsTable.id })
    .from(sessionEnrollmentsTable)
    .where(and(eq(sessionEnrollmentsTable.sessionId, id), eq(sessionEnrollmentsTable.studentId, user.userId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Already enrolled in this session" });
    return;
  }

  const [enrollment] = await db.insert(sessionEnrollmentsTable).values({
    sessionId: id,
    studentId: user.userId,
    paymentStatus: "pending",
    paymentMethod: paymentMethod ?? null,
  }).returning();

  await db.update(sessionsTable)
    .set({ enrolledCount: session.enrolledCount + 1 })
    .where(eq(sessionsTable.id, id));

  await db.update(teacherProfilesTable)
    .set({ totalStudents: sql`${teacherProfilesTable.totalStudents} + 1` })
    .where(eq(teacherProfilesTable.userId, session.teacherId));

  res.status(201).json(enrollment);
});

export default router;
