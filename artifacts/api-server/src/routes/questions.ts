import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, questionsTable, topicsTable, userQuestionProgressTable } from "@workspace/db";
import {
  ListQuestionsQueryParams,
  CreateQuestionBody,
  UpdateQuestionProgressParams,
  UpdateQuestionProgressBody,
} from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";
import { scheduleRevisions } from "../lib/revisionScheduler";

const router: IRouter = Router();

router.get("/questions", requireAuth, async (req, res): Promise<void> => {
  const queryParsed = ListQuestionsQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: queryParsed.error.message });
    return;
  }

  const { topicId, difficulty, status, search } = queryParsed.data;
  const userId = getUserId(req);

  const allQuestions = await db
    .select({
      id: questionsTable.id,
      topicId: questionsTable.topicId,
      topicName: topicsTable.name,
      title: questionsTable.title,
      difficulty: questionsTable.difficulty,
      platform: questionsTable.platform,
      link: questionsTable.link,
    })
    .from(questionsTable)
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .orderBy(questionsTable.id);

  const progressRows = await db
    .select()
    .from(userQuestionProgressTable)
    .where(eq(userQuestionProgressTable.userId, userId));

  const progressMap = new Map(progressRows.map((p) => [p.questionId, p]));

  let result = allQuestions.map((q) => {
    const p = progressMap.get(q.id);
    return {
      id: q.id,
      topicId: q.topicId,
      topicName: q.topicName,
      title: q.title,
      difficulty: q.difficulty,
      platform: q.platform,
      link: q.link ?? null,
      status: p?.status ?? "Not Started",
      notes: p?.notes ?? null,
      solvedAt: p?.solvedAt?.toISOString() ?? null,
    };
  });

  if (topicId) result = result.filter((q) => q.topicId === topicId);
  if (difficulty) result = result.filter((q) => q.difficulty === difficulty);
  if (status) result = result.filter((q) => q.status === status);
  if (search) {
    const lower = search.toLowerCase();
    result = result.filter((q) => q.title.toLowerCase().includes(lower));
  }

  const sortBy = queryParsed.data.sortBy;
  if (sortBy === "difficulty") {
    const order = { Easy: 0, Medium: 1, Hard: 2 } as Record<string, number>;
    result.sort((a, b) => (order[a.difficulty] ?? 0) - (order[b.difficulty] ?? 0));
  } else if (sortBy === "recentlySolved") {
    result.sort((a, b) => {
      if (!a.solvedAt && !b.solvedAt) return 0;
      if (!a.solvedAt) return 1;
      if (!b.solvedAt) return -1;
      return new Date(b.solvedAt).getTime() - new Date(a.solvedAt).getTime();
    });
  } else if (sortBy === "name") {
    result.sort((a, b) => a.title.localeCompare(b.title));
  }

  res.json(result);
});

router.post("/questions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, parsed.data.topicId));
  if (!topic) {
    res.status(404).json({ error: "Topic not found" });
    return;
  }

  const [q] = await db.insert(questionsTable).values(parsed.data).returning();

  res.status(201).json({
    id: q.id,
    topicId: q.topicId,
    topicName: topic.name,
    title: q.title,
    difficulty: q.difficulty,
    platform: q.platform,
    link: q.link ?? null,
    status: "Not Started",
    notes: null,
    solvedAt: null,
  });
});

router.patch("/questions/:questionId/progress", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateQuestionProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateQuestionProgressBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = getUserId(req);
  const { questionId } = params.data;

  const [question] = await db
    .select({ id: questionsTable.id, topicId: questionsTable.topicId, title: questionsTable.title, difficulty: questionsTable.difficulty, platform: questionsTable.platform, link: questionsTable.link })
    .from(questionsTable)
    .where(eq(questionsTable.id, questionId));

  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const [topic] = await db.select().from(topicsTable).where(eq(topicsTable.id, question.topicId));

  const existing = await db
    .select()
    .from(userQuestionProgressTable)
    .where(
      and(
        eq(userQuestionProgressTable.userId, userId),
        eq(userQuestionProgressTable.questionId, questionId),
      ),
    );

  const { status, notes } = body.data;
  const now = new Date();
  let solvedAt: Date | null = existing[0]?.solvedAt ?? null;

  if (status === "Solved" && !solvedAt) solvedAt = now;
  if (status && status !== "Solved") solvedAt = null;

  if (existing.length === 0) {
    await db.insert(userQuestionProgressTable).values({
      userId,
      questionId,
      status: status ?? "Not Started",
      notes: notes ?? null,
      solvedAt,
    });
  } else {
    await db
      .update(userQuestionProgressTable)
      .set({
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(solvedAt !== existing[0]?.solvedAt ? { solvedAt } : {}),
      })
      .where(
        and(
          eq(userQuestionProgressTable.userId, userId),
          eq(userQuestionProgressTable.questionId, questionId),
        ),
      );
  }

  if (status === "Solved") {
    await scheduleRevisions(userId, { questionId }, now);
  }

  const [updated] = await db
    .select()
    .from(userQuestionProgressTable)
    .where(
      and(
        eq(userQuestionProgressTable.userId, userId),
        eq(userQuestionProgressTable.questionId, questionId),
      ),
    );

  res.json({
    id: question.id,
    topicId: question.topicId,
    topicName: topic?.name ?? "",
    title: question.title,
    difficulty: question.difficulty,
    platform: question.platform,
    link: question.link ?? null,
    status: updated?.status ?? "Not Started",
    notes: updated?.notes ?? null,
    solvedAt: updated?.solvedAt?.toISOString() ?? null,
  });
});

export default router;
