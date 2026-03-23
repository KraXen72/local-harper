import type { Lint, Suggestion } from 'harper.js';
export type { Lint, Suggestion };
export { Dialect, SuggestionKind } from 'harper.js';

export interface HarperIssue {
	id: string;
	lint: Lint;
	rule: string;
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
	scrollToIssue?: string | null;
}

export interface TopBarProps {
	onCopy: () => void;
	isAnalyzing: boolean;
	isRuleManagerOpen: boolean;
	onToggleRuleManager: () => void;
	isInitializing?: boolean;
	isSidebarOpen?: boolean;
	onToggleSidebar?: () => void;
}

export interface RuleInfo {
	name: string;
	displayName: string;
	description: string;
	enabled: boolean;
}

export interface SidebarProps {
	issues: HarperIssue[];
	selectedIssueId: string | null;
	onIssueSelect: (issueId: string) => void;
	onApplySuggestion: (issueId: string, suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
	onClose?: () => void;
	isOpen?: boolean;
	onToggle?: () => void;
}

export interface IssueItemProps {
	issue: HarperIssue;
	isSelected: boolean;
	onSelect: (issueId: string) => void;
	onApplySuggestion: (suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
}
