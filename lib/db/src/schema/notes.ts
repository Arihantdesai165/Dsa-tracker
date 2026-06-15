import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { topicsTable } from "./topics";
import { questionsTable } from "./questions";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").references(() => topicsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").references(() => questionsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Note = typeof notesTable.$inferSelect;
