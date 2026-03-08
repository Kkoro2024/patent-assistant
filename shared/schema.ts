import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const qnas = pgTable("qnas", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQnaSchema = createInsertSchema(qnas).omit({ id: true, createdAt: true });

export type Qna = typeof qnas.$inferSelect;
export type InsertQna = z.infer<typeof insertQnaSchema>;
export type CreateQnaRequest = { question: string };
export type QnaResponse = Qna;