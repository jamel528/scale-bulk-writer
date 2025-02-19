import { pgTable, text, serial, integer, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  topics: text("topics").notNull(),
  keywords: text("keywords").notNull(),
  status: text("status").notNull().default("pending"),
  batchId: integer("batch_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const batchRequests = pgTable("batch_requests", {
  id: serial("id").primaryKey(),
  topics: text("topics").notNull(),
  keywords: text("keywords").notNull(),
  count: integer("count").notNull(),
  status: text("status").notNull().default("pending_titles"),
  progress: integer("progress").notNull().default(0),
  generatedTitles: json("generated_titles").default('[]'),
  queuePosition: integer("queue_position"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({ 
  id: true,
  createdAt: true 
});

export const insertBatchRequestSchema = createInsertSchema(batchRequests)
  .omit({ 
    id: true, 
    createdAt: true,
    progress: true,
    status: true,
    generatedTitles: true,
    queuePosition: true
  })
  .extend({
    count: z.number().min(1).max(2500),
    topics: z.string().min(1, "Topics are required"),
    keywords: z.string().min(1, "Keywords are required"),
  });

// Schema for approving titles
export const approveTitlesSchema = z.object({
  titles: z.array(z.string())
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type BatchRequest = typeof batchRequests.$inferSelect;
export type InsertBatchRequest = z.infer<typeof insertBatchRequestSchema>;
export type ApproveTitles = z.infer<typeof approveTitlesSchema>;