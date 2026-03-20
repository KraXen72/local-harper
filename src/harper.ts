/**
 * harper.ts — thin wrapper around harper.js
 *
 * Responsibilities:
 *  - Initialize the LocalLinter (WASM + web worker)
 *  - Load user dictionary words
 *  - Expose analyze() and addWord() — nothing else
 *
 * NOTE: harper.js spans are byte offsets into the UTF-8 encoding of the text.
 * For most English prose (ASCII) these equal JS character indices. The conversion
 * below is exact but linear; if performance matters for huge documents you can
 * swap in a lookup-table approach.
 */

import { LocalLinter } from "harper.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type LintKind =
  | "Spelling"
  | "Grammar"
  | "Punctuation"
  | "Capitalization"
  | "Style"
  | "Enhancement"
  | "Formatting"
  | "Readability"
  | "Other";

/** Flat, serializable representation of a Harper lint. */
export interface Issue {
  /**
   * Stable session key used for the ignore feature.
   * Encodes byte start, byte end, and the message so that if text changes
   * (shifting the span) or the issue disappears, the key no longer matches.
   */
  key: string;
  /** JS character index (converted from Harper's byte offset). */
  start: number;
  /** JS character index (exclusive end). */
  end: number;
  message: string;
  lintKind: LintKind;
  /** Replacement strings for autocomplete. */
  suggestions: string[];
  isSpelling: boolean;
}

export interface HarperAPI {
  analyze(text: string): Issue[];
  addWord(word: string): void;
}

// ── Internals ──────────────────────────────────────────────────────────────

/** Map lint_kind() return value to our LintKind string. */
function normalizeLintKind(kind: unknown): LintKind {
  const s = String(kind);
  const known: LintKind[] = [
    "Spelling", "Grammar", "Punctuation", "Capitalization",
    "Style", "Enhancement", "Formatting", "Readability",
  ];
  return (known.find((k) => s.includes(k)) ?? "Other") as LintKind;
}

/**
 * Extract replacement text from a harper.js Suggestion object.
 * harper.js exposes different surfaces depending on version; we try each.
 */
function suggestionText(s: unknown): string | null {
  if (!s || typeof s !== "object") return null;
  const obj = s as Record<string, unknown>;
  if (typeof obj["get_replacement_text"] === "function")
    return String(obj["get_replacement_text"]());
  if (typeof obj["replacementText"] === "string") return obj["replacementText"];
  if (typeof obj["text"] === "string") return obj["text"];
  return null;
}

/**
 * Convert a UTF-8 byte offset to a JavaScript character index.
 * Handles multi-byte characters (emoji, CJK, etc.) correctly.
 */
function byteToCharOffset(text: string, byteOffset: number): number {
  const encoder = new TextEncoder();
  let charIdx = 0;
  let byteCount = 0;
  while (charIdx < text.length && byteCount < byteOffset) {
    // JS strings are UTF-16; high-surrogate pairs are 4 bytes in UTF-8
    const code = text.codePointAt(charIdx)!;
    byteCount += encoder.encode(String.fromCodePoint(code)).length;
    charIdx += code > 0xffff ? 2 : 1; // surrogate pair = 2 JS chars
  }
  return charIdx;
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function initHarper(dictionary: string[]): Promise<HarperAPI> {
  const linter = new LocalLinter();
  await linter.setup();

  // Pre-load user dictionary
  for (const word of dictionary) {
    await linter.addWordToUserDictionary(word);
  }

  return {
    analyze(text: string): Issue[] {
      // lint() is synchronous on LocalLinter after setup()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lints = (linter as any).lint(text) as unknown[];

      return lints.map((rawLint, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lint = rawLint as any;

        const span: { start: number; end: number } = lint.span();
        const byteStart = span.start;
        const byteEnd   = span.end;

        const start = byteToCharOffset(text, byteStart);
        const end   = byteToCharOffset(text, byteEnd);

        const message  = String(lint.message());
        const lintKind = normalizeLintKind(lint.lint_kind());
        const isSpelling = lintKind === "Spelling";

        const rawSuggestions: unknown[] = lint.suggestions() ?? [];
        const suggestions = rawSuggestions
          .map(suggestionText)
          .filter((s): s is string => s !== null);

        const key = `${byteStart}:${byteEnd}:${i}:${message}`;

        return { key, start, end, message, lintKind, suggestions, isSpelling };
      });
    },

    addWord(word: string): void {
      // fire-and-forget; failure is non-critical
      linter.addWordToUserDictionary(word).catch(console.warn);
    },
  };
}
