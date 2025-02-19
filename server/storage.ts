import { articles, batchRequests, type Article, type InsertArticle, type BatchRequest, type InsertBatchRequest } from "@shared/schema";
import { db } from "./db";
import { eq, and, asc, desc } from "drizzle-orm";

export interface IStorage {
  createBatchRequest(request: InsertBatchRequest): Promise<BatchRequest>;
  getBatchRequest(id: number): Promise<BatchRequest | undefined>;
  updateBatchRequestProgress(id: number, progress: number): Promise<BatchRequest>;
  updateBatchRequestStatus(id: number, status: string): Promise<BatchRequest>;
  updateBatchRequestTitles(id: number, titles: string[]): Promise<BatchRequest>;
  createArticle(article: InsertArticle): Promise<Article>;
  getArticlesByBatchId(batchId: number): Promise<Article[]>;
  getQueuedBatches(): Promise<BatchRequest[]>;
  getNextBatchInQueue(): Promise<BatchRequest | undefined>;
  updateBatchQueuePosition(id: number, position: number): Promise<BatchRequest>;
}

export class DatabaseStorage implements IStorage {
  async createBatchRequest(request: InsertBatchRequest): Promise<BatchRequest> {
    // Get the last queue position
    const [lastQueued] = await db
      .select({ queuePosition: batchRequests.queuePosition })
      .from(batchRequests)
      .orderBy(desc(batchRequests.queuePosition))
      .limit(1);

    const nextPosition = (lastQueued?.queuePosition || 0) + 1;

    const [batch] = await db
      .insert(batchRequests)
      .values({
        ...request,
        queuePosition: nextPosition,
      })
      .returning();
    return batch;
  }

  async getBatchRequest(id: number): Promise<BatchRequest | undefined> {
    const [batch] = await db
      .select()
      .from(batchRequests)
      .where(eq(batchRequests.id, id));
    return batch;
  }

  async updateBatchRequestProgress(id: number, progress: number): Promise<BatchRequest> {
    const [batch] = await db
      .update(batchRequests)
      .set({ progress })
      .where(eq(batchRequests.id, id))
      .returning();
    return batch;
  }

  async updateBatchRequestStatus(id: number, status: string): Promise<BatchRequest> {
    const [batch] = await db
      .update(batchRequests)
      .set({ status })
      .where(eq(batchRequests.id, id))
      .returning();
    return batch;
  }

  async updateBatchRequestTitles(id: number, titles: string[]): Promise<BatchRequest> {
    const [batch] = await db
      .update(batchRequests)
      .set({ generatedTitles: titles })
      .where(eq(batchRequests.id, id))
      .returning();
    return batch;
  }

  async createArticle(article: InsertArticle): Promise<Article> {
    const [newArticle] = await db
      .insert(articles)
      .values(article)
      .returning();
    return newArticle;
  }

  async getArticlesByBatchId(batchId: number): Promise<Article[]> {
    return db
      .select()
      .from(articles)
      .where(eq(articles.batchId, batchId));
  }

  async getQueuedBatches(): Promise<BatchRequest[]> {
    return db
      .select()
      .from(batchRequests)
      .where(eq(batchRequests.status, "pending_titles"))
      .orderBy(asc(batchRequests.queuePosition));
  }

  async getNextBatchInQueue(): Promise<BatchRequest | undefined> {
    const [nextBatch] = await db
      .select()
      .from(batchRequests)
      .where(eq(batchRequests.status, "pending_titles"))
      .orderBy(asc(batchRequests.queuePosition))
      .limit(1);

    return nextBatch;
  }

  async updateBatchQueuePosition(id: number, position: number): Promise<BatchRequest> {
    const [batch] = await db
      .update(batchRequests)
      .set({ queuePosition: position })
      .where(eq(batchRequests.id, id))
      .returning();
    return batch;
  }
}

export const storage = new DatabaseStorage();