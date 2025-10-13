// Re-export Harper.js types directly
import type {
	Lint,
	Span,
	Suggestion,
	LintConfig,
	Linter,
	LinterInit,
	LintOptions,
} from 'harper.js';

export type { Lint, Span, Suggestion, LintConfig, Linter, LinterInit, LintOptions };
export { Dialect, SuggestionKind } from 'harper.js';

// Application-specific types

export enum IssueSeverity {
	Error = 'error',
	Warning = 'warning',
	Info = 'info',
}

/**
 * Our application's issue type that wraps Harper's Lint with additional metadata
 */
export interface HarperIssue {
	id: string;              // Generated unique ID
	lint: Lint;              // The actual Harper Lint object
	severity: IssueSeverity; // Mapped from lint_kind()
}

export interface EditorPosition {
	line: number;
	col: number;
}

// Component Props Types

export interface EditorProps {
	content: string;
	onContentChange: (content: string) => void;
	issues: HarperIssue[];
	selectedIssueId: string | null;
	onIssueSelect: (issueId: string | null) => void;
}

export interface SidebarProps {
	issues: HarperIssue[];
	selectedIssueId: string | null;
	onIssueSelect: (issueId: string) => void;
	onApplySuggestion: (issueId: string, suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
}

export interface IssueItemProps {
	issue: HarperIssue;
	isSelected: boolean;
	onSelect: (issueId: string) => void;
	onApplySuggestion: (suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
}

export interface TopBarProps {
	issueCount: number;
	onCopy: () => void;
}
