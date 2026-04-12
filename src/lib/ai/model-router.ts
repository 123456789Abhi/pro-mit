import {
  AIFeature,
  AIModel,
  GradeTier,
  ModelRoutingDecision,
  MODEL_COSTS_INR,
  QueryComplexity,
  RouterInput,
  SubjectCategory,
  routerInputSchema,
} from "./types";
import {
  classifyQuery,
  categorizeSubject,
  getGradeTier,
} from "./query-classifier";

// ─────────────────────────────────────────────
// TOKEN LIMITS — by grade tier × query complexity
// ─────────────────────────────────────────────
const TOKEN_LIMITS: Record<GradeTier, Record<QueryComplexity, number>> = {
  [GradeTier.JUNIOR]: {
    [QueryComplexity.DEFINITION]: 200,
    [QueryComplexity.SIMPLE]: 400,
    [QueryComplexity.ANALYTICAL]: 500,
    [QueryComplexity.NUMERICAL]: 500,
    [QueryComplexity.COMPLEX]: 600,
  },
  [GradeTier.MIDDLE]: {
    [QueryComplexity.DEFINITION]: 300,
    [QueryComplexity.SIMPLE]: 500,
    [QueryComplexity.ANALYTICAL]: 600,
    [QueryComplexity.NUMERICAL]: 600,
    [QueryComplexity.COMPLEX]: 800,
  },
  [GradeTier.SENIOR]: {
    [QueryComplexity.DEFINITION]: 350,
    [QueryComplexity.SIMPLE]: 500,
    [QueryComplexity.ANALYTICAL]: 700,
    [QueryComplexity.NUMERICAL]: 800,
    [QueryComplexity.COMPLEX]: 1000,
  },
};

// ─────────────────────────────────────────────
// FEATURE-LEVEL OVERRIDES — quiz/test always use specific models
// ─────────────────────────────────────────────
const FEATURE_MODEL_OVERRIDES: Partial<
  Record<AIFeature, { model: AIModel; maxTokens: number; temperature: number }>
> = {
  [AIFeature.QUIZ_GENERATION]: {
    model: AIModel.CLAUDE_HAIKU,
    maxTokens: 1000,
    temperature: 0.3,
  },
  [AIFeature.TEST_PAPER_GENERATION]: {
    model: AIModel.CLAUDE_SONNET,
    maxTokens: 1500,
    temperature: 0.2,
  },
  [AIFeature.EMBEDDINGS]: {
    model: AIModel.OPENAI_EMBEDDING,
    maxTokens: 0,
    temperature: 0,
  },
};

// ─────────────────────────────────────────────
// TEMPERATURE — by query complexity
// ─────────────────────────────────────────────
const TEMPERATURE_MAP: Record<QueryComplexity, number> = {
  [QueryComplexity.DEFINITION]: 0.1,  // Factual, no creativity
  [QueryComplexity.SIMPLE]: 0.2,
  [QueryComplexity.ANALYTICAL]: 0.3,  // Needs some reasoning flexibility
  [QueryComplexity.NUMERICAL]: 0.1,   // Math needs precision
  [QueryComplexity.COMPLEX]: 0.2,     // Precision over creativity
};

/**
 * Core model routing function.
 *
 * Decision matrix:
 * ┌──────────┬────────────────────┬──────────────┬─────────────┬──────────────────┐
 * │ Grade    │ Subject            │ Query Type   │ Model       │ max_tokens       │
 * ├──────────┼────────────────────┼──────────────┼─────────────┼──────────────────┤
 * │ 6-8      │ Any                │ Definition   │ Pre-gen     │ 0 (no API call)  │
 * │ 6-8      │ Any                │ Simple       │ Flash       │ 400              │
 * │ 6-8      │ Math               │ Numerical    │ Flash       │ 500              │
 * │ 9-10     │ Any                │ Definition   │ Pre-gen     │ 0 (no API call)  │
 * │ 9-10     │ Non-STEM           │ Simple       │ Flash       │ 500              │
 * │ 9-10     │ Math/Science       │ Numerical    │ Flash       │ 600              │
 * │ 11-12    │ Any                │ Definition   │ Pre-gen     │ 0 (no API call)  │
 * │ 11-12    │ Languages/History  │ Any          │ Flash       │ 500              │
 * │ 11-12    │ Math/Physics       │ Numerical    │ Haiku       │ 800              │
 * │ 11-12    │ Chemistry          │ Numerical    │ Haiku       │ 700              │
 * │ Any      │ Any                │ Quiz Gen     │ Haiku       │ 1000 (override)  │
 * │ Any      │ Any                │ Test Paper   │ Sonnet      │ 1500 (override)  │
 * └──────────┴────────────────────┴──────────────┴─────────────┴──────────────────┘
 */
export function routeModel(input: RouterInput): ModelRoutingDecision {
  // ── Validate input ──
  const parsed = routerInputSchema.parse(input);

  const gradeTier = getGradeTier(parsed.grade);
  const subjectCategory = categorizeSubject(parsed.subject);
  const queryComplexity = classifyQuery(parsed.query, subjectCategory);

  // ── Feature-level overrides (quiz, test, embeddings) ──
  const featureOverride = FEATURE_MODEL_OVERRIDES[parsed.feature];
  if (featureOverride) {
    return {
      ...featureOverride,
      gradeTier,
      subjectCategory,
      queryComplexity,
      feature: parsed.feature,
      estimatedCostPerCall: estimateCost(
        featureOverride.model,
        featureOverride.maxTokens
      ),
      reasoning: `Feature override: ${parsed.feature} always uses ${featureOverride.model}`,
    };
  }

  // ── Grade × Subject × Complexity routing ──
  const { model, reasoning } = selectModel(
    gradeTier,
    subjectCategory,
    queryComplexity
  );
  const maxTokens = TOKEN_LIMITS[gradeTier][queryComplexity];
  const temperature = TEMPERATURE_MAP[queryComplexity];

  return {
    model,
    maxTokens,
    temperature,
    gradeTier,
    subjectCategory,
    queryComplexity,
    feature: parsed.feature,
    estimatedCostPerCall: estimateCost(model, maxTokens),
    reasoning,
  };
}

/**
 * Selects the optimal model based on grade tier, subject, and query complexity.
 * This is where the cost savings happen.
 */
function selectModel(
  gradeTier: GradeTier,
  subjectCategory: SubjectCategory,
  queryComplexity: QueryComplexity
): { model: AIModel; reasoning: string } {
  // ── SENIOR (Class 11-12) — selective upgrades ──
  if (gradeTier === GradeTier.SENIOR) {
    // Math/Physics numericals and complex problems → Haiku (accuracy matters)
    if (
      subjectCategory === SubjectCategory.MATHEMATICS &&
      (queryComplexity === QueryComplexity.NUMERICAL ||
        queryComplexity === QueryComplexity.COMPLEX)
    ) {
      return {
        model: AIModel.CLAUDE_HAIKU,
        reasoning:
          "Senior math numerical/complex → Haiku for step-by-step accuracy",
      };
    }

    // Physics/Chemistry numericals → Haiku
    if (
      subjectCategory === SubjectCategory.PHYSICS_CHEMISTRY &&
      (queryComplexity === QueryComplexity.NUMERICAL ||
        queryComplexity === QueryComplexity.COMPLEX)
    ) {
      return {
        model: AIModel.CLAUDE_HAIKU,
        reasoning:
          "Senior physics/chemistry numerical/complex → Haiku for calculation accuracy",
      };
    }

    // Everything else at senior level → Flash (languages, social science, biology, simple queries)
    return {
      model: AIModel.GEMINI_FLASH,
      reasoning: `Senior ${subjectCategory} ${queryComplexity} → Flash (sufficient quality, lower cost)`,
    };
  }

  // ── MIDDLE (Class 9-10) — Flash for everything, slightly higher tokens ──
  if (gradeTier === GradeTier.MIDDLE) {
    // Even math/science numericals at 9-10 → Flash handles them well enough
    // Board exam questions at this level aren't as computationally complex
    return {
      model: AIModel.GEMINI_FLASH,
      reasoning: `Middle ${subjectCategory} ${queryComplexity} → Flash (9-10 complexity within Flash capability)`,
    };
  }

  // ── JUNIOR (Class 6-8) — Flash for everything, lowest tokens ──
  return {
    model: AIModel.GEMINI_FLASH,
    reasoning: `Junior ${subjectCategory} ${queryComplexity} → Flash (6-8 content is straightforward)`,
  };
}

/**
 * Estimates cost per API call in INR.
 * Assumes input tokens ≈ 500 (system prompt + context chunks + question).
 */
function estimateCost(model: AIModel, maxOutputTokens: number): number {
  const costs = MODEL_COSTS_INR[model];
  const estimatedInputTokens = 500;

  const inputCost = (estimatedInputTokens / 1_000_000) * costs.input;
  const outputCost = (maxOutputTokens / 1_000_000) * costs.output;

  return Math.round((inputCost + outputCost) * 10000) / 10000; // 4 decimal places
}

/**
 * Returns the full routing decision as a loggable summary.
 * Used for ai_request_log entries and debugging.
 */
export function routingDecisionToLog(decision: ModelRoutingDecision): string {
  return [
    `model=${decision.model}`,
    `tokens=${decision.maxTokens}`,
    `temp=${decision.temperature}`,
    `grade=${decision.gradeTier}`,
    `subject=${decision.subjectCategory}`,
    `complexity=${decision.queryComplexity}`,
    `feature=${decision.feature}`,
    `est_cost=₹${decision.estimatedCostPerCall}`,
    `reason="${decision.reasoning}"`,
  ].join(" | ");
}
