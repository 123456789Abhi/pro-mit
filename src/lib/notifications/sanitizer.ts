import { ALLOWED_HTML_TAGS, MAX_RICH_TEXT_NESTING_DEPTH } from "./types";

// ═══════════════════════════════════════════════════════
// HTML SANITIZER — Fix #13, #31
// Server-side sanitization for notification rich text.
// Strips all tags not in whitelist. Limits nesting depth.
// ═══════════════════════════════════════════════════════

/**
 * Tag pattern — matches opening, closing, and self-closing tags.
 * Captures tag name in group 1 (for opening) or group 2 (for closing).
 */
const TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;

/**
 * Dangerous attribute patterns — event handlers and javascript URIs.
 */
const DANGEROUS_ATTRS = [
  /\bon\w+\s*=/gi,         // onclick=, onload=, onerror=, etc.
  /javascript\s*:/gi,       // javascript: in any attribute
  /vbscript\s*:/gi,         // vbscript: in any attribute
  /data\s*:/gi,             // data: URIs (can embed scripts)
  /expression\s*\(/gi,      // CSS expression()
  /url\s*\(/gi,             // CSS url() injection
];

/**
 * Sanitizes HTML content for safe rendering.
 *
 * Rules:
 * - Only whitelisted tags are kept (ALLOWED_HTML_TAGS)
 * - All event handler attributes are stripped (onclick, onload, etc.)
 * - javascript:, vbscript:, data: protocols stripped from href/src
 * - Nesting depth limited to MAX_RICH_TEXT_NESTING_DEPTH
 * - <a> tags: only href attribute preserved, rel="noopener noreferrer" added
 * - Empty tags after sanitization are removed
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== "string") {return "";}

  let html = dirtyHtml;

  // Step 1: Remove <script>, <style>, <iframe>, <object>, <embed>, <form> entirely
  // (including their content)
  const dangerousBlockTags = ["script", "style", "iframe", "object", "embed", "form", "applet", "base", "link", "meta"];
  for (const tag of dangerousBlockTags) {
    const blockRegex = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    html = html.replace(blockRegex, "");
    // Also remove self-closing variants
    const selfClosing = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    html = html.replace(selfClosing, "");
  }

  // Step 2: Remove all dangerous attributes from remaining tags
  for (const attrPattern of DANGEROUS_ATTRS) {
    html = html.replace(attrPattern, "");
  }

  // Step 3: Strip non-whitelisted tags but keep their text content
  html = html.replace(TAG_PATTERN, (match, tagName: string) => {
    const normalizedTag = tagName.toLowerCase();
    if (ALLOWED_HTML_TAGS.includes(normalizedTag as typeof ALLOWED_HTML_TAGS[number])) {
      // For <a> tags, sanitize attributes
      if (normalizedTag === "a") {
        return sanitizeAnchorTag(match);
      }
      // For all other allowed tags, strip all attributes (no style, class, id)
      const isClosing = match.startsWith("</");
      return isClosing ? `</${normalizedTag}>` : `<${normalizedTag}>`;
    }
    // Non-whitelisted tag: remove the tag but keep inner content
    return "";
  });

  // Step 4: Enforce nesting depth
  html = enforceNestingDepth(html, MAX_RICH_TEXT_NESTING_DEPTH);

  // Step 5: Remove empty tags (e.g., <p></p>, <b></b>)
  html = html.replace(/<([a-z][a-z0-9]*)\b[^>]*>\s*<\/\1>/gi, "");

  // Step 6: Collapse excessive whitespace/newlines
  html = html.replace(/\n{3,}/g, "\n\n").trim();

  return html;
}

/**
 * Sanitizes <a> tags:
 * - Only keeps href attribute
 * - Validates href starts with http:// or https://
 * - Adds rel="noopener noreferrer" and target="_blank"
 */
function sanitizeAnchorTag(tag: string): string {
  if (tag.startsWith("</")) {return "</a>";}

  const hrefMatch = tag.match(/href\s*=\s*["']([^"']*)["']/i);
  if (!hrefMatch) {return "<a>";}

  const href = hrefMatch[1].trim().toLowerCase();

  // Block dangerous protocols
  if (
    href.startsWith("javascript:") ||
    href.startsWith("vbscript:") ||
    href.startsWith("data:") ||
    href.startsWith("file:") ||
    href.startsWith("blob:")
  ) {
    return "<a>"; // Strip the href entirely
  }

  // Only allow http:// and https://
  if (!href.startsWith("http://") && !href.startsWith("https://")) {
    return "<a>";
  }

  return `<a href="${hrefMatch[1]}" rel="noopener noreferrer" target="_blank">`;
}

/**
 * Enforces maximum nesting depth for HTML elements.
 * Tags beyond the max depth are stripped (content preserved).
 *
 * Fix #31: Prevents deeply nested lists/divs that break renderers.
 */
function enforceNestingDepth(html: string, maxDepth: number): string {
  // Track nesting for list elements (ul, ol) which are the most common
  // source of deep nesting abuse
  const nestingTags = ["ul", "ol", "blockquote"];
  const depthStack: string[] = [];
  let result = "";
  let lastIndex = 0;

  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = fullMatch.startsWith("</");

    // Add text before this tag
    result += html.slice(lastIndex, match.index);
    lastIndex = match.index + fullMatch.length;

    if (nestingTags.includes(tagName)) {
      if (isClosing) {
        // Pop from stack
        const lastIdx = depthStack.lastIndexOf(tagName);
        if (lastIdx !== -1) {
          depthStack.splice(lastIdx, 1);
          result += fullMatch;
        }
        // If not in stack, skip the closing tag (orphaned)
      } else {
        // Opening tag — check depth
        const currentDepth = depthStack.filter((t) => t === tagName).length;
        if (currentDepth < maxDepth) {
          depthStack.push(tagName);
          result += fullMatch;
        }
        // Beyond max depth: strip the tag, content will pass through
      }
    } else {
      result += fullMatch;
    }
  }

  // Add remaining text
  result += html.slice(lastIndex);

  return result;
}

/**
 * Validates that a file's magic bytes match its claimed MIME type.
 * Fix #14: Don't trust file extensions or client-reported MIME types.
 *
 * @param buffer - First 8 bytes of the file
 * @param claimedMime - MIME type reported by the client
 * @returns true if magic bytes match claimed type
 */
export function validateMagicBytes(
  buffer: Uint8Array,
  claimedMime: string
): boolean {
  if (buffer.length < 4) {return false;}

  const signatures: Record<string, number[][]> = {
    "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
    "image/png": [[0x89, 0x50, 0x4e, 0x47]],       // .PNG
    "image/jpeg": [[0xff, 0xd8, 0xff]],              // JPEG SOI
    "image/jpg": [[0xff, 0xd8, 0xff]],               // JPEG SOI (alias)
  };

  const expected = signatures[claimedMime];
  if (!expected) {return false;}

  return expected.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  );
}
