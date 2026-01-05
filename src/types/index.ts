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
	rule: string;            // The rule name that generated this lint
}

export interface EditorPosition {
	line: number;
	col: number;
}

// Component Props Types

export interface EditorProps {
	onEditorReady?: (editor: any) => void; // Callback when editor is ready
}

export interface TopBarProps {
	editor: any; // Tiptap Editor instance
	isAnalyzing: boolean;
	isRuleManagerOpen: boolean;
	onToggleRuleManager: () => void;
}

export interface SidebarProps {
	editor: any; // Tiptap Editor instance
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

export interface RuleManagerProps {
	isOpen: boolean;
	onClose: () => void;
	onRuleToggle: (ruleName: string, enabled: boolean) => void;
	onConfigImported: () => void | Promise<void>;
	currentConfig: LintConfig;
}

export interface RuleInfo {
	name: string;         // Original PascalCase name
	displayName: string;  // Human-readable name
	description: string;  // Rule description (Markdown formatted)
	enabled: boolean;
}
