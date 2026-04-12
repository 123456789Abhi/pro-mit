import { z } from "zod";

// ─────────────────────────────────────────────
// Grade Tiers — determines model capability needed
// ─────────────────────────────────────────────
export const GradeTier = {
  JUNIOR: "junior",    // Class 6-8: simple concepts, short answers
  MIDDLE: "middle",    // Class 9-10: moderate complexity, board prep starts
  SENIOR: "senior",    // Class 11-12: advanced, multi-step reasoning
} as const;

export type GradeTier = (typeof GradeTier)[keyof typeof GradeTier];

// ─────────────────────────────────────────────
// Subject Categories — determines reasoning depth needed
// ─────────────────────────────────────────────
export const SubjectCategory = {
  LANGUAGE: "language",           // Hindi, Sanskrit, English Literature
  SOCIAL_SCIENCE: "social_science", // History, Geography, Political Science, Economics
  BIOLOGY: "biology",             // Biology (conceptual, moderate reasoning)
  MATHEMATICS: "mathematics",     // Math (high reasoning, step-by-step)
  PHYSICS_CHEMISTRY: "physics_chemistry", // Physics, Chemistry (numerical + conceptual)
  COMPUTER_SCIENCE: "computer_science",   // IT, AI/Coding, Computer Science
} as const;

export type SubjectCategory = (typeof SubjectCategory)[keyof typeof SubjectCategory];

// ─────────────────────────────────────────────
// Query Complexity — classified locally, zero API cost
// ─────────────────────────────────────────────
export const QueryComplexity = {
  DEFINITION: "definition",     // "What is X?" → pre-gen FAQ first
  SIMPLE: "simple",             // Basic factual recall
  ANALYTICAL: "analytical",     // Compare, analyze, explain why
  NUMERICAL: "numerical",       // Solve, calculate, find value
  COMPLEX: "complex",           // Multi-step reasoning, proofs
} as const;

export type QueryComplexity = (typeof QueryComplexity)[keyof typeof QueryComplexity];

// ─────────────────────────────────────────────
// AI Feature — what the student/teacher is using
// ─────────────────────────────────────────────
export const AIFeature = {
  GINI_CHAT: "gini_chat",
  NOTES_GENERATION: "notes_generation",
  SUMMARY_GENERATION: "summary_generation",
  PRACTICE_DRILLS: "practice_drills",
  QUIZ_GENERATION: "quiz_generation",
  TEST_PAPER_GENERATION: "test_paper_generation",
  LESSON_PLAN: "lesson_plan",
  EMBEDDINGS: "embeddings",
} as const;

export type AIFeature = (typeof AIFeature)[keyof typeof AIFeature];

// ─────────────────────────────────────────────
// AI Models — the three models we actually use
// ─────────────────────────────────────────────
export const AIModel = {
  GEMINI_FLASH: "gemini-2.0-flash",
  CLAUDE_HAIKU: "claude-haiku-4-5-20251001",
  CLAUDE_SONNET: "claude-sonnet-4-20250514",
  OPENAI_EMBEDDING: "text-embedding-3-small",
} as const;

export type AIModel = (typeof AIModel)[keyof typeof AIModel];

// ─────────────────────────────────────────────
// Response Source — where the answer came from
// ─────────────────────────────────────────────
export const ResponseSource = {
  PREGEN_FAQ: "pregen_faq",
  EXACT_CACHE: "exact_cache",
  SEMANTIC_CACHE: "semantic_cache",
  LIVE_API: "live_api",
} as const;

export type ResponseSource = (typeof ResponseSource)[keyof typeof ResponseSource];

// ─────────────────────────────────────────────
// Model Routing Decision — output of the router
// ─────────────────────────────────────────────
export interface ModelRoutingDecision {
  model: AIModel;
  maxTokens: number;
  temperature: number;
  gradeTier: GradeTier;
  subjectCategory: SubjectCategory;
  queryComplexity: QueryComplexity;
  feature: AIFeature;
  estimatedCostPerCall: number; // in INR
  reasoning: string;           // why this model was chosen (for logging)
}

// ─────────────────────────────────────────────
// Router Input — what we know before routing
// ─────────────────────────────────────────────
export const routerInputSchema = z.object({
  grade: z.number().int().min(6).max(12),
  subject: z.string().min(1),
  query: z.string().min(1).max(2000),
  feature: z.nativeEnum(AIFeature),
  schoolId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  topicGroup: z.string().optional(),
});

export type RouterInput = z.infer<typeof routerInputSchema>;

// ─────────────────────────────────────────────
// Cost Per Million Tokens (INR) — updated April 2026
// ─────────────────────────────────────────────
export const MODEL_COSTS_INR = {
  [AIModel.GEMINI_FLASH]: { input: 6.25, output: 6.25 },
  [AIModel.CLAUDE_HAIKU]: { input: 25, output: 25 },
  [AIModel.CLAUDE_SONNET]: { input: 75, output: 75 },
  [AIModel.OPENAI_EMBEDDING]: { input: 1.7, output: 0 },
} as const;

// ─────────────────────────────────────────────
// AI Request Log — what gets written to ai_request_log
// ─────────────────────────────────────────────
export interface AIRequestLog {
  schoolId: string;
  studentId: string | null;
  question: string;
  responseSource: ResponseSource;
  modelUsed: AIModel | null;
  tokensIn: number;
  tokensOut: number;
  costInr: number;
  latencyMs: number;
  pregenItemId: string | null;
  cacheKey: string | null;
  feature: AIFeature;
  gradeTier: GradeTier;
  subjectCategory: SubjectCategory;
  queryComplexity: QueryComplexity;
}

// ─────────────────────────────────────────────
// Budget Check Result
// ─────────────────────────────────────────────
export interface BudgetCheckResult {
  allowed: boolean;
  currentSpend: number;
  monthlyBudget: number;
  remainingBudget: number;
  usagePercentage: number;
  alertTriggered: boolean;
}
