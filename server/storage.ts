import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000; // 2 seconds
export const CHUNK_SIZE = 50; // Process titles in chunks of 50

// Helper function to chunk array into smaller pieces
function chunkArray<T>(array: T[], size: number): T[][] {
	return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
		array.slice(i * size, i * size + size)
	);
}

export async function generateTitlesChunk(
	topics: string,
	keywords: string,
	count: number,
	chunkIndex: number,
	totalChunks: number,
	batchId: number,
	updateProgress: (batchId: number, progress: number) => Promise<void>
): Promise<string[]> {
	let attempts = 0;
	let lastError: Error | null = null;
	let allTitles: string[] = [];
	const totalTitlesNeeded = count;
	const baseProgress = ((chunkIndex * count) / (count * totalChunks)) * 100;

	while (attempts < MAX_RETRIES && allTitles.length < count) {
		try {
			const remainingCount = count - allTitles.length;
			const response = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "system",
						content:
							"You are a helpful assistant that generates article titles based on given topics and keywords. " +
							"Respond with a JSON array of titles.",
					},
					{
						role: "user",
						content: `Generate ${remainingCount} unique, engaging article titles related to the following topics: ${topics}. 
							Include these keywords where natural: ${keywords}.
							This is chunk ${chunkIndex + 1} of ${totalChunks}.
							Respond with a JSON object containing an array of titles like this: {"titles": ["Title 1", "Title 2", ...]}`,
					},
				],
				temperature: 0.7,
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("No content in OpenAI response");
			}

			try {
				const parsed = JSON.parse(content) as { titles: string[] };
				if (!Array.isArray(parsed.titles)) {
					throw new Error("Titles field is not an array");
				}

				// Add each title one by one and update progress
				for (const title of parsed.titles) {
					allTitles.push(title);
					// Calculate progress based on total titles generated so far
					const currentProgress = Math.round(
						((chunkIndex * count + allTitles.length) / (count * totalChunks)) *
							100
					);
					await updateProgress(batchId, currentProgress);
				}

				if (allTitles.length >= count) {
					return allTitles.slice(0, count);
				}

				// If we havenimport OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000; // 2 seconds
export const CHUNK_SIZE = 50; // Process titles in chunks of 50

// Helper function to chunk array into smaller pieces
function chunkArray<T>(array: T[], size: number): T[][] {
	return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
		array.slice(i * size, i * size + size)
	);
}

export async function generateTitlesChunk(
	topics: string,
	keywords: string,
	count: number,
	chunkIndex: number,
	totalChunks: number,
	batchId: number,
	updateProgress: (batchId: number, progress: number) => Promise<void>
): Promise<string[]> {
	let attempts = 0;
	let lastError: Error | null = null;
	let allTitles: string[] = [];
	const totalTitlesNeeded = count;
	const baseProgress = ((chunkIndex * count) / (count * totalChunks)) * 100;

	while (attempts < MAX_RETRIES && allTitles.length < count) {
		try {
			const remainingCount = count - allTitles.length;
			const response = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "system",
						content:
							"You are a helpful assistant that generates article titles based on given topics and keywords. " +
							"Respond with a JSON array of titles.",
					},
					{
						role: "user",
						content: `Generate ${remainingCount} unique, engaging article titles related to the following topics: ${topics}. 
							Include these keywords where natural: ${keywords}.
							This is chunk ${chunkIndex + 1} of ${totalChunks}.
							Respond with a JSON object containing an array of titles like this: {"titles": ["Title 1", "Title 2", ...]}`,
					},
				],
				temperature: 0.7,
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("No content in OpenAI response");
			}

			try {
				const parsed = JSON.parse(content) as { titles: string[] };
				if (!Array.isArray(parsed.titles)) {
					throw new Error("Titles field is not an array");
				}

				// Add each title one by one and update progress
				for (const title of parsed.titles) {
					allTitles.push(title);
					// Calculate progress based on total titles generated so far
					const currentProgress = Math.round(
						((chunkIndex * count + allTitles.length) / (count * totalChunks)) *
							100
					);
					await updateProgress(batchId, currentProgress);
				}

				if (allTitles.length >= count) {
					return allTitles.slice(0, count);
				}

				// If we havenimport OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
	throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000; // 2 seconds
export const CHUNK_SIZE = 50; // Process titles in chunks of 50

// Helper function to chunk array into smaller pieces
function chunkArray<T>(array: T[], size: number): T[][] {
	return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
		array.slice(i * size, i * size + size)
	);
}

export async function generateTitlesChunk(
	topics: string,
	keywords: string,
	count: number,
	chunkIndex: number,
	totalChunks: number,
	batchId: number,
	updateProgress: (batchId: number, progress: number) => Promise<void>
): Promise<string[]> {
	let attempts = 0;
	let lastError: Error | null = null;
	let allTitles: string[] = [];
	const totalTitlesNeeded = count;
	const baseProgress = ((chunkIndex * count) / (count * totalChunks)) * 100;

	while (attempts < MAX_RETRIES && allTitles.length < count) {
		try {
			const remainingCount = count - allTitles.length;
			const response = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "system",
						content:
							"You are a helpful assistant that generates article titles based on given topics and keywords. " +
							"Respond with a JSON array of titles.",
					},
					{
						role: "user",
						content: `Generate ${remainingCount} unique, engaging article titles related to the following topics: ${topics}. 
							Include these keywords where natural: ${keywords}.
							This is chunk ${chunkIndex + 1} of ${totalChunks}.
							Respond with a JSON object containing an array of titles like this: {"titles": ["Title 1", "Title 2", ...]}`,
					},
				],
				temperature: 0.7,
			});

			const content = response.choices[0]?.message?.content;
			if (!content) {
				throw new Error("No content in OpenAI response");
			}

			try {
				const parsed = JSON.parse(content) as { titles: string[] };
				if (!Array.isArray(parsed.titles)) {
					throw new Error("Titles field is not an array");
				}

				// Add each title one by one and update progress
				for (const title of parsed.titles) {
					allTitles.push(title);
					// Calculate progress based on total titles generated so far
					const currentProgress = Math.round(
						((chunkIndex * count + allTitles.length) / (count * totalChunks)) *
							100
					);
					await updateProgress(batchId, currentProgress);
				}

				if (allTitles.length >= count) {
					return allTitles.slice(0, count);
				}

				// If we havenimport { articles, batchRequests, type Article, type InsertArticle, type BatchRequest, type InsertBatchRequest } from "@shared/schema";
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
