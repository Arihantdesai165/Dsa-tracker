import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { topicsTable } from "./topics";

export const difficultyEnum = pgEnum("difficulty", ["Easy", "Medium", "Hard"]);
export const questionStatusEnum = pgEnum("question_status", ["Not Started", "Attempted", "Solved"]);

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  difficulty: difficultyEnum("difficulty").notNull(),
  platform: text("platform").notNull(),
  link: text("link"),
});

export const userQuestionProgressTable = pgTable("user_question_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  status: questionStatusEnum("status").notNull().default("Not Started"),
  notes: text("notes"),
  solvedAt: timestamp("solved_at"),
});

export type Question = typeof questionsTable.$inferSelect;
export type UserQuestionProgress = typeof userQuestionProgressTable.$inferSelect;
