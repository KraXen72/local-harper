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
	isDictManagerOpen: boolean;
	onToggleDictManager: () => void;
	isInitializing?: boolean;
	isReloading?: boolean;
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

export interface DictionaryExport {
	dictVersion: 1;
	words: string[];
}

export type DictionaryImportResult = { valid: true; words: string[] } | { valid: false; error: string };

export interface HeaderButton {
	type: 'button';
	icon: string;
	action: () => void;
	label?: string;
}

export interface HeaderSelectOption {
	value: string;
	label: string;
}

export interface HeaderSelect {
	type: 'select';
	options: HeaderSelectOption[];
	defaultOption?: string;
	onChange: (value: string) => void;
	label?: string;
}

export type HeaderControl = (HeaderButton | HeaderSelect)[];
