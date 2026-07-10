import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, disputeReasonEnum, disputesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const VALID_REASONS = new Set<string>(disputeReasonEnum.enumValues);

router.post("/disputes", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const { reason, description, evidenceUrl } = req.body as {
    reason?: string; description?: string; evidenceUrl?: string;
  };

  if (!reason || !VALID_REASONS.has(reason)) {
    res.status(400).json({ error: `reason must be one of: ${[...VALID_REASONS].join(", ")}` });
    return;
  }
  if (!description || !description.trim()) {
    res.status(400).json({ error: "description is required" });
    return;
  }
  if (!evidenceUrl || !evidenceUrl.trim()) {
    res.status(400).json({ error: "evidenceUrl (file upload) is required" });
    return;
  }

  const [dispute] = await db.insert(disputesTable).values({
    userId,
    reason: reason as typeof disputeReasonEnum.enumValues[number],
    description: description.trim(),
    evidenceUrl: evidenceUrl.trim(),
  }).returning();

  res.status(201).json(dispute);
});

router.get("/disputes/mine", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const rows = await db.select().from(disputesTable)
    .where(eq(disputesTable.userId, userId))
    .orderBy(desc(disputesTable.createdAt));
  res.json(rows);
});

export default router;
