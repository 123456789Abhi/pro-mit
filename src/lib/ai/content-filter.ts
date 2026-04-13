import { sanitizeHtml } from "@/lib/notifications/sanitizer";

// ═══════════════════════════════════════════════════════
// AI Content Safety Layer — Inspired by AgentHarm
//
// Pre-flight checks on student queries before they reach the AI.
// Inspired by UK government AgentHarm benchmark for AI safety.
// ═══════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface FilterResult {
  allowed: boolean;
  reason?: string;
  sanitizedQuery?: string;
  severity: "block" | "warn" | "allow";
}

// ─────────────────────────────────────────────
// Blocklist patterns — school-unsafe / harmful content
// ─────────────────────────────────────────────
// Categories: violence, self-harm, illegal, explicit, hate
const BLOCK_PATTERNS: Array<{ pattern: RegExp; category: string; severity: "block" | "warn" }> = [
  // Illegal / harmful activities
  { pattern: /\b(bomb|explosive|how\s+to\s+make\s+a\s+bomb)\b/i, category: "illegal", severity: "block" },
  { pattern: /\b(weapon|drugs?|synthesize\s+(?:meth|cocaine|heroin))\b/i, category: "illegal", severity: "block" },
  { pattern: /\b(hack|exploit|break\s+into\s+a\s+computer)\b/i, category: "illegal", severity: "warn" },

  // Self-harm
  { pattern: /\b(self\s*harm|suicid(?:e|al)|cutting\s+yourself)\b/i, category: "self-harm", severity: "block" },
  { pattern: /\b(how\s+to\s+(?:kill|hurt)\s+(?:yourself|someone))\b/i, category: "self-harm", severity: "block" },

  // Explicit / inappropriate for school
  { pattern: /\b(porn|xxx|explicit\s+content|nude|naked)\b/i, category: "explicit", severity: "block" },
  { pattern: /\b(sexual\s+content|explicit\s+language|profanity)\b/i, category: "explicit", severity: "warn" },

  // Hate / discrimination
  { pattern: /\b(hate\s+(?:speech|crime)|discriminat(?:e|ion)\s+(?:against|with))\b/i, category: "hate", severity: "block" },

  // Deception / cheating (student trying to cheat)
  { pattern: /\b(write\s+my\s+(?:exam|test|paper)\s+for\s+me)\b/i, category: "academic-dishonesty", severity: "warn" },
  { pattern: /\b(give\s+me\s+(?:the\s+)?answers?\s+(?:for|to)\s+(?:my|the)\s+(?:exam|test))\b/i, category: "academic-dishonesty", severity: "warn" },
];

// ─────────────────────────────────────────────
// Min/Max query lengths
// ─────────────────────────────────────────────
const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 2000;

// ─────────────────────────────────────────────
// CBSE-specific content filter
// ─────────────────────────────────────────────
/**
 * Filters a student's query before it reaches the AI.
 *
 * Checks:
 * 1. Length (too short = likely spam, too long = abuse)
 * 2. Blocklist patterns (harmful/inappropriate content)
 * 3. Basic sanitization (trim whitespace, normalize)
 *
 * Inspired by AgentHarm's multi-step refusal evaluation.
 */
export function filterStudentQuery(query: string): FilterResult {
  const normalized = query.trim();

  // ── 1. Length check ──
  if (normalized.length < MIN_QUERY_LENGTH) {
    return {
      allowed: false,
      reason: "Query is too short. Please ask a complete question.",
      severity: "block",
    };
  }

  if (normalized.length > MAX_QUERY_LENGTH) {
    return {
      allowed: false,
      reason: "Query is too long. Please break it into smaller questions.",
      severity: "block",
    };
  }

  // ── 2. Pattern blocklist ──
  for (const { pattern, category, severity } of BLOCK_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        allowed: severity === "block",
        reason: `Your query contains restricted content (${category}). ` +
          (severity === "block"
            ? "This type of request cannot be processed."
            : "Please rephrase your question."),
        severity,
      };
    }
  }

  // ── 3. Basic sanitization ──
  const sanitized = normalized
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .replace(/\s+/g, " ")            // Collapse whitespace
    .trim();

  return {
    allowed: true,
    sanitizedQuery: sanitized,
    severity: "allow",
  };
}

// ─────────────────────────────────────────────
// Output Sanitizer — clean AI responses before serving to students
// ─────────────────────────────────────────────
/**
 * Sanitizes AI-generated content before it reaches students.
 *
 * Layers:
 * 1. HTML sanitizer (reuse notification sanitizer)
 * 2. Strip markdown code blocks (could contain injected instructions)
 * 3. Remove dangerous URL protocols
 * 4. Remove HTML entities that decode to dangerous content
 */
export function sanitizeAIOutput(rawOutput: string): string {
  let clean = rawOutput;

  // ── 1. Apply HTML sanitizer (strips scripts, iframes, event handlers) ──
  clean = sanitizeHtml(clean);

  // ── 2. Strip markdown code blocks (could hide prompt injection) ──
  clean = clean.replace(/```[\s\S]*?```/g, ""); // fenced code blocks
  clean = clean.replace(/`([^`]+)`/g, "$1");   // inline code

  // ── 3. Remove dangerous URL protocols in any context ──
  const DANGEROUS_PROTOCOLS = [
    "javascript:",
    "vbscript:",
    "data:",
    "file:",
    "blob:",
  ];
  for (const proto of DANGEROUS_PROTOCOLS) {
    clean = clean.replace(new RegExp(proto, "gi"), "about:blank;");
  }

  // ── 4. Remove HTML-encoded dangerous content ──
  clean = clean
    .replace(/&lt;script/gi, "&lt;removed")
    .replace(/&lt;iframe/gi, "&lt;removed")
    .replace(/on\w+\s*=/gi, "data-removed=");

  // ── 5. Remove excessive newlines (clean up output) ──
  clean = clean.replace(/\n{4,}/g, "\n\n\n").trim();

  return clean;
}
