import { GoogleGenerativeAI } from "@google/generative-ai";
import { Anthropic } from "@anthropic-ai/sdk";
import type { AIModel } from "./types";

// ─────────────────────────────────────────────
// Return type for AI model calls
// ─────────────────────────────────────────────
export interface AIResult {
  answer: string;
  sources: Array<{ book: string; chapter: string; page: number }>;
  tokensIn: number;
  tokensOut: number;
}

// ─────────────────────────────────────────────
// Model ID mapping — internal name → API model ID
// ─────────────────────────────────────────────
const MODEL_ID_MAP: Record<AIModel, string> = {
  "gemini-2.0-flash": "gemini-2.0-flash",
  "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001",
  "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
  "text-embedding-3-small": "text-embedding-3-small",
};

/**
 * Core AI client factory — routes to Gemini or Claude based on model type.
 * All AI calls MUST go through this function.
 *
 * @param model       - The routed model (from model-router.ts)
 * @param systemPrompt - CBSE curriculum + role instructions
 * @param userQuery   - The student's question
 * @param maxTokens   - Max output tokens
 * @param temperature - Sampling temperature
 */
export async function callAIModel(
  model: AIModel,
  systemPrompt: string,
  userQuery: string,
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  switch (model) {
    case "gemini-2.0-flash":
      return callGeminiFlash(systemPrompt, userQuery, maxTokens, temperature);

    case "claude-haiku-4-5-20251001":
    case "claude-sonnet-4-20250514":
      return callClaude(
        model,
        systemPrompt,
        userQuery,
        maxTokens,
        temperature
      );

    default:
      throw new Error(`[ai_clients] Unsupported model: ${model}`);
  }
}

// ─────────────────────────────────────────────
// Gemini 2.0 Flash
// ─────────────────────────────────────────────
async function callGeminiFlash(
  systemPrompt: string,
  userQuery: string,
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[ai_clients] GEMINI_API_KEY is not set. Add it to .env.local"
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const result = await model.generateContent(userQuery);
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    answer: text,
    sources: extractSources(text),
    tokensIn: usage?.promptTokenCount ?? 0,
    tokensOut: usage?.candidatesTokenCount ?? 0,
  };
}

// ─────────────────────────────────────────────
// Anthropic — Claude Haiku / Sonnet
// ─────────────────────────────────────────────
async function callClaude(
  model: AIModel,
  systemPrompt: string,
  userQuery: string,
  maxTokens: number,
  temperature: number
): Promise<AIResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[ai_clients] ANTHROPIC_API_KEY is not set. Add it to .env.local"
    );
  }

  const mappedModelId = MODEL_ID_MAP[model];
  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: mappedModelId,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userQuery }],
  });

  const text =
    msg.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("") || "";

  // Estimate tokens (Anthropic doesn't always return usage on streaming responses)
  // We'll estimate based on character count as a fallback
  const tokensOut = msg.usage?.output_tokens ?? Math.ceil(text.length / 4);
  const tokensIn = msg.usage?.input_tokens ?? 0;

  return {
    answer: text,
    sources: extractSources(text),
    tokensIn,
    tokensOut,
  };
}

// ─────────────────────────────────────────────
// Source Extraction — parse [Book, Chapter, Page] references
// ─────────────────────────────────────────────
/**
 * Extracts textbook source citations from the AI response.
 * Looks for patterns like:
 *   - "Chapter 3, Page 45"
 *   - "[Physics, Chapter 5, Page 120]"
 *   - "(NCERT Class 10 Science, Chapter 4, Page 78)"
 */
function extractSources(
  answer: string
): Array<{ book: string; chapter: string; page: number }> {
  const sources: Array<{ book: string; chapter: string; page: number }> = [];

  // Pattern: "Chapter X" or "Ch. X" with optional book name
  // Format: "NCERT Class 10 Science, Chapter 4, Page 45"
  //           "Physics, Chapter 3"
  //           "[Book Title] Chapter 2 Page 100"
  const chapterPatterns = [
    // "NCERT Class 10 Science, Chapter 4, Page 45"
    /(?:NCERT\s+)?Class\s+(\d+[A-Z]?)\s+(\w+(?:\s+\w+){0,3})\s*,\s*Chapter\s+(\d+[A-Z]?)\s*(?:,\s*Page\s+(\d+))?/gi,
    // "Chapter 4, Page 45" or "Chapter 4"
    /Chapter\s+(\d+[A-Z]?)\s*(?:,\s*Page\s+(\d+))?/gi,
  ];

  const uniqueRefs = new Set<string>();

  for (const pattern of chapterPatterns) {
    let match: RegExpExecArray | null;
    // Reset lastIndex for each pattern
    pattern.lastIndex = 0;
    while ((match = pattern.exec(answer)) !== null) {
      // Pattern 0: NCERT Class 10 Science, Chapter 4, Page 45
      //   groups: [0=class, 1=subject, 2=chapter, 3=page]
      // Pattern 1: Chapter 4, Page 45
      //   groups: [0=chapter, 1=page]
      const isFullPattern = match[2] !== undefined && match[3] !== undefined;
      const book = isFullPattern ? `Class ${match[1]} ${match[2]}` : "NCERT Textbook";
      const chapterNum = isFullPattern ? match[2] : match[1];
      const pageNum = isFullPattern ? match[3] : match[2];
      const chapter = `Chapter ${chapterNum}`;
      const page = pageNum ? parseInt(pageNum, 10) : 0;

      const key = `${book}|${chapter}|${page}`;
      if (!uniqueRefs.has(key)) {
        uniqueRefs.add(key);
        sources.push({ book, chapter, page });
      }
    }
  }

  // Limit to 5 sources max
  return sources.slice(0, 5);
}

/**
 * Generates an embedding for a text query using OpenAI.
 * Used for semantic search in the RAG pipeline.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[ai_clients] OPENAI_API_KEY is not set. Add it to .env.local"
    );
  }

  const response = await fetch(
    "https://api.openai.com/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // Max 8k chars for embedding
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`[ai_clients] Embedding API error: ${response.status} ${error}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return data.data[0]?.embedding ?? [];
}
