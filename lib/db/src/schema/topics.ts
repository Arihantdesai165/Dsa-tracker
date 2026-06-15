import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const topicStatusEnum = pgEnum("topic_status", ["Not Started", "In Progress", "Completed"]);

export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
});

export const userTopicProgressTable = pgTable("user_topic_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").notNull().references(() => topicsTable.id, { onDelete: "cascade" }),
  status: topicStatusEnum("status").notNull().default("Not Started"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export type Topic = typeof topicsTable.$inferSelect;
export type UserTopicProgress = typeof userTopicProgressTable.$inferSelect;
