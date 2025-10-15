/**
 * Convert PascalCase to human-readable words
 * Examples:
 * - "AvoidCurses" → "Avoid Curses"
 * - "LongSentence" → "Long Sentence"
 * - "URLChecker" → "URL Checker"
 */
export function pascalCaseToWords(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1 $2')  // lowercase followed by uppercase
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')  // handle acronyms
		.trim();
}
