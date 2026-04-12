import {
  AIFeature,
  AIRequestLog,
  ResponseSource,
  RouterInput,
  ModelRoutingDecision,
} from "./types";
import { routeModel, routingDecisionToLog } from "./model-router";
import {
  calculateActualCost,
  logAIRequest,
  checkSchoolBudget,
  incrementSchoolSpend,
  updateDailyUsage,
} from "./cost-tracker";

// ─────────────────────────────────────────────
// Types for the pipeline
// ─────────────────────────────────────────────
interface SupabaseClient {
  from: (table: string) => unknown;
  rpc: (fn: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

interface AIResponse {
  answer: string;
  sources: Array<{ book: string; chapter: string; page: number }>;
  responseSource: ResponseSource;
  model: string | null;
  tokensUsed: { input: number; output: number };
  costInr: number;
  latencyMs: number;
  cached: boolean;
}

interface PregenMatch {
  id: string;
  answer: string;
  sources: Array<{ book: string; chapter: string; page: number }>;
}

interface CacheMatch {
  key: string;
  answer: string;
  sources: Array<{ book: string; chapter: string; page: number }>;
}

/**
 * Main AI pipeline — the ONLY entry point for all AI features.
 *
 * Flow:
 * 1. Validate input + check daily limits
 * 2. Check school budget
 * 3. Route to optimal model (grade × subject × complexity)
 * 4. Search pre-generated FAQ (85% hit rate, ₹0)
 * 5. Search exact cache (7% hit rate, ₹0)
 * 6. Search semantic cache (3% hit rate, ₹0.001)
 * 7. Call live API with routed model (5% of queries)
 * 8. Cache the response + log cost
 * 9. Return response
 */
export async function processAIRequest(
  supabase: SupabaseClient,
  input: RouterInput
): Promise<AIResponse> {
  const startTime = performance.now();

  // ── 1. Route model (zero-cost, runs locally) ──
  const routing: ModelRoutingDecision = routeModel(input);

  // ── 2. Check school budget ──
  const budget = await checkSchoolBudget(
    supabase as Parameters<typeof checkSchoolBudget>[0],
    input.schoolId
  );
  if (!budget.allowed) {
    throw new AIBudgetExceededError(
      input.schoolId,
      budget.currentSpend,
      budget.monthlyBudget
    );
  }

  // ── 3. Search pre-generated FAQ ──
  const pregenMatch = await searchPregenFAQ(supabase, input);
  if (pregenMatch) {
    const latencyMs = Math.round(performance.now() - startTime);
    await logAndTrack(supabase, input, routing, {
      responseSource: ResponseSource.PREGEN_FAQ,
      tokensIn: 0,
      tokensOut: 0,
      costInr: 0,
      latencyMs,
      pregenItemId: pregenMatch.id,
      cacheKey: null,
    });

    return {
      answer: pregenMatch.answer,
      sources: pregenMatch.sources,
      responseSource: ResponseSource.PREGEN_FAQ,
      model: null,
      tokensUsed: { input: 0, output: 0 },
      costInr: 0,
      latencyMs,
      cached: true,
    };
  }

  // ── 4. Search exact cache ──
  const exactCache = await searchExactCache(supabase, input);
  if (exactCache) {
    const latencyMs = Math.round(performance.now() - startTime);
    await logAndTrack(supabase, input, routing, {
      responseSource: ResponseSource.EXACT_CACHE,
      tokensIn: 0,
      tokensOut: 0,
      costInr: 0,
      latencyMs,
      pregenItemId: null,
      cacheKey: exactCache.key,
    });

    return {
      answer: exactCache.answer,
      sources: exactCache.sources,
      responseSource: ResponseSource.EXACT_CACHE,
      model: null,
      tokensUsed: { input: 0, output: 0 },
      costInr: 0,
      latencyMs,
      cached: true,
    };
  }

  // ── 5. Search semantic cache ──
  const semanticCache = await searchSemanticCache(supabase, input);
  if (semanticCache) {
    const latencyMs = Math.round(performance.now() - startTime);
    const costInr = 0.001; // Embedding cost for similarity search
    await logAndTrack(supabase, input, routing, {
      responseSource: ResponseSource.SEMANTIC_CACHE,
      tokensIn: 0,
      tokensOut: 0,
      costInr,
      latencyMs,
      pregenItemId: null,
      cacheKey: semanticCache.key,
    });

    return {
      answer: semanticCache.answer,
      sources: semanticCache.sources,
      responseSource: ResponseSource.SEMANTIC_CACHE,
      model: null,
      tokensUsed: { input: 0, output: 0 },
      costInr,
      latencyMs,
      cached: true,
    };
  }

  // ── 6. Live API call with routed model ──
  const apiResponse = await callLiveAPI(supabase, input, routing);
  const latencyMs = Math.round(performance.now() - startTime);

  const costInr = calculateActualCost(
    routing.model,
    apiResponse.tokensIn,
    apiResponse.tokensOut
  );

  // ── 7. Cache the response ──
  await cacheResponse(supabase, input, apiResponse.answer, apiResponse.sources);

  // ── 8. Log and track costs ──
  await logAndTrack(supabase, input, routing, {
    responseSource: ResponseSource.LIVE_API,
    tokensIn: apiResponse.tokensIn,
    tokensOut: apiResponse.tokensOut,
    costInr,
    latencyMs,
    pregenItemId: null,
    cacheKey: null,
  });

  // ── 9. Increment school spend ──
  await incrementSchoolSpend(
    supabase as Parameters<typeof incrementSchoolSpend>[0],
    input.schoolId,
    costInr
  );

  return {
    answer: apiResponse.answer,
    sources: apiResponse.sources,
    responseSource: ResponseSource.LIVE_API,
    model: routing.model,
    tokensUsed: { input: apiResponse.tokensIn, output: apiResponse.tokensOut },
    costInr,
    latencyMs,
    cached: false,
  };
}

// ─────────────────────────────────────────────
// Search Functions (stubs — implementation depends on Supabase queries)
// ─────────────────────────────────────────────

/**
 * Searches pre-generated FAQ by semantic similarity.
 * Uses pgvector with similarity threshold > 0.90.
 */
async function searchPregenFAQ(
  supabase: SupabaseClient,
  input: RouterInput
): Promise<PregenMatch | null> {
  const { data, error } = await supabase.rpc("search_pregen_faq", {
    p_query: input.query,
    p_grade: input.grade,
    p_subject: input.subject,
    p_topic_group: input.topicGroup ?? null,
    p_school_id: input.schoolId,
    p_similarity_threshold: 0.9,
    p_limit: 1,
  });

  if (error || !data) {return null;}

  const results = data as Array<{
    id: string;
    answer: string;
    sources: Array<{ book: string; chapter: string; page: number }>;
  }>;

  if (results.length === 0) {return null;}

  return {
    id: results[0].id,
    answer: results[0].answer,
    sources: results[0].sources ?? [],
  };
}

/**
 * Searches exact cache by SHA-256 hash of normalized query.
 */
async function searchExactCache(
  supabase: SupabaseClient,
  input: RouterInput
): Promise<CacheMatch | null> {
  const cacheKey = await hashQuery(input.query, input.grade, input.subject);

  const { data, error } = await supabase.rpc("search_exact_cache", {
    p_cache_key: cacheKey,
  });

  if (error || !data) {return null;}

  const result = data as {
    cache_key: string;
    answer: string;
    sources: Array<{ book: string; chapter: string; page: number }>;
  } | null;

  if (!result) {return null;}

  return {
    key: result.cache_key,
    answer: result.answer,
    sources: result.sources ?? [],
  };
}

/**
 * Searches semantic cache by embedding similarity > 0.92.
 */
async function searchSemanticCache(
  supabase: SupabaseClient,
  input: RouterInput
): Promise<CacheMatch | null> {
  const { data, error } = await supabase.rpc("search_semantic_cache", {
    p_query: input.query,
    p_grade: input.grade,
    p_subject: input.subject,
    p_similarity_threshold: 0.92,
  });

  if (error || !data) {return null;}

  const result = data as {
    cache_key: string;
    answer: string;
    sources: Array<{ book: string; chapter: string; page: number }>;
  } | null;

  if (!result) {return null;}

  return {
    key: result.cache_key,
    answer: result.answer,
    sources: result.sources ?? [],
  };
}

/**
 * Calls the live AI API with the routed model.
 * Handles Gemini Flash, Claude Haiku, and Claude Sonnet.
 */
async function callLiveAPI(
  _supabase: SupabaseClient,
  input: RouterInput,
  routing: ModelRoutingDecision
): Promise<{
  answer: string;
  sources: Array<{ book: string; chapter: string; page: number }>;
  tokensIn: number;
  tokensOut: number;
}> {
  // This is the integration point — actual API calls go here.
  // Implementation depends on:
  // - Gemini SDK for Flash
  // - Anthropic SDK for Haiku/Sonnet
  // - RAG context retrieval from master_chunks + school_book_settings

  // Structured placeholder with proper typing
  void routing;
  void input;

  throw new Error(
    `[ai_pipeline] callLiveAPI not yet implemented. ` +
      `Routing decision: ${routingDecisionToLog(routing)}`
  );
}

/**
 * Caches a response for future queries.
 * Both exact hash and embedding stored.
 */
async function cacheResponse(
  supabase: SupabaseClient,
  input: RouterInput,
  answer: string,
  sources: Array<{ book: string; chapter: string; page: number }>
): Promise<void> {
  const cacheKey = await hashQuery(input.query, input.grade, input.subject);

  await supabase.rpc("upsert_ai_cache", {
    p_cache_key: cacheKey,
    p_question: input.query,
    p_answer: answer,
    p_sources: JSON.stringify(sources),
    p_expires_days: 30,
  });
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function hashQuery(
  query: string,
  grade: number,
  subject: string
): Promise<string> {
  const normalized = `${grade}:${subject.toLowerCase().trim()}:${query.toLowerCase().trim().replace(/\s+/g, " ")}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logAndTrack(
  supabase: SupabaseClient,
  input: RouterInput,
  routing: ModelRoutingDecision,
  result: {
    responseSource: ResponseSource;
    tokensIn: number;
    tokensOut: number;
    costInr: number;
    latencyMs: number;
    pregenItemId: string | null;
    cacheKey: string | null;
  }
): Promise<void> {
  const log: AIRequestLog = {
    schoolId: input.schoolId,
    studentId: input.studentId ?? null,
    question: input.query,
    responseSource: result.responseSource,
    modelUsed: result.responseSource === ResponseSource.LIVE_API ? routing.model : null,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costInr: result.costInr,
    latencyMs: result.latencyMs,
    pregenItemId: result.pregenItemId,
    cacheKey: result.cacheKey,
    feature: routing.feature,
    gradeTier: routing.gradeTier,
    subjectCategory: routing.subjectCategory,
    queryComplexity: routing.queryComplexity,
  };

  await logAIRequest(
    supabase as Parameters<typeof logAIRequest>[0],
    log
  );

  if (input.studentId) {
    await updateDailyUsage(
      supabase as Parameters<typeof updateDailyUsage>[0],
      input.studentId,
      result.responseSource
    );
  }
}

// ─────────────────────────────────────────────
// Custom Errors
// ─────────────────────────────────────────────
export class AIBudgetExceededError extends Error {
  public readonly schoolId: string;
  public readonly currentSpend: number;
  public readonly budget: number;

  constructor(schoolId: string, currentSpend: number, budget: number) {
    super(
      `AI budget exceeded for school ${schoolId}: ₹${currentSpend.toFixed(2)} / ₹${budget.toFixed(2)}`
    );
    this.name = "AIBudgetExceededError";
    this.schoolId = schoolId;
    this.currentSpend = currentSpend;
    this.budget = budget;
  }
}
