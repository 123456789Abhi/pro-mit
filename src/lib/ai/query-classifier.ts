import { QueryComplexity, SubjectCategory } from "./types";

// ─────────────────────────────────────────────
// MATH SYMBOLS — triggers NUMERICAL classification
// ─────────────────────────────────────────────
const MATH_SYMBOLS = /[∫√∑∏∂∇≈≠≤≥±×÷∞∝∠π]/;
const MATH_OPERATORS = /\d+\s*[+\-*/^=]\s*\d+/;
const MATH_FUNCTIONS = /\b(sin|cos|tan|log|ln|sqrt|lim|det|mod|gcd|lcm)\b/i;
const EQUATION_PATTERN = /\b(solve|calculate|find the value|evaluate|simplify|factori[sz]e|differentiate|integrate|prove that)\b/i;
const CHEMICAL_EQUATION = /\b(balance|reaction|equation|moles?|molarity|ph\s*=|concentration)\b/i;
const NUMERICAL_KEYWORDS = /\b(how many|how much|what is the (value|area|volume|speed|velocity|force|mass|weight|distance|time|temperature|pressure|density|acceleration|momentum|energy|power|work|frequency|wavelength|resistance|current|voltage|capacitance|inductance))\b/i;

// ─────────────────────────────────────────────
// DEFINITION — triggers pre-gen FAQ lookup first
// ─────────────────────────────────────────────
const DEFINITION_STARTERS = /^(what is|what are|what was|what were|who is|who was|who were|define|meaning of|definition of|explain the term|what do you mean by|kya hai|kya hota hai|kya hote hain|batao)\b/i;
const SHORT_DEFINITION = /^(what is|define|meaning of)\s+\w+(\s+\w+){0,4}\??$/i;

// ─────────────────────────────────────────────
// ANALYTICAL — compare, contrast, multi-part reasoning
// ─────────────────────────────────────────────
const ANALYTICAL_KEYWORDS = /\b(compare|contrast|differentiate between|difference between|distinguish between|analyze|analyse|explain why|explain how|what are the causes|what are the effects|what are the reasons|advantages and disadvantages|pros and cons|similarities and differences|critically examine|evaluate the|assess the|discuss the impact|how does .+ affect|why did .+ happen|what led to|consequences of)\b/i;

// ─────────────────────────────────────────────
// COMPLEX — multi-step reasoning, proofs, derivations
// ─────────────────────────────────────────────
const COMPLEX_KEYWORDS = /\b(derive|derivation|prove|proof|step by step|show that|demonstrate that|establish that|verify that|using .+ theorem|apply .+ principle|construct|design an experiment|case study|assertion.?reason|numerical problem|word problem)\b/i;

// ─────────────────────────────────────────────
// HINGLISH MAPPINGS — common Hindi-English mixed queries
// ─────────────────────────────────────────────
const HINGLISH_TO_ENGLISH: Record<string, string> = {
  "kya hai": "what is",
  "kya hota hai": "what is",
  "kya hote hain": "what are",
  "batao": "tell me about",
  "samjhao": "explain",
  "kaise": "how",
  "kyun": "why",
  "kyon": "why",
  "farak": "difference",
  "antar": "difference",
  "matlab": "meaning",
  "arth": "meaning",
  "paribhasha": "definition",
  "sutra": "formula",
  "sawal": "question",
  "hal karo": "solve",
  "nikal": "find",
  "hisab": "calculate",
  "ganit": "mathematics",
  "vigyan": "science",
  "bhautiki": "physics",
  "rasayan": "chemistry",
  "jeev vigyan": "biology",
  "itihas": "history",
  "bhugol": "geography",
  "arthshastra": "economics",
  "wala": "",
  "waala": "",
  "ka": "of",
  "ke": "of",
  "ki": "of",
  "mein": "in",
  "par": "on",
  "se": "from",
  "aur": "and",
  "ya": "or",
  "nahi": "not",
  "hai": "is",
  "hain": "are",
  "tha": "was",
  "the": "were",
};

/**
 * Preprocesses Hinglish queries into English for better classification.
 * Handles the 200 most common Hindi-English mixed patterns.
 *
 * Example: "faraday wala kya hai" → "faraday what is"
 */
export function preprocessHinglish(query: string): string {
  let processed = query.toLowerCase().trim();

  // Sort by length descending so longer phrases match first
  const sortedEntries = Object.entries(HINGLISH_TO_ENGLISH).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [hindi, english] of sortedEntries) {
    // Word boundary matching to avoid partial replacements
    const regex = new RegExp(`\\b${hindi}\\b`, "gi");
    processed = processed.replace(regex, english);
  }

  // Collapse multiple spaces
  return processed.replace(/\s+/g, " ").trim();
}

/**
 * Classifies a student query into a complexity tier.
 * Zero API cost — runs entirely on regex + keyword matching.
 *
 * Classification priority (first match wins):
 * 1. NUMERICAL — math symbols, equations, "solve/calculate"
 * 2. COMPLEX — derivations, proofs, multi-step problems
 * 3. ANALYTICAL — compare, contrast, "explain why"
 * 4. DEFINITION — "what is X", "define Y"
 * 5. SIMPLE — everything else
 */
export function classifyQuery(
  rawQuery: string,
  subjectCategory: SubjectCategory
): QueryComplexity {
  const query = preprocessHinglish(rawQuery);

  // ── 1. NUMERICAL — highest cost, needs best model ──
  if (
    MATH_SYMBOLS.test(query) ||
    MATH_OPERATORS.test(query) ||
    MATH_FUNCTIONS.test(query) ||
    EQUATION_PATTERN.test(query)
  ) {
    return QueryComplexity.NUMERICAL;
  }

  // Chemical equations count as numerical for physics_chemistry
  if (
    subjectCategory === SubjectCategory.PHYSICS_CHEMISTRY &&
    CHEMICAL_EQUATION.test(query)
  ) {
    return QueryComplexity.NUMERICAL;
  }

  // "How much force..." / "What is the velocity..." in STEM subjects
  if (
    (subjectCategory === SubjectCategory.MATHEMATICS ||
      subjectCategory === SubjectCategory.PHYSICS_CHEMISTRY) &&
    NUMERICAL_KEYWORDS.test(query)
  ) {
    return QueryComplexity.NUMERICAL;
  }

  // ── 2. COMPLEX — multi-step, proofs, derivations ──
  if (COMPLEX_KEYWORDS.test(query)) {
    return QueryComplexity.COMPLEX;
  }

  // ── 3. ANALYTICAL — comparison, analysis ──
  if (ANALYTICAL_KEYWORDS.test(query)) {
    return QueryComplexity.ANALYTICAL;
  }

  // ── 4. DEFINITION — short factual lookup ──
  if (DEFINITION_STARTERS.test(query) || SHORT_DEFINITION.test(query)) {
    return QueryComplexity.DEFINITION;
  }

  // ── 5. SIMPLE — default tier ──
  return QueryComplexity.SIMPLE;
}

/**
 * Maps a subject name string to its category.
 * Handles all CBSE subjects from Class 6-12.
 */
export function categorizeSubject(subject: string): SubjectCategory {
  const s = subject.toLowerCase().trim();

  // Languages
  if (
    s.includes("hindi") ||
    s.includes("sanskrit") ||
    s.includes("english")
  ) {
    return SubjectCategory.LANGUAGE;
  }

  // Mathematics
  if (s.includes("math") || s.includes("ganit")) {
    return SubjectCategory.MATHEMATICS;
  }

  // Physics / Chemistry (separate or combined science with physics/chemistry topics)
  if (
    s.includes("physics") ||
    s.includes("chemistry") ||
    s === "science" // Combined science (Class 6-10) includes physics + chemistry topics
  ) {
    return SubjectCategory.PHYSICS_CHEMISTRY;
  }

  // Biology (standalone for Class 11-12)
  if (s.includes("biology")) {
    return SubjectCategory.BIOLOGY;
  }

  // Social Sciences
  if (
    s.includes("social") ||
    s.includes("history") ||
    s.includes("geography") ||
    s.includes("political") ||
    s.includes("economics") ||
    s.includes("accountancy") ||
    s.includes("business")
  ) {
    return SubjectCategory.SOCIAL_SCIENCE;
  }

  // Computer Science / IT / AI
  if (
    s.includes("computer") ||
    s.includes("information technology") ||
    s.includes("ai") ||
    s.includes("coding")
  ) {
    return SubjectCategory.COMPUTER_SCIENCE;
  }

  // Default — treat unknown subjects as social science (safest low-cost default)
  return SubjectCategory.SOCIAL_SCIENCE;
}

/**
 * Maps a numeric grade (6-12) to its tier.
 */
export function getGradeTier(grade: number): "junior" | "middle" | "senior" {
  if (grade >= 6 && grade <= 8) {return "junior";}
  if (grade >= 9 && grade <= 10) {return "middle";}
  return "senior";
}
