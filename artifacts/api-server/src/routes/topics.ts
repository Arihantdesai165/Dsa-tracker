import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, topicsTable, userTopicProgressTable, questionsTable, userQuestionProgressTable } from "@workspace/db";
import { UpdateTopicProgressParams, UpdateTopicProgressBody } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import { scheduleRevisions } from "../lib/revisionScheduler";

const router: IRouter = Router();

router.get("/topics", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);

  const topics = await db.select().from(topicsTable).orderBy(topicsTable.id);

  const progressRows = await db
    .select()
    .from(userTopicProgressTable)
    .where(eq(userTopicProgressTable.userId, userId));

  const progressMap = new Map(progressRows.map((p) => [p.topicId, p]));

  const questionCountsRaw = await db
    .select({ topicId: questionsTable.topicId, count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .groupBy(questionsTable.topicId);

  const qCountMap = new Map(questionCountsRaw.map((r) => [r.topicId, r.count]));

  const solvedCountsRaw = await db
    .select({
      topicId: questionsTable.topicId,
      count: sql<number>`count(*)::int`,
    })
    .from(userQuestionProgressTable)
    .innerJoin(questionsTable, eq(userQuestionProgressTable.questionId, questionsTable.id))
    .where(
      and(
        eq(userQuestionProgressTable.userId, userId),
        eq(userQuestionProgressTable.status, "Solved"),
      ),
    )
    .groupBy(questionsTable.topicId);

  const solvedMap = new Map(solvedCountsRaw.map((r) => [r.topicId, r.count]));

  const result = topics.map((t) => {
    const p = progressMap.get(t.id);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      status: p?.status ?? "Not Started",
      startedAt: p?.startedAt?.toISOString() ?? null,
      completedAt: p?.completedAt?.toISOString() ?? null,
      questionCount: qCountMap.get(t.id) ?? 0,
      solvedCount: solvedMap.get(t.id) ?? 0,
    };
  });

  res.json(result);
});

router.patch("/topics/:topicId/progress", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateTopicProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateTopicProgressBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = getUserId(req);
  const { topicId } = params.data;
  const { status } = body.data;

  const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, topicId));
  if (!topic) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }

  const now = new Date();
  const existing = await db
    .select()
    .from(userTopicProgressTable)
    .where(
      and(
        eq(userTopicProgressTable.userId, userId),
        eq(userTopicProgressTable.topicId, topicId),
      ),
    );

  let startedAt: Date | null = existing[0]?.startedAt ?? null;
  let completedAt: Date | null = existing[0]?.completedAt ?? null;

  if (status === "In Progress" && !startedAt) startedAt = now;
  if (status === "Completed") {
    if (!startedAt) startedAt = now;
    completedAt = now;
  }
  if (status === "Not Started") {
    startedAt = null;
    completedAt = null;
  }

  if (existing.length === 0) {
    await db.insert(userTopicProgressTable).values({ userId, topicId, status, startedAt, completedAt });
  } else {
    await db
      .update(userTopicProgressTable)
      .set({ status, startedAt, completedAt })
      .where(
        and(
          eq(userTopicProgressTable.userId, userId),
          eq(userTopicProgressTable.topicId, topicId),
        ),
      );
  }

  if (status === "Completed") {
    await scheduleRevisions(userId, { topicId }, now);
  }

  const questionCountRaw = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questionsTable)
    .where(eq(questionsTable.topicId, topicId));

  const solvedCountRaw = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userQuestionProgressTable)
    .innerJoin(questionsTable, eq(userQuestionProgressTable.questionId, questionsTable.id))
    .where(
      and(
        eq(userQuestionProgressTable.userId, userId),
        eq(userQuestionProgressTable.status, "Solved"),
        eq(questionsTable.topicId, topicId),
      ),
    );

  res.json({
    id: topic.id,
    name: topic.name,
    description: topic.description,
    status,
    startedAt: startedAt?.toISOString() ?? null,
    completedAt: completedAt?.toISOString() ?? null,
    questionCount: questionCountRaw[0]?.count ?? 0,
    solvedCount: solvedCountRaw[0]?.count ?? 0,
  });
});

export default router;
