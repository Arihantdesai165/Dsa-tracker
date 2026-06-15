import { db, revisionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

const REVISION_DAYS = [1, 7, 30];

export async function scheduleRevisions(
  userId: number,
  opts: { topicId?: number; questionId?: number },
  baseDate: Date = new Date(),
): Promise<void> {
  // Prevent duplicate revisions — check if any already exist for this user + question/topic
  const conditions = [eq(revisionsTable.userId, userId)];
  if (opts.questionId !== undefined) {
    conditions.push(eq(revisionsTable.questionId, opts.questionId));
  }
  if (opts.topicId !== undefined) {
    conditions.push(eq(revisionsTable.topicId, opts.topicId));
  }

  const existing = await db
    .select({ id: revisionsTable.id })
    .from(revisionsTable)
    .where(and(...conditions))
    .limit(1);

  if (existing.length > 0) {
    logger.info({ userId, ...opts }, "Revisions already exist, skipping creation");
    return;
  }

  const rows = REVISION_DAYS.map((days, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return {
      userId,
      topicId: opts.topicId ?? null,
      questionId: opts.questionId ?? null,
      revisionNumber: i + 1,
      revisionDate: d,
      status: "Pending" as const,
    };
  });

  await db.insert(revisionsTable).values(rows);
  logger.info({ userId, ...opts, count: rows.length }, "Revisions scheduled");
}
