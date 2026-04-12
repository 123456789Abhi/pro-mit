/**
 * Feedback classification utilities.
 * These are pure functions — no server actions needed.
 */

export type FeedbackTag =
  | "content_quality_positive"
  | "content_quality_negative"
  | "platform_issues"
  | "feature_requests"
  | "billing_concerns"
  | "content_gaps"
  | "ux_feedback"
  | "ai_quality"
  | "onboarding_help"
  | "general";

export function classifyFeedback(text: string): FeedbackTag[] {
  const lower = text.toLowerCase();
  const tags: FeedbackTag[] = [];

  // Content quality
  if (/excellent|amazing|great|helpful|useful|well-explained|clear/.test(lower)) {
    tags.push("content_quality_positive");
  }
  if (/poor|bad|wrong|inaccurate|confusing|unclear|not helpful|disappointing/.test(lower)) {
    tags.push("content_quality_negative");
  }

  // Platform issues
  if (/bug|error|crash|slow|loading|not working|broken|issue|problem/.test(lower)) {
    tags.push("platform_issues");
  }

  // Feature requests
  if (/wish|could you|would be nice|feature|add|please include|request/.test(lower)) {
    tags.push("feature_requests");
  }

  // Billing concerns
  if (/billing|payment|subscription|price|cost|charge|invoice|expensive|cheap/.test(lower)) {
    tags.push("billing_concerns");
  }

  // Content gaps
  if (/missing|not covered|topic|chapter|book|syllabus|content|more examples/.test(lower)) {
    tags.push("content_gaps");
  }

  // UX feedback
  if (/ui|design|interface|difficult|hard|easy|intuitive|navigation|button|menu/.test(lower)) {
    tags.push("ux_feedback");
  }

  // AI quality
  if (/gini|ai|bot|response|answer|chatbot|artificial|generated/.test(lower)) {
    tags.push("ai_quality");
  }

  // Onboarding help
  if (/setup|install|start|first|new|begin|how to|getting started|onboard/.test(lower)) {
    tags.push("onboarding_help");
  }

  if (tags.length === 0) {
    tags.push("general");
  }

  return tags;
}
