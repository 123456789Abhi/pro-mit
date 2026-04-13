import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "./clients";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface RAGContext {
  context: string;
  sources: Array<{ book: string; chapter: string; page: number }>;
  chunkCount: number;
}

// ─────────────────────────────────────────────
// System Prompt Builder
// ─────────────────────────────────────────────
/**
 * Builds the CBSE curriculum system prompt injected into every AI call.
 * This tells the model to:
 * - Only answer from NCERT/CBSE textbooks
 * - Format answers appropriately for the grade level
 * - Include chapter and page references
 */
export function buildCBSEPrompt(
  grade: number,
  subject: string,
  feature: string
): string {
  const gradeDesc =
    grade <= 8 ? "middle school (Class 6-8)" :
    grade <= 10 ? "secondary school (Class 9-10)" :
    "senior secondary (Class 11-12)";

  const featureInstructions: Record<string, string> = {
    gini_chat:
      "Answer the student's question clearly and concisely. " +
      "If the question is outside the CBSE curriculum, politely say you can only help with textbook topics.",

    notes_generation:
      "Generate comprehensive study notes for the topic. " +
      "Include key concepts, definitions, examples, and diagrams (described in text).",

    summary_generation:
      "Provide a concise summary of the content in simple language. " +
      "Use bullet points for key takeaways.",

    practice_drills:
      "Generate practice questions including: 3 MCQs, 2 short-answer, 1 long-answer. " +
      "Include answers with brief explanations.",

    quiz_generation:
      "Generate a quiz with: 5 MCQs, 3 short-answer questions. " +
      "Include correct answers. Follow CBSE exam format.",

    test_paper_generation:
      "Generate a test paper following CBSE board exam format. " +
      "Include: Section A (MCQs), Section B (short answer), Section C (long answer). " +
      "Mark scheme should be included at the end.",

    lesson_plan:
      "Generate a detailed lesson plan for a 40-minute class. " +
      "Include learning objectives, activities, and assessment methods.",
  };

  const featureInstruction =
    featureInstructions[feature] ||
    "Answer the question clearly based on CBSE curriculum.";

  return `You are Lernen AI, an educational AI assistant for CBSE Indian schools.

You are helping a ${gradeDesc} student with ${subject}.

RULES:
1. Only use information from CBSE/NCERT textbooks. Do not make up information.
2. If you don't know something, say "This topic is not in your current syllabus" — do not guess.
3. Always cite the source: mention "Chapter X, Page Y" when referencing a textbook.
4. Use Hindi/English mixed (Hinglish) sparingly and only when it helps understanding — primary language is English.
5. Keep answers age-appropriate and focused on the CBSE curriculum.
6. Do not include any content that is not appropriate for school students.

${featureInstruction}

Remember: You represent Lernen AI. Be helpful, accurate, and curriculum-aligned.`;
}

// ─────────────────────────────────────────────
// RAG Context Fetcher
// ─────────────────────────────────────────────
/**
 * Fetches relevant textbook chunks for RAG context.
 *
 * Flow:
 * 1. Get books enabled for this school + grade + subject
 * 2. Generate query embedding (OpenAI)
 * 3. Search master_chunks via pgvector similarity
 * 4. Build context string from top chunks
 */
export async function fetchRAGContext(
  supabase: SupabaseClient,
  schoolId: string,
  query: string,
  grade: number,
  subject: string,
  maxChunks = 5
): Promise<RAGContext> {
  // Step 1: Get enabled books for this school
  const { data: bookSettings } = await supabase
    .from("school_book_settings")
    .select(
      `
      book_id,
      books:master_books (
        id,
        title,
        subject,
        class_level
      )
    `
    )
    .eq("school_id", schoolId)
    .eq("enabled", true);

  if (!bookSettings || bookSettings.length === 0) {
    return { context: "", sources: [], chunkCount: 0 };
  }

  const bookIds = bookSettings
    .map((bs) => (bs.books as unknown as { id: string })?.id)
    .filter(Boolean);

  // Step 2: Generate query embedding
  let embedding: number[];
  try {
    embedding = await generateEmbedding(query);
  } catch {
    // If embedding fails (no API key), fall back to keyword search
    return fetchRAGContextFallback(supabase, schoolId, query, grade, subject, bookIds, maxChunks);
  }

  // Step 3: Semantic search via RPC
  const { data: chunks } = await supabase.rpc("search_master_chunks", {
    p_query_embedding: embedding,
    p_school_id: schoolId,
    p_grade: grade,
    p_subject: subject.toLowerCase(),
    p_book_ids: bookIds,
    p_limit: maxChunks,
  });

  if (!chunks || chunks.length === 0) {
    return fetchRAGContextFallback(supabase, schoolId, query, grade, subject, bookIds, maxChunks);
  }

  // Step 4: Build context string
  const contextParts = (chunks as Array<{
    content: string;
    book_title: string;
    chapter: string;
    page_number: number;
  }>).map((c) => {
    const source = `[${c.book_title}, ${c.chapter}, Page ${c.page_number}]`;
    return `${source}\n${c.content}`;
  });

  const sources = (chunks as Array<{
    book_title: string;
    chapter: string;
    page_number: number;
  }>).map((c) => ({
    book: c.book_title,
    chapter: c.chapter,
    page: c.page_number,
  }));

  return {
    context: contextParts.join("\n\n"),
    sources,
    chunkCount: chunks.length,
  };
}

/**
 * Fallback: keyword-based search when embedding is unavailable.
 * Uses simple ILIKE search on master_chunks.
 */
async function fetchRAGContextFallback(
  supabase: SupabaseClient,
  schoolId: string,
  query: string,
  grade: number,
  subject: string,
  bookIds: string[],
  maxChunks: number
): Promise<RAGContext> {
  // Extract keywords from query (remove stop words)
  const stopWords = new Set([
    "what", "is", "are", "the", "a", "an", "in", "on", "at", "to", "for",
    "of", "and", "or", "how", "why", "when", "where", "who", "which",
    "explain", "describe", "define", "give", "write", "state", "list",
  ]);
  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);

  if (keywords.length === 0) {
    return { context: "", sources: [], chunkCount: 0 };
  }

  // Build search condition
  const searchCondition = keywords.map((k) => `content ILIKE '%${k}%'`).join(" OR ");

  const { data: chunks } = await supabase
    .from("master_chunks")
    .select(
      `
      content,
      chapter,
      page_number,
      book_id,
      master_books:master_books (
        title
      )
    `
    )
    .in("book_id", bookIds)
    .eq("grade", grade)
    .or(searchCondition)
    .limit(maxChunks);

  if (!chunks || chunks.length === 0) {
    return { context: "", sources: [], chunkCount: 0 };
  }

  const contextParts = chunks.map((c) => {
    const bookTitle = (c.master_books as unknown as { title: string })?.title || "NCERT";
    const source = `[${bookTitle}, ${c.chapter}, Page ${c.page_number}]`;
    return `${source}\n${c.content}`;
  });

  const sources = chunks.map((c) => ({
    book: (c.master_books as unknown as { title: string })?.title || "NCERT",
    chapter: c.chapter,
    page: c.page_number,
  }));

  return {
    context: contextParts.join("\n\n"),
    sources,
    chunkCount: chunks.length,
  };
}
