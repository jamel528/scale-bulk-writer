import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import {
	generateArticle,
	generateTitles,
} from "./openai";
import { insertBatchRequestSchema, approveTitlesSchema } from "@shared/schema";
import archiver from "archiver";
import { ZodError } from "zod";
import { wsManager } from "./websocket";

const BATCH_DELAY = 5000; // Increased to 5 seconds between articles
const MAX_FAILURES_PER_BATCH = 3; // Reduced from 5 to catch issues earlier

// Function to handle title generation
async function processTitleGeneration(
	batchId: number,
	topics: string,
	keywords: string,
	count: number
) {
	try {
		// Reset progress to 0 when starting
		await storage.updateBatchRequestProgress(batchId, 0);
		let updatedBatch = await storage.getBatchRequest(batchId);
		if (updatedBatch) {
			wsManager.notifyBatchUpdate(batchId, updatedBatch);
		}

		const updateProgress = async (batchId: number, progress: number) => {
			await storage.updateBatchRequestProgress(batchId, progress);
			const updatedBatch = await storage.getBatchRequest(batchId);
			if (updatedBatch) {
				wsManager.notifyBatchUpdate(batchId, updatedBatch);
			}
			console.log(`Progress: ${progress}%`);
		};

		// Generate titles with progress tracking
		const generatedTitles = await generateTitles(
			topics,
			keywords,
			count,
			batchId,
			updateProgress
		);

		// Store the generated titles
		await storage.updateBatchRequestTitles(batchId, generatedTitles);
		const batch = await storage.updateBatchRequestStatus(
			batchId,
			"titles_ready"
		);
		wsManager.notifyBatchUpdate(batchId, batch);
		console.log(
			`Successfully generated ${generatedTitles.length} titles for batch ${batchId}`
		);
		return generatedTitles;
	} catch (error) {
		console.error(`Error generating titles for batch ${batchId}:`, error);
		await storage.updateBatchRequestStatus(batchId, "failed");
		throw error;
	}
}

// Modified to use approved titles
async function processArticleBatch(
	batchId: number,
	topics: string,
	keywords: string,
	approvedTitles: string[]
) {
	const CHUNK_SIZE = 50; // Process 10 titles at once

	try {
		let successCount = 0;
		let failureCount = 0;
		let consecutiveFailures = 0;
		let backoffDelay = BATCH_DELAY;

		// Reset progress to 0 when starting
		await storage.updateBatchRequestProgress(batchId, 0);
		let updatedBatch = await storage.getBatchRequest(batchId);
		if (updatedBatch) {
			wsManager.notifyBatchUpdate(batchId, updatedBatch);
		}

		// Process articles in chunks
		for (let chunkStart = 0; chunkStart < approvedTitles.length; chunkStart += CHUNK_SIZE) {
			const chunk = approvedTitles.slice(chunkStart, chunkStart + CHUNK_SIZE);

			// Create promises for each article in the chunk
			const chunkPromises = chunk.map(async (title, index) => {
				const globalIndex = chunkStart + index;
				try {
					console.log(
						`Processing article ${globalIndex + 1} of ${approvedTitles.length}`
					);

					const { title: generatedTitle, content } = await generateArticle(
						topics,
						keywords,
						title,
						globalIndex,
						approvedTitles.length
					);

					// Create the article
					await storage.createArticle({
						title: generatedTitle,
						content,
						topics,
						keywords,
						batchId,
						status: "completed",
					});

					successCount++;
					consecutiveFailures = 0;
					return { success: true, index: globalIndex };
				} catch (error) {
					failureCount++;
					consecutiveFailures++;
					console.error(
						`Failed to generate article ${globalIndex + 1}:`,
						error
					);

					// Create failed article entry
					await storage.createArticle({
						title,
						content: `Failed to generate article: ${error instanceof Error ? error.message : "Unknown error"}`,
						topics,
						keywords,
						batchId,
						status: "failed",
					});

					return { success: false, index: globalIndex };
				}
			});

			// Wait for all articles in chunk to complete
			const results = await Promise.all(chunkPromises);

			// Update progress after chunk completion
			const completedCount = chunkStart + chunk.length;
			const progress = Math.round((completedCount / approvedTitles.length) * 100);
			await storage.updateBatchRequestProgress(batchId, progress);

			// Get updated batch and notify clients
			updatedBatch = await storage.getBatchRequest(batchId);
			if (updatedBatch) {
				wsManager.notifyBatchUpdate(batchId, updatedBatch);
			}

			// Check if we should stop due to too many consecutive failures
			if (consecutiveFailures >= MAX_FAILURES_PER_BATCH) {
				throw new Error(
					`Too many consecutive failures (${consecutiveFailures} articles failed in a row)`
				);
			}

			// Add delay between chunks to prevent rate limiting
			const jitter = Math.floor(Math.random() * 2000);
			await new Promise((resolve) => setTimeout(resolve, backoffDelay + jitter));
		}

		// Update final status
		const status = failureCount === 0 ? "completed" : 
			failureCount === approvedTitles.length ? "failed" : 
			"completed_with_errors";

		await storage.updateBatchRequestStatus(batchId, status);
		updatedBatch = await storage.getBatchRequest(batchId);
		if (updatedBatch) {
			wsManager.notifyBatchUpdate(batchId, updatedBatch);
		}

		console.log(
			`Batch ${batchId} completed: ${successCount} succeeded, ${failureCount} failed`
		);
	} catch (error) {
		console.error(`Fatal error processing batch ${batchId}:`, error);
		await storage.updateBatchRequestStatus(batchId, "failed");
		throw error;
	}
}

export function registerRoutes(app: Express) {
	const httpServer = createServer(app);

	app.post("/api/batch", async (req, res) => {
		try {
			const data = insertBatchRequestSchema.parse(req.body);
			const batch = await storage.createBatchRequest(data);

			// Notify WebSocket clients about the new batch
			wsManager.notifyBatchUpdate(batch.id, batch);

			// Start title generation immediately
			processTitleGeneration(
				batch.id,
				data.topics,
				data.keywords,
				data.count
			).catch((error) => {
				console.error("Background title generation failed:", error);
			});

			res.json(batch);
		} catch (error) {
			if (error instanceof ZodError) {
				res.status(400).json({ error: error.errors[0].message });
			} else {
				const message =
					error instanceof Error ? error.message : "An unknown error occurred";
				res.status(500).json({ error: message });
			}
		}
	});

	app.get("/api/batch/queue", async (_req, res) => {
		try {
			const batches = await storage.getQueuedBatches();
			res.json(batches);
		} catch (error) {
			console.error("Error fetching queue:", error);
			res.status(500).json({ error: "Failed to fetch queue" });
		}
	});

	app.get("/api/batch/:id", async (req, res) => {
		try {
			const id = parseInt(req.params.id);
			if (isNaN(id)) {
				return res.status(400).json({ error: "Invalid batch ID" });
			}

			const batch = await storage.getBatchRequest(id);
			if (!batch) {
				return res.status(404).json({ error: "Batch not found" });
			}

			res.json(batch);
		} catch (error) {
			console.error("Error fetching batch:", error);
			res.status(500).json({ error: "Failed to fetch batch" });
		}
	});

	app.post("/api/batch/:id/approve", async (req, res) => {
		try {
			const id = parseInt(req.params.id);
			if (isNaN(id)) {
				return res.status(400).json({ error: "Invalid batch ID" });
			}

			const batch = await storage.getBatchRequest(id);
			if (!batch) {
				return res.status(404).json({ error: "Batch not found" });
			}

			if (batch.status !== "titles_ready") {
				return res.status(400).json({ error: "Batch is not ready for title approval" });
			}

			if (!Array.isArray(batch.generatedTitles)) {
				return res.status(400).json({ error: "No titles available" });
			}

			// Update batch status first
			await storage.updateBatchRequestStatus(id, "processing");

			// Start processing in background with titles from database
			processArticleBatch(id, batch.topics, batch.keywords, batch.generatedTitles)
				.catch(error => {
					console.error("Background article generation failed:", error);
				});

			res.json({ message: "Article generation started", batchId: id });
		} catch (error) {
			if (error instanceof ZodError) {
				res.status(400).json({ error: error.errors[0].message });
			} else {
				const message =
					error instanceof Error ? error.message : "An unknown error occurred";
				res.status(500).json({ error: message });
			}
		}
	});

	app.get("/api/batch/:id/articles", async (req, res) => {
		try {
			const id = parseInt(req.params.id);
			const articles = await storage.getArticlesByBatchId(id);
			res.json(articles);
		} catch (error) {
			console.error("Error fetching articles:", error);
			res.status(500).json({ error: "Failed to fetch articles" });
		}
	});

	app.get("/api/batch/:id/download", async (req, res) => {
		try {
			const id = parseInt(req.params.id);
			const articles = await storage.getArticlesByBatchId(id);

			// Set up response headers for zip file
			res.setHeader("Content-Type", "application/zip");
			res.setHeader(
				"Content-Disposition",
				`attachment; filename=articles-${id}.zip`
			);

			// Create zip archive
			const archive = archiver("zip", {
				zlib: { level: 9 }, // Maximum compression
			});

			// Pipe archive data to response
			archive.pipe(res);

			// Add each article as a separate file to the zip
			articles.forEach((article, index) => {
				// Only include successfully generated articles
				if (article.status === "completed") {
					// Format article with proper HTML structure
					const articleContent = `
<h1>${article.title}</h1>

${article.content}
`;
	const fileName = `article-${index + 1}.txt`;
	archive.append(articleContent, { name: fileName });
	}
	});

	// Finalize archive
	await archive.finalize();
	} catch (error) {
		console.error("Error creating zip file:", error);
		res.status(500).json({ error: "Failed to create zip file" });
	}
	});

	return httpServer;
}
