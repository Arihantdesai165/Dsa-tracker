import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, notesTable, topicsTable, questionsTable } from "@workspace/db";
import { ListNotesQueryParams, CreateNoteBody, UpdateNoteParams, UpdateNoteBody, DeleteNoteParams } from "@workspace/api-zod";
import { requireAuth, getUserId } from "../lib/auth";

const router: IRouter = Router();

async function enrichNote(note: typeof notesTable.$inferSelect) {
  const topic = note.topicId
    ? (await db.select().from(topicsTable).where(eq(topicsTable.id, note.topicId)))[0]
    : null;
  const question = note.questionId
    ? (await db.select().from(questionsTable).where(eq(questionsTable.id, note.questionId)))[0]
    : null;
  return {
    id: note.id,
    content: note.content,
    topicId: note.topicId ?? null,
    topicName: topic?.name ?? null,
    questionId: note.questionId ?? null,
    questionTitle: question?.title ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

router.get("/notes", requireAuth, async (req, res): Promise<void> => {
  const queryParsed = ListNotesQueryParams.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: queryParsed.error.message });
    return;
  }

  const userId = getUserId(req);
  const { topicId, questionId } = queryParsed.data;

  const conditions = [eq(notesTable.userId, userId)];
  if (topicId) conditions.push(eq(notesTable.topicId, topicId));
  if (questionId) conditions.push(eq(notesTable.questionId, questionId));

  const notes = await db
    .select()
    .from(notesTable)
    .where(and(...conditions))
    .orderBy(notesTable.updatedAt);

  const enriched = await Promise.all(notes.map(enrichNote));
  res.json(enriched.reverse());
});

router.post("/notes", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = getUserId(req);
  const { content, topicId, questionId } = parsed.data;

  const [note] = await db
    .insert(notesTable)
    .values({ userId, content, topicId: topicId ?? null, questionId: questionId ?? null })
    .returning();

  res.status(201).json(await enrichNote(note));
});

router.patch("/notes/:noteId", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateNoteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const userId = getUserId(req);
  const { noteId } = params.data;

  const [existing] = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const [updated] = await db
    .update(notesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(notesTable.id, noteId))
    .returning();

  res.json(await enrichNote(updated));
});

router.delete("/notes/:noteId", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = getUserId(req);
  const { noteId } = params.data;

  const [existing] = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.id, noteId), eq(notesTable.userId, userId)));

  if (!existing) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  await db.delete(notesTable).where(eq(notesTable.id, noteId));
  res.json({ message: "Note deleted" });
});

export default router;
