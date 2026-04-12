// ─────────────────────────────────────────────
// LERNEN AI Module — Single Import Point
//
// Usage:
//   import { processAIRequest, routeModel, AIFeature } from "@/lib/ai";
// ─────────────────────────────────────────────

// Types
export {
  GradeTier,
  SubjectCategory,
  QueryComplexity,
  AIFeature,
  AIModel,
  ResponseSource,
  MODEL_COSTS_INR,
  routerInputSchema,
  type ModelRoutingDecision,
  type RouterInput,
  type AIRequestLog,
  type BudgetCheckResult,
} from "./types";

// Query Classifier
export {
  classifyQuery,
  categorizeSubject,
  getGradeTier,
  preprocessHinglish,
} from "./query-classifier";

// Model Router
export { routeModel, routingDecisionToLog } from "./model-router";

// Cost Tracker
export {
  calculateActualCost,
  logAIRequest,
  checkSchoolBudget,
  incrementSchoolSpend,
  updateDailyUsage,
  getCostAnalytics,
} from "./cost-tracker";

// Pipeline (main entry point)
export { processAIRequest, AIBudgetExceededError } from "./pipeline";
