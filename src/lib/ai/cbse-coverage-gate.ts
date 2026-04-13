import { AIFeature } from "./types";

// ═══════════════════════════════════════════════════════
// CBSE Coverage Gate — Inspired by AgentHarm Quality Gates
//
// Evaluates whether AI responses meet CBSE curriculum quality standards.
// Different thresholds per feature type (inspired by Agent-Harmony quality gates).
//
// Strict for test papers (accuracy critical), moderate for chat/notes.
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface CoverageGateResult {
  passed: boolean;
  score: number;           // 0-100: % of content traceable to CBSE books
  confidence: "high" | "medium" | "low";
  action: "allow" | "warn" | "block";
  reason?: string;
  disclaimer?: string;     // Warning message to append to answer
}

// ─────────────────────────────────────────────
// Feature thresholds
// ─────────────────────────────────────────────
// Each feature has a warn threshold (below = warn) and block threshold (below = block)
const FEATURE_THRESHOLDS: Record<
  AIFeature,
  { warn: number; block: number }
> = {
  [AIFeature.GINI_CHAT]:            { warn: 60, block: 20 },
  [AIFeature.NOTES_GENERATION]:     { warn: 50, block: 10 },
  [AIFeature.SUMMARY_GENERATION]:   { warn: 50, block: 10 },
  [AIFeature.PRACTICE_DRILLS]:      { warn: 50, block: 20 },
  [AIFeature.QUIZ_GENERATION]:      { warn: 70, block: 30 },
  [AIFeature.TEST_PAPER_GENERATION]: { warn: 80, block: 40 },
  [AIFeature.LESSON_PLAN]:         { warn: 60, block: 30 },
  [AIFeature.EMBEDDINGS]:           { warn: 0, block: 0 }, // No gate for embeddings
};

// ─────────────────────────────────────────────
// Coverage Evaluator
// ─────────────────────────────────────────────
/**
 * Evaluates an AI response against CBSE curriculum coverage standards.
 *
 * Scoring model:
 * - Each cited source (book, chapter, page) adds to coverage
 * - Longer answers need more sources to score well
 * - No sources = fail for student-facing features
 *
 * @param answer       - The AI-generated response
 * @param sources      - Cited textbook sources from RAG + extraction
 * @param feature      - The AI feature being used
 * @returns CoverageGateResult with pass/fail/warn + optional disclaimer
 *
 * Inspired by Agent-Harmony's code-enforced quality gates.
 */
export function evaluateCBSECoverage(
  answer: string,
  sources: Array<{ book: string; chapter: string; page: number }>,
  feature: AIFeature
): CoverageGateResult {
  // ── No gate for embeddings ──
  if (feature === AIFeature.EMBEDDINGS) {
    return { passed: true, score: 100, confidence: "high", action: "allow" };
  }

  // ── No sources cited at all ──
  if (sources.length === 0) {
    const t = FEATURE_THRESHOLDS[feature];
    const isCritical = feature === AIFeature.TEST_PAPER_GENERATION;

    return {
      passed: false,
      score: 0,
      confidence: "high",
      action: "block",
      reason: isCritical
        ? "Test papers must cite CBSE textbook sources."
        : "This answer does not cite any textbook source.",
      disclaimer: isCritical
        ? "\n\n[Error: This content requires CBSE textbook sources. Please provide the textbook context.]"
        : "\n\n[Note: This answer may include content beyond your current textbook. Please verify with your teacher.]",
    };
  }

  // ── Calculate coverage score ──
  // Heuristic: 1 source covers ~2000 characters of content
  const estimatedContentLength = answer.length;
  const minSourcesNeeded = Math.max(1, Math.ceil(estimatedContentLength / 2000));
  const rawScore = Math.min(100, (sources.length / minSourcesNeeded) * 100);

  // ── Confidence based on source count ──
  const confidence: "high" | "medium" | "low" =
    sources.length >= 3 ? "high" :
    sources.length >= 2 ? "medium" : "low";

  // ── Determine action ──
  const t = FEATURE_THRESHOLDS[feature];
  const score = Math.round(rawScore);

  let action: "allow" | "warn" | "block";
  if (score >= t.warn) {
    action = "allow";
  } else if (score >= t.block) {
    action = "warn";
  } else {
    action = "block";
  }

  const disclaimer = action === "warn"
    ? buildDisclaimer(sources, feature, score)
    : undefined;

  return {
    passed: action === "allow",
    score,
    confidence,
    action,
    reason: action !== "allow"
      ? `CBSE coverage score: ${score}% (minimum for ${featureToLabel(feature)} is ${t.warn}%)`
      : undefined,
    disclaimer,
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function featureToLabel(feature: AIFeature): string {
  const labels: Record<AIFeature, string> = {
    [AIFeature.GINI_CHAT]: "Gini Chat",
    [AIFeature.NOTES_GENERATION]: "Notes",
    [AIFeature.SUMMARY_GENERATION]: "Summary",
    [AIFeature.PRACTICE_DRILLS]: "Practice",
    [AIFeature.QUIZ_GENERATION]: "Quiz",
    [AIFeature.TEST_PAPER_GENERATION]: "Test Paper",
    [AIFeature.LESSON_PLAN]: "Lesson Plan",
    [AIFeature.EMBEDDINGS]: "Embeddings",
  };
  return labels[feature] ?? feature;
}

function buildDisclaimer(
  sources: Array<{ book: string; chapter: string; page: number }>,
  feature: AIFeature,
  score: number
): string {
  const sourceList = sources
    .slice(0, 3)
    .map((s) => `${s.book} (${s.chapter})`)
    .join(", ");

  if (feature === AIFeature.TEST_PAPER_GENERATION) {
    return `\n\n[Warning: This test paper has a CBSE coverage score of ${score}%. ` +
      `For board exam preparation, all questions should be from the NCERT syllabus. ` +
      `Please verify the content.]`;
  }

  return `\n\n[Note: This content (${score}% coverage) includes some material from: ${sourceList}. ` +
    `Please verify with your teacher and cross-reference with your textbook.]`;
}

// ─────────────────────────────────────────────
// Pre-generation Coverage Check
// ─────────────────────────────────────────────
/**
 * Quick check before generating content — can the AI generate this?
 * Used by the Teacher Quiz Builder and Test Paper Generator.
 *
 * @param schoolId     - School to check book settings for
 * @param grade        - Class level
 * @param subject      - Subject
 * @param feature      - What content is being generated
 * @returns Whether generation should proceed and why
 */
export function preGenerateCoverageCheck(
  schoolId: string,
  grade: number,
  subject: string,
  enabledBookCount: number
): { canGenerate: boolean; reason: string } {
  // No books enabled = no coverage possible
  if (enabledBookCount === 0) {
    return {
      canGenerate: false,
      reason: `No textbooks enabled for Class ${grade} ${subject}. ` +
        "Enable at least one book in Content Pipeline before generating content.",
    };
  }

  // Test papers need multiple books for good coverage
  if (enabledBookCount < 2) {
    return {
      canGenerate: true,
      reason: `Only ${enabledBookCount} book enabled — CBSE coverage may be limited. ` +
        "Consider enabling additional textbooks for better results.",
    };
  }

  return {
    canGenerate: true,
    reason: `${enabledBookCount} textbooks enabled — ready for generation.`,
  };
}
