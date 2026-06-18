import { Router, type IRouter } from "express";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import {
  db,
  topicsTable,
  userTopicProgressTable,
  questionsTable,
  userQuestionProgressTable,
  revisionsTable,
} from "@workspace/db";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const now = new Date();

  const [totalTopics] = await db.select({ count: sql<number>`count(*)::int` }).from(topicsTable);
  const [totalQuestions] = await db.select({ count: sql<number>`count(*)::int` }).from(questionsTable);

  const topicProgress = await db
    .select({ status: userTopicProgressTable.status })
    .from(userTopicProgressTable)
    .where(eq(userTopicProgressTable.userId, userId));

  const completedTopics = topicProgress.filter((p) => p.status === "Completed").length;
  const inProgressTopics = topicProgress.filter((p) => p.status === "In Progress").length;

  const questionProgress = await db
    .select({ status: userQuestionProgressTable.status })
    .from(userQuestionProgressTable)
    .where(eq(userQuestionProgressTable.userId, userId));

  const solvedQuestions = questionProgress.filter((p) => p.status === "Solved").length;
  const attemptedQuestions = questionProgress.filter((p) => p.status === "Attempted").length;

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [revisionsDueTodayRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(revisionsTable)
    .where(
      and(
        eq(revisionsTable.userId, userId),
        eq(revisionsTable.status, "Pending"),
        lte(revisionsTable.revisionDate, todayEnd),
      ),
    );

  const tomorrow = new Date(todayEnd);
  const [upcomingRevisionsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(revisionsTable)
    .where(
      and(
        eq(revisionsTable.userId, userId),
        eq(revisionsTable.status, "Pending"),
        lte(revisionsTable.revisionDate, new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
        gte(revisionsTable.revisionDate, tomorrow),
      ),
    );

  const totalT = totalTopics.count ?? 0;
  const totalQ = totalQuestions.count ?? 0;

  const overallProgress =
    totalT + totalQ > 0
      ? Math.round(((completedTopics + solvedQuestions) / (totalT + totalQ)) * 100 * 10) / 10
      : 0;

  const topicCompletionPct =
    totalT > 0 ? Math.round((completedTopics / totalT) * 100 * 10) / 10 : 0;

  res.json({
    totalTopics: totalT,
    completedTopics,
    inProgressTopics,
    totalQuestions: totalQ,
    solvedQuestions,
    attemptedQuestions,
    revisionsDueToday: revisionsDueTodayRow.count ?? 0,
    upcomingRevisions: upcomingRevisionsRow.count ?? 0,
    overallProgress,
    topicCompletionPct,
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const userId = getUserId(req);

  const completedTopicsRows = await db
    .select({
      id: userTopicProgressTable.id,
      topicId: userTopicProgressTable.topicId,
      topicName: topicsTable.name,
      completedAt: userTopicProgressTable.completedAt,
    })
    .from(userTopicProgressTable)
    .innerJoin(topicsTable, eq(userTopicProgressTable.topicId, topicsTable.id))
    .where(
      and(
        eq(userTopicProgressTable.userId, userId),
        eq(userTopicProgressTable.status, "Completed"),
      ),
    )
    .limit(10);

  const solvedQuestionsRows = await db
    .select({
      id: userQuestionProgressTable.id,
      questionId: userQuestionProgressTable.questionId,
      title: questionsTable.title,
      topicId: questionsTable.topicId,
      topicName: topicsTable.name,
      solvedAt: userQuestionProgressTable.solvedAt,
    })
    .from(userQuestionProgressTable)
    .innerJoin(questionsTable, eq(userQuestionProgressTable.questionId, questionsTable.id))
    .innerJoin(topicsTable, eq(questionsTable.topicId, topicsTable.id))
    .where(
      and(
        eq(userQuestionProgressTable.userId, userId),
        eq(userQuestionProgressTable.status, "Solved"),
      ),
    )
    .limit(10);

  const completedRevisions = await db
    .select()
    .from(revisionsTable)
    .where(and(eq(revisionsTable.userId, userId), eq(revisionsTable.status, "Completed")))
    .limit(10);

  const activity: Array<{
    id: number;
    type: string;
    title: string;
    subtitle: string | null;
    timestamp: string;
  }> = [];

  for (const t of completedTopicsRows) {
    if (t.completedAt) {
      activity.push({
        id: t.id,
        type: "topic_completed",
        title: `Completed topic: ${t.topicName}`,
        subtitle: null,
        timestamp: t.completedAt.toISOString(),
      });
    }
  }

  for (const q of solvedQuestionsRows) {
    if (q.solvedAt) {
      activity.push({
        id: q.id,
        type: "question_solved",
        title: `Solved: ${q.title}`,
        subtitle: q.topicName,
        timestamp: q.solvedAt.toISOString(),
      });
    }
  }

  for (const r of completedRevisions) {
    activity.push({
      id: r.id,
      type: "revision_completed",
      title: `Completed revision #${r.revisionNumber}`,
      subtitle: null,
      timestamp: r.revisionDate.toISOString(),
    });
  }

  activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(activity.slice(0, 20));
});

export default router;
