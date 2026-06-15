import { Router, type IRouter } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, revisionsTable, topicsTable, questionsTable } from "@workspace/db";
import { ListRevisionsQueryParams, CompleteRevisionParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/revisions", requireAuth, async (req, res): Promise<void> => {
  const queryParsed = ListRevisionsQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: queryParsed.error.message });
    return;
  }

  const userId = getUserId(req);
  const { status, dueToday } = queryParsed.data;

  const conditions = [eq(revisionsTable.userId, userId)];
  if (status) conditions.push(eq(revisionsTable.status, status));

  if (dueToday) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    conditions.push(lte(revisionsTable.revisionDate, tomorrow));
    conditions.push(gte(revisionsTable.revisionDate, today));
  }

  const rows = await db
    .select()
    .from(revisionsTable)
    .where(and(...conditions))
    .orderBy(revisionsTable.revisionDate);

  const topicIds = [...new Set(rows.map((r) => r.topicId).filter((id): id is number => id !== null))];
  const questionIds = [...new Set(rows.map((r) => r.questionId).filter((id): id is number => id !== null))];

  const topicsData =
    topicIds.length > 0
      ? await db.select().from(topicsTable).where(
          topicIds.length === 1
            ? eq(topicsTable.id, topicIds[0])
            : topicsTable.id.inArray(topicIds),
        )
      : [];

  const questionsData =
    questionIds.length > 0
      ? await db.select().from(questionsTable).where(
          questionIds.length === 1
            ? eq(questionsTable.id, questionIds[0])
            : questionsTable.id.inArray(questionIds),
        )
      : [];

  const topicMap = new Map(topicsData.map((t) => [t.id, t]));
  const questionMap = new Map(questionsData.map((q) => [q.id, q]));

  const result = rows.map((r) => {
    const topic = r.topicId ? topicMap.get(r.topicId) : null;
    const question = r.questionId ? questionMap.get(r.questionId) : null;
    return {
      id: r.id,
      revisionDate: r.revisionDate.toISOString(),
      status: r.status,
      revisionNumber: r.revisionNumber,
      topicId: r.topicId ?? null,
      topicName: topic?.name ?? null,
      questionId: r.questionId ?? null,
      questionTitle: question?.title ?? null,
      questionDifficulty: question?.difficulty ?? null,
    };
  });

  res.json(result);
});

router.patch("/revisions/:revisionId/complete", requireAuth, async (req, res): Promise<void> => {
  const params = CompleteRevisionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = getUserId(req);
  const { revisionId } = params.data;

  const [revision] = await db
    .select()
    .from(revisionsTable)
    .where(and(eq(revisionsTable.id, revisionId), eq(revisionsTable.userId, userId)));

  if (!revision) {
    res.status(404).json({ error: "Revision not found" });
    return;
  }

  const [updated] = await db
    .update(revisionsTable)
    .set({ status: "Completed" })
    .where(eq(revisionsTable.id, revisionId))
    .returning();

  const topic = updated.topicId ? (await db.select().from(topicsTable).where(eq(topicsTable.id, updated.topicId)))[0] : null;
  const question = updated.questionId ? (await db.select().from(questionsTable).where(eq(questionsTable.id, updated.questionId)))[0] : null;

  res.json({
    id: updated.id,
    revisionDate: updated.revisionDate.toISOString(),
    status: updated.status,
    revisionNumber: updated.revisionNumber,
    topicId: updated.topicId ?? null,
    topicName: topic?.name ?? null,
    questionId: updated.questionId ?? null,
    questionTitle: question?.title ?? null,
    questionDifficulty: question?.difficulty ?? null,
  });
});

export default router;
