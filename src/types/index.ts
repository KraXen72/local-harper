// Re-export Harper.js types directly
import type {
	Lint,
	LintConfig,
	Linter,
	LinterInit,
	LintOptions,
	Span,
	Suggestion,
} from 'harper.js';

export { Dialect, SuggestionKind } from 'harper.js';
export type { Lint, LintConfig, Linter, LinterInit, LintOptions, Span, Suggestion };

// SummonEvent: centralized event names for tooltip/autocomplete invocation
export enum SummonEvent {
	CursorMoved = 'CursorMoved',
	ClickedInEditor = 'ClickedInEditor',
	SidebarClicked = 'SidebarClicked',
	ExplicitAutocomplete = 'ExplicitAutocomplete',
	TabPressed = 'TabPressed',
	NavigateNext = 'NavigateNext',
	NavigatePrevious = 'NavigatePrevious',
	Programmatic = 'Programmatic',
}

export type SummonOptions = {
	showPopup?: boolean;
	showAutocomplete?: boolean;
	focusEditor?: boolean;
	explicit?: boolean; // treat as user-explicit (e.g., Ctrl+Space)
};

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
	content: string;
	onContentChange: (content: string) => void;
	issues: HarperIssue[];
	selectedIssueId: string | null;
	onIssueSelect: (issueId: string | null) => void;
	onApplySuggestion: (issueId: string, suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
	onIgnore: (issueId: string) => void;
	scrollToIssue?: string | null; // Issue ID to scroll to and show context menu
}

export interface TopBarProps {
	onCopy: () => void;
	isAnalyzing: boolean;
	isRuleManagerOpen: boolean;
	onToggleRuleManager: () => void;
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
