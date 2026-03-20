import type { Lint, Span, Suggestion, LintConfig, Linter, WorkerLinter } from 'harper.js';
export type { Lint, Span, Suggestion, LintConfig, Linter, WorkerLinter };
export { Dialect, SuggestionKind } from 'harper.js';

export interface HarperIssue {
	id: string;      // Generated stable-ish ID for rendering (rule + start + end)
	lint: Lint;
	rule: string;
	signature: string; // Used for the "Ignore" feature: rule + problem text
}
