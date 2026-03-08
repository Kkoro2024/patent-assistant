import { db } from "./db";
import { qnas, type InsertQna, type QnaResponse } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getQnas(): Promise<QnaResponse[]>;
  createQna(qna: InsertQna): Promise<QnaResponse>;
}

export class DatabaseStorage implements IStorage {
  async getQnas(): Promise<QnaResponse[]> {
    return await db.select().from(qnas).orderBy(desc(qnas.createdAt));
  }

  async createQna(qna: InsertQna): Promise<QnaResponse> {
    const [newQna] = await db.insert(qnas).values(qna).returning();
    return newQna;
  }
}

export const storage = new DatabaseStorage();
