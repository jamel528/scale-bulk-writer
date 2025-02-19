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

        // If we haven't got enough titles yet, continue the loop
        continue;
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        throw new Error(
          "Failed to parse OpenAI response: " +
            (parseError instanceof Error
              ? parseError.message
              : "Unknown parse error")
        );
      }
    } catch (error: any) {
      attempts++;
      lastError =
        error instanceof Error ? error : new Error("Unknown error occurred");
      console.error(
        `Attempt ${attempts} failed for chunk ${chunkIndex + 1}:`,
        lastError.message
      );

      // Check for specific OpenAI errors
      if (error.response?.status === 429) {
        console.log("Rate limit hit, waiting longer before retry...");
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * 5)); // Longer delay for rate limits
        continue;
      }

      if (attempts === MAX_RETRIES) {
        throw new Error(
          `Failed to generate titles for chunk ${
            chunkIndex + 1
          } after ${MAX_RETRIES} attempts: ${lastError.message}`
        );
      }

      console.log(`Waiting ${RETRY_DELAY}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  if (allTitles.length > 0) {
    return allTitles;
  }

  throw (
    lastError ||
    new Error("Failed to generate titles: Maximum retries exceeded")
  );
}

// Main function to generate all titles
export async function generateTitles(
  topics: string,
  keywords: string,
  count: number,
  batchId: number,
  onProgress: (batchId: number, progress: number) => Promise<void>
): Promise<string[]> {
  console.log(`Starting title generation for ${count} titles`);

  // For small batches (≤ CHUNK_SIZE), generate directly
  if (count <= CHUNK_SIZE) {
    return generateTitlesChunk(
      topics,
      keywords,
      count,
      0,
      1,
      batchId,
      onProgress
    );
  }

  // For larger batches, split into chunks
  const chunks = chunkArray(Array(count).fill(null), CHUNK_SIZE);
  let allTitles: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkSize = chunks[i].length;
    console.log(
      `Generating titles for chunk ${i + 1}/${
        chunks.length
      } (${chunkSize} titles)`
    );

    const titles = await generateTitlesChunk(
      topics,
      keywords,
      chunkSize,
      i,
      chunks.length,
      batchId,
      onProgress
    );
    allTitles = [...allTitles, ...titles];
  }

  return allTitles;
}

export async function generateArticle(
  topics: string,
  keywords: string,
  title: string,
  articleIndex: number,
  totalArticles: number
): Promise<{ title: string; content: string }> {
  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < MAX_RETRIES) {
    try {
      console.log(
        `Attempt ${attempts + 1}/${MAX_RETRIES} for article ${
          articleIndex + 1
        }/${totalArticles}`
      );

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a content writer skilled in generating valid JSON. 
            
            Respond with a JSON object structured as follows:
            {
              "title": "Provided title",
              "content": "Full article content with HTML formatting"
            }
            Ensure all special characters are escaped correctly for JSON. 
      
            Write a detailed article (1200-1300 words) on the given title, using proper HTML tags:
            - <h2> for main sections
            - <h3> for subsections
            - Wrap paragraphs in <p>
            - Use <ul> or <ol> for lists
            
            Include relevant topics and keywords naturally, with examples and a professional tone.`,
          },
          {
            role: "user",
            content: `Generate article #${articleIndex + 1} of ${totalArticles}.
            Title: ${title}
            Topics: ${topics}
            Keywords: ${keywords}
            
            Ensure the article matches the title and adheres to the structure outlined above.`,
          },
        ],
        temperature: 0.9,
        max_tokens: 4096,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("OpenAI API returned empty content");
      }

      try {
        const parsed = JSON.parse(content);
        if (!parsed || !parsed.title || !parsed.content) {
          throw new Error("Invalid response format: missing required fields");
        }

        console.log(`Successfully generated article "${parsed.title}"`);
        return {
          title: parsed.title,
          content: parsed.content,
        };
      } catch (parseError) {
        throw new Error(
          "Failed to parse OpenAI response: " +
            (parseError instanceof Error
              ? parseError.message
              : "Unknown parse error")
        );
      }
    } catch (error: any) {
      attempts++;
      lastError =
        error instanceof Error ? error : new Error("Unknown error occurred");
      console.error(
        `Attempt ${attempts} failed for article ${articleIndex + 1}:`,
        lastError.message
      );

      // Check for specific OpenAI errors
      if (error.response?.status === 429) {
        console.log("Rate limit hit, waiting longer before retry...");
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * 5));
        continue;
      }

      if (attempts === MAX_RETRIES) {
        throw new Error(
          `Failed to generate article after ${MAX_RETRIES} attempts: ${lastError.message}`
        );
      }

      // Exponential backoff
      const backoffDelay = RETRY_DELAY * Math.pow(2, attempts - 1);
      console.log(`Waiting ${backoffDelay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw (
    lastError ||
    new Error("Failed to generate article: Maximum retries exceeded")
  );
}
