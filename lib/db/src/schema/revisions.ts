import { pgTable, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { topicsTable } from "./topics";
import { questionsTable } from "./questions";

export const revisionStatusEnum = pgEnum("revision_status", ["Pending", "Completed"]);

export const revisionsTable = pgTable("revisions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").references(() => topicsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").references(() => questionsTable.id, { onDelete: "cascade" }),
  revisionNumber: integer("revision_number").notNull().default(1),
  revisionDate: timestamp("revision_date").notNull(),
  status: revisionStatusEnum("status").notNull().default("Pending"),
});

export type Revision = typeof revisionsTable.$inferSelect;
