import { db, revisionsTable } from "@workspace/db";

const REVISION_DAYS = [1, 7, 30];

export async function scheduleRevisions(
  userId: number,
  opts: { topicId?: number; questionId?: number },
  baseDate: Date = new Date(),
): Promise<void> {
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
}
