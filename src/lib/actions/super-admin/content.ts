"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────
// Schema Definitions
// ─────────────────────────────────────────────

const BookStatus = z.enum(["pending", "processing", "ready", "failed"]);
type BookStatus = z.infer<typeof BookStatus>;

const BookType = z.enum(["Textbook", "Reference", "Previous Paper", "Q&A"]);
type BookType = z.infer<typeof BookType>;

const UploadBookSchema = z.object({
  title: z.string().min(1).max(200),
  grade: z.number().int().min(6).max(12),
  subject: z.string().min(1).max(100),
  type: BookType,
  author: z.string().min(1).max(200).optional().default("NCERT"),
  file: z.instanceof(File),
});

const PregenType = z.enum(["Notes", "Summaries", "FAQ", "Quizzes", "Drills", "Study Plans"]);
type PregenType = z.infer<typeof PregenType>;


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface MasterBook {
  id: string;
  title: string;
  grade: number;
  subject: string;
  type: BookType;
  author: string | null;
  processing_status: BookStatus;
  chunks_count: number;
  chapters_count: number;
  topics_count: number;
  pdf_url: string | null;
  school_id: string | null; // null = shared across all schools
  is_active: boolean;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessingJob {
  id: string;
  book_id: string;
  book_title: string;
  status: "pending" | "processing" | "ready" | "failed";
  stage: "extract" | "chunk" | "embed" | "pregen";
  stage_progress: number;
  queue_position: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface PregenContent {
  id: string;
  book_id: string;
  book_title: string;
  chapter_number: number;
  chapter_title: string;
  grade: number;
  subject: string;
  type: PregenType;
  content_url: string | null;
  hit_count: number;
  created_at: string;
}

export interface CoverageData {
  grade: number;
  subject: string;
  total_chapters: number;
  covered_chapters: number;
  coverage_notes: number;
  coverage_summaries: number;
  coverage_faq: number;
  coverage_quizzes: number;
  coverage_drills: number;
  coverage_percentage: number;
}

export interface UsageStats {
  total_requests: number;
  pregen_hit_rate: number;
  cache_hit_rate: number;
  cost_savings_inr: number;
  subject_breakdown: Array<{
    subject: string;
    requests: number;
    percentage: number;
  }>;
  top_pregen_content: Array<{
    id: string;
    type: PregenType;
    book_title: string;
    chapter: string;
    hits: number;
  }>;
}

export interface ArchivedBook {
  id: string;
  title: string;
  grade: number;
  subject: string;
  type: BookType;
  deleted_at: string;
  deleted_by: string | null;
  version_history: Array<{
    version: number;
    uploaded_at: string;
    replaced_by: string | null;
  }>;
}

// ─────────────────────────────────────────────
// Library Actions
// ─────────────────────────────────────────────

export async function getLibraryBooks(filters?: {
  grade?: number;
  subject?: string;
  type?: BookType;
  status?: BookStatus;
  cursor?: string;
  pageSize?: number;
}): Promise<{
  books: MasterBook[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}> {
  const supabase = await createSupabaseServer() as any;
  const pageSize = filters?.pageSize ?? 20;

  let query = supabase
  .from("master_books")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .is("school_id", null) // Only master books (shared)
    .order("created_at", { ascending: false })
    .limit(pageSize + 1);

  if (filters?.grade) {
    query = query.eq("grade", filters.grade);
  }
  if (filters?.subject) {
    query = query.ilike("subject", `%${filters.subject}%`);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.status) {
    query = query.eq("processing_status", filters.status);
  }
  if (filters?.cursor) {
    query = query.lt("created_at", filters.cursor);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch library books: ${error.message}`);
  }

  const books = (data ?? []) as MasterBook[];
  const hasMore = books.length > pageSize;
  if (hasMore) {books.pop();}

  return {
    books,
    nextCursor: hasMore ? books[books.length - 1]?.created_at ?? null : null,
    hasMore,
    totalCount: count ?? 0,
  };
}

export async function toggleBookEnabled(bookId: string, enabled: boolean): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServer() as any;

  const { error } = await supabase
  .from("master_books")
    .update({ is_active: enabled, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(`Failed to toggle book status: ${error.message}`);
  }

  revalidatePath("/super-admin/content");
  return { success: true };
}

export async function reprocessBook(bookId: string): Promise<{ success: boolean; jobId: string }> {
  // @ts-ignore
  const admin = createSupabaseAdmin() as any;

  // Create a new processing job
  const { data: job, error: jobError } = await admin
  .from("processing_jobs")
    .insert({
      book_id: bookId,
      status: "pending",
      stage: "extract",
      stage_progress: 0,
    })
    .select()
    .single();

  if (jobError) {
    throw new Error(`Failed to create processing job: ${jobError.message}`);
  }

  // Reset book status to pending
  await admin
  .from("master_books")
    .update({
      processing_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookId);

  revalidatePath("/super-admin/content");
  return { success: true, jobId: job.id };
}

// ─────────────────────────────────────────────
// Upload Actions
// ─────────────────────────────────────────────

export async function uploadBook(formData: FormData): Promise<{ success: boolean; bookId?: string; error?: string }> {
  const parsed = UploadBookSchema.safeParse({
    title: formData.get("title"),
    grade: Number(formData.get("grade")),
    subject: formData.get("subject"),
    type: formData.get("type"),
    author: formData.get("author") || "NCERT",
    file: formData.get("file"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as unknown as string };
  }

  const { title, grade, subject, type, author, file } = parsed.data;

  // Validate PDF magic bytes (PDF files start with %PDF-)
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer.slice(0, 5));
  const header = String.fromCharCode(...bytes);

  if (!header.startsWith("%PDF-")) {
    return { success: false, error: "File must be a valid PDF" };
  }

  // @ts-ignore
  const admin = createSupabaseAdmin() as any;

  // Upload file to Supabase Storage
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { data: _uploadData, error: uploadError } = await admin.storage
  .from("master-books")
    .upload(fileName, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, error: `Failed to upload file: ${uploadError.message}` };
  }

  // Get public URL
  const { data: urlData } = admin.storage.from("master-books").getPublicUrl(fileName);

  // Create master book record
  const { data: book, error: bookError } = await admin
  .from("master_books")
    .insert({
      title,
      grade,
      subject,
      type,
      author,
      processing_status: "pending",
      pdf_url: urlData.publicUrl,
      is_active: false, // Disabled until processing completes
      version: 1,
    })
    .select()
    .single();

  if (bookError) {
    // Try to clean up the uploaded file
    await admin.storage.from("master-books").delete(fileName);
    return { success: false, error: `Failed to create book record: ${bookError.message}` };
  }

  // Create initial processing job
  await admin.from("processing_jobs").insert({
    book_id: book.id,
    status: "pending",
    stage: "extract",
    stage_progress: 0,
  });

  revalidatePath("/super-admin/content");
  return { success: true, bookId: book.id };
}

// ─────────────────────────────────────────────
// Processing Queue Actions
// ─────────────────────────────────────────────

export async function getProcessingQueue(): Promise<{
  jobs: ProcessingJob[];
  pendingCount: number;
  processingCount: number;
}> {
  const supabase = await createSupabaseServer() as any;

  const { data: jobs, error } = await supabase
  .from("processing_jobs")
    .select(`
      id,
      book_id,
      status,
      stage,
      stage_progress,
      queue_position,
      error_message,
      started_at,
      completed_at,
      created_at,
      book:master_books!inner(title)
    `)
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch processing queue: ${error.message}`);
  }

  const processedJobs: ProcessingJob[] = (jobs ?? []).map((job: Record<string, unknown>) => ({
    ...job,
    book_title: (job.book as Record<string, unknown>)?.title as string ?? "Unknown",
  })) as ProcessingJob[];

  return {
    jobs: processedJobs,
    pendingCount: processedJobs.filter((j) => j.status === "pending").length,
    processingCount: processedJobs.filter((j) => j.status === "processing").length,
  };
}

export async function triggerPregen(bookId: string, chapterNumber?: number): Promise<{ success: boolean }> {
  // @ts-ignore
  const admin = createSupabaseAdmin() as any;

  // Create a pregen job
  const { error } = await admin.from("pregen_jobs").insert({
    book_id: bookId,
    chapter_number: chapterNumber,
    status: "pending",
    type: "Notes", // Default to Notes, can be expanded
  });

  if (error) {
    throw new Error(`Failed to trigger pregen: ${error.message}`);
  }

  revalidatePath("/super-admin/content");
  return { success: true };
}

export async function retryFailedJob(jobId: string): Promise<{ success: boolean }> {
  // @ts-ignore
  const admin = createSupabaseAdmin() as any;

  const { error } = await admin
  .from("processing_jobs")
    .update({
      status: "pending",
      stage: "extract",
      stage_progress: 0,
      error_message: null,
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to retry job: ${error.message}`);
  }

  revalidatePath("/super-admin/content");
  return { success: true };
}

// ─────────────────────────────────────────────
// Pre-gen Content Actions
// ─────────────────────────────────────────────

export async function getPregenContent(filters?: {
  bookId?: string;
  grade?: number;
  subject?: string;
  type?: PregenType;
  cursor?: string;
  pageSize?: number;
}): Promise<{
  items: PregenContent[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}> {
  const supabase = await createSupabaseServer() as any;
  const pageSize = filters?.pageSize ?? 20;

  let query = supabase
  .from("pregen_content")
    .select(`
      id,
      book_id,
      chapter_number,
      chapter_title,
      grade,
      subject,
      type,
      content_url,
      hit_count,
      created_at,
      book:master_books!inner(title)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(pageSize + 1);

  if (filters?.bookId) {
    query = query.eq("book_id", filters.bookId);
  }
  if (filters?.grade) {
    query = query.eq("grade", filters.grade);
  }
  if (filters?.subject) {
    query = query.ilike("subject", `%${filters.subject}%`);
  }
  if (filters?.type) {
    query = query.eq("type", filters.type);
  }
  if (filters?.cursor) {
    query = query.lt("created_at", filters.cursor);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch pregen content: ${error.message}`);
  }

  const items = (data ?? []).map((item: Record<string, unknown>) => ({
    ...item,
    book_title: (item.book as Record<string, unknown>)?.title as string ?? "Unknown",
  })) as PregenContent[];

  const hasMore = items.length > pageSize;
  if (hasMore) {items.pop();}

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.created_at ?? null : null,
    hasMore,
    totalCount: count ?? 0,
  };
}

export async function triggerPregenGeneration(
  bookId: string,
  chapterNumber: number,
  type: PregenType
): Promise<{ success: boolean }> {
  // @ts-ignore
  const admin = createSupabaseAdmin() as any;

  const { error } = await admin.from("pregen_jobs").insert({
    book_id: bookId,
    chapter_number: chapterNumber,
    type,
    status: "pending",
  });

  if (error) {
    throw new Error(`Failed to trigger generation: ${error.message}`);
  }

  revalidatePath("/super-admin/content");
  return { success: true };
}

// ─────────────────────────────────────────────
// Coverage Actions
// ─────────────────────────────────────────────

export async function getCoverageData(): Promise<{
  coverage: CoverageData[];
  overallCoverage: number;
  schoolsBelowThreshold: Array<{ school_id: string; school_name: string; coverage: number }>;
}> {
  const supabase = await createSupabaseServer() as any;

  // Get pregen content grouped by grade and subject
  const { data: _pregenData, error: pregenError } = await supabase
  .from("pregen_content")
    .select("grade, subject, type, chapter_number");
  const pregenData = _pregenData as any[];

  if (pregenError) {
    throw new Error(`Failed to fetch coverage data: ${pregenError.message}`);
  }

  // Get master books to know total chapters per grade/subject
  const { data: _books, error: booksError } = await supabase
  .from("master_books")
    .select("grade, subject, chapters_count")
    .is("deleted_at", null) as any;
  const books = _books as any[];

  if (booksError) {
    throw new Error(`Failed to fetch books: ${booksError.message}`);
  }

  // Get schools for below-threshold check
  const { data: _schools, error: schoolsError } = await supabase
  .from("schools")
    .select("id, name");
  const schools = _schools as any[];

  if (schoolsError) {
    throw new Error(`Failed to fetch schools: ${schoolsError.message}`);
  }

  // Calculate coverage by grade and subject
  const coverageMap = new Map<string, CoverageData>();
  const GRADES = [6, 7, 8, 9, 10, 11, 12];
  const SUBJECTS = ["Mathematics", "Science", "English", "Hindi", "Social Science", "Sanskrit"];

  for (const grade of GRADES) {
    for (const subject of SUBJECTS) {
      const key = `${grade}-${subject}`;
      const chaptersCount = books
        ?.filter((b) => b.grade === grade && b.subject === subject)
        .reduce((sum, b) => sum + (b.chapters_count ?? 0), 0) ?? 12; // Default to 12 chapters

      const pregenItems = pregenData?.filter((p) => p.grade === grade && p.subject === subject) ?? [];

      const coverage_notes = pregenItems.filter((p) => p.type === "Notes").length;
      const coverage_summaries = pregenItems.filter((p) => p.type === "Summaries").length;
      const coverage_faq = pregenItems.filter((p) => p.type === "FAQ").length;
      const coverage_quizzes = pregenItems.filter((p) => p.type === "Quizzes").length;
      const coverage_drills = pregenItems.filter((p) => p.type === "Drills").length;

      const _totalTypes = 5;
      const covered_chapters = new Set(pregenItems.map((p) => p.chapter_number)).size;
      const coverage_percentage = chaptersCount > 0
        ? Math.round((covered_chapters / chaptersCount) * 100)
        : 0;

      coverageMap.set(key, {
        grade,
        subject,
        total_chapters: chaptersCount,
        covered_chapters: covered_chapters,
        coverage_notes,
        coverage_summaries,
        coverage_faq,
        coverage_quizzes,
        coverage_drills,
        coverage_percentage,
      });
    }
  }

  const coverage = Array.from(coverageMap.values()).sort((a, b) => {
    if (a.grade !== b.grade) {return a.grade - b.grade;}
    return a.subject.localeCompare(b.subject);
  });

  const overallCoverage = coverage.length > 0
    ? Math.round(coverage.reduce((sum, c) => sum + c.coverage_percentage, 0) / coverage.length)
    : 0;

  return {
    coverage,
    overallCoverage,
    schoolsBelowThreshold: [], // Would require school-level pregen tracking
  };
}

// ─────────────────────────────────────────────
// Usage Analytics Actions
// ─────────────────────────────────────────────

export async function getUsageAnalytics(dateRange?: {
  start: string;
  end: string;
}): Promise<UsageStats> {
  const supabase = await createSupabaseServer() as any;


  const { data: _logs, error } = await supabase
  .from("ai_request_logs")
    .select("response_source, pregen_item_id, subject, tokens_in, tokens_out, cost_inr, created_at");
  const logs = _logs as any[];

  if (error) {
    throw new Error(`Failed to fetch usage analytics: ${error.message}`);
  }

  const totalRequests = logs?.length ?? 0;
  const pregenHits = logs?.filter((l) => l.response_source === "PREGEN_FAQ" || l.response_source === "PREGEN_NOTES").length ?? 0;
  const cacheHits = logs?.filter((l) => l.response_source === "EXACT_CACHE" || l.response_source === "SEMANTIC_CACHE").length ?? 0;

  const pregenHitRate = totalRequests > 0 ? (pregenHits / totalRequests) * 100 : 0;
  const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

  // Calculate cost savings (live API cost vs cached cost)
  const liveAPICost = logs
    ?.filter((l) => l.response_source === "LIVE_API")
    .reduce((sum, l) => sum + (l.cost_inr ?? 0), 0) ?? 0;

  const cachedCost = logs
    ?.filter((l) => l.response_source !== "LIVE_API")
    .reduce((sum, l) => sum + (l.cost_inr ?? 0), 0) ?? 0;

  const costSavingsInr = Math.max(0, liveAPICost * 0.5 - cachedCost); // Estimate 50% savings

  // Subject breakdown
  const subjectCounts = new Map<string, number>();
  logs?.forEach((l) => {
    const subject = l.subject ?? "Unknown";
    subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
  });

  const subjectBreakdown = Array.from(subjectCounts.entries())
    .map(([subject, requests]) => ({
      subject,
      requests,
      percentage: totalRequests > 0 ? Math.round((requests / totalRequests) * 100) : 0,
    }))
    .sort((a, b) => b.requests - a.requests);

  // Top pregen content (would need a join with pregen_content table)
  const topPregenContent: Array<{
    id: string;
    type: PregenType;
    book_title: string;
    chapter: string;
    hits: number;
  }> = [];

  return {
    total_requests: totalRequests,
    pregen_hit_rate: Math.round(pregenHitRate * 10) / 10,
    cache_hit_rate: Math.round(cacheHitRate * 10) / 10,
    cost_savings_inr: Math.round(costSavingsInr * 100) / 100,
    subject_breakdown: subjectBreakdown,
    top_pregen_content: topPregenContent,
  };
}

// ─────────────────────────────────────────────
// Archived Actions
// ─────────────────────────────────────────────

export async function getArchivedBooks(): Promise<{
  books: ArchivedBook[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const supabase = await createSupabaseServer() as any;

  const { data, error } = await supabase
  .from("master_books")
    .select(`
      id,
      title,
      grade,
      subject,
      type,
      deleted_at,
      version,
      created_at
    `)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(21);

  if (error) {
    throw new Error(`Failed to fetch archived books: ${error.message}`);
  }

  const books = (data ?? []).map((book: Record<string, unknown>) => ({
    id: book.id as string,
    title: book.title as string,
    grade: book.grade as number,
    subject: book.subject as string,
    type: book.type as BookType,
    deleted_at: book.deleted_at as string,
    deleted_by: null,
    version_history: [
      {
        version: book.version as number,
        uploaded_at: book.created_at as string,
        replaced_by: null,
      },
    ],
  })) as ArchivedBook[];

  const hasMore = books.length > 20;
  if (hasMore) {books.pop();}

  return {
    books,
    nextCursor: hasMore ? books[books.length - 1]?.deleted_at ?? null : null,
    hasMore,
  };
}

export async function restoreBook(bookId: string): Promise<{ success: boolean }> {
  const supabase = await createSupabaseServer() as any;

  const { error } = await supabase
  .from("master_books")
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookId);

  if (error) {
    throw new Error(`Failed to restore book: ${error.message}`);
  }

  revalidatePath("/super-admin/content");
  return { success: true };
}

export async function archiveAndReplace(
  oldBookId: string,
  newBookId: string
): Promise<{ success: boolean }> {
  // @ts-ignore
  const admin = createSupabaseAdmin() as any;
  const now = new Date().toISOString();

  // Soft delete the old book
  const { error: deleteError } = await admin
  .from("master_books")
    .update({
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", oldBookId);

  if (deleteError) {
    throw new Error(`Failed to archive old book: ${deleteError.message}`);
  }

  // Link old content to new book (via version tracking)
  // This would require a content migration step
  revalidatePath("/super-admin/content");
  return { success: true };
}
