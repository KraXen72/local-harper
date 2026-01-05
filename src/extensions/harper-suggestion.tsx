import { Extension } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { render } from 'solid-js/web';
import type { HarperIssue, Suggestion } from '../types';
import SuggestionMenu from '../components/SuggestionMenu';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		harperSuggestion: {
			openSuggestionMenu: (issueId: string) => ReturnType;
			closeSuggestionMenu: () => ReturnType;
		};
	}
	interface Storage {
		harperSuggestion: {
			activeIssueId: string | null;
			isOpen: boolean;
		};
		harperDecoration: {
			issues: HarperIssue[];
			selectedIssueId: string | null;
		};
	}
}

export const HarperSuggestion = Extension.create({
	name: 'harperSuggestion',

	addStorage() {
		return {
			activeIssueId: null as string | null,
			isOpen: false,
		};
	},

	addCommands() {
		return {
			openSuggestionMenu: (issueId: string) => ({ editor, dispatch }) => {
				if (dispatch) {
					editor.storage.harperSuggestion.activeIssueId = issueId;
					editor.storage.harperSuggestion.isOpen = true;
				}
				return true;
			},
			closeSuggestionMenu: () => ({ editor, dispatch }) => {
				if (dispatch) {
					editor.storage.harperSuggestion.activeIssueId = null;
					editor.storage.harperSuggestion.isOpen = false;
				}
				return true;
			},
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Space': ({ editor }) => {
				const issues = editor.storage.harperDecoration.issues;
				const cursorPos = editor.state.selection.from;

				// Find issue at cursor position
				const issueAtCursor = issues.find(issue => {
					const span = issue.lint.span();
					return cursorPos >= span.start && cursorPos <= span.end;
				});

				if (issueAtCursor) {
					editor.commands.openSuggestionMenu(issueAtCursor.id);
					return true;
				}
				return false;
			},
			Tab: ({ editor }) => {
				const issues = editor.storage.harperDecoration.issues;
				const cursorPos = editor.state.selection.from;

				// Find issue at cursor position
				const issueAtCursor = issues.find(issue => {
					const span = issue.lint.span();
					return cursorPos >= span.start && cursorPos <= span.end;
				});

				if (issueAtCursor) {
					editor.commands.openSuggestionMenu(issueAtCursor.id);
					return true; // Prevent default Tab behavior
				}
				return false; // Allow normal Tab behavior
			},
			Escape: ({ editor }) => {
				if (editor.storage.harperSuggestion.isOpen) {
					editor.commands.closeSuggestionMenu();
					return true;
				}
				return false;
			},
		};
	},

	addProseMirrorPlugins() {
		const extension = this;

		return [
			new Plugin({
				key: new PluginKey('harperSuggestion'),
				state: {
					init() {
						return null;
					},
					apply(tr) {
						const openMenu = tr.getMeta('openSuggestionMenu');
						if (openMenu !== undefined) {
							extension.storage.activeIssueId = openMenu;
							extension.storage.isOpen = true;
							return openMenu;
						}
						return null;
					},
				},
			}),
		];
	},
});

// Create the bubble menu extension
export const HarperBubbleMenu = BubbleMenu.configure({
	pluginKey: 'harperBubbleMenu',
	element: document.createElement('div'),
	options: {
		placement: 'bottom-start',
	},
	shouldShow: ({ editor }) => {
		return editor.storage.harperSuggestion.isOpen;
	},
});

// Helper function to get the active issue
function getActiveIssue(editor: any): HarperIssue | null {
	const activeIssueId = editor.storage.harperSuggestion.activeIssueId;
	if (!activeIssueId) return null;

	return editor.storage.harperDecoration.issues.find((issue: HarperIssue) => issue.id === activeIssueId) || null;
}

// Helper function to handle suggestion application
function handleApplySuggestion(editor: any, suggestion: Suggestion) {
	const activeIssue = getActiveIssue(editor);
	if (!activeIssue) return;

	const span = activeIssue.lint.span();
	const newText = suggestion.get_replacement_text() || '';

	editor.chain()
		.setTextSelection(span.start, span.end)
		.insertContent(newText)
		.setHarperIssues(editor.storage.harperDecoration.issues.filter((issue: HarperIssue) => issue.id !== activeIssue.id))
		.closeSuggestionMenu()
		.run();
}

// Helper function to handle adding to dictionary
function handleAddToDictionary(editor: any, word: string) {
	// This would call the Harper service to add to dictionary
	// For now, just close the menu
	editor.commands.closeSuggestionMenu();
}

// Helper function to handle ignore
function handleIgnore(editor: any) {
	const activeIssue = getActiveIssue(editor);
	if (!activeIssue) return;

	editor.chain()
		.setHarperIssues(editor.storage.harperDecoration.issues.filter((issue: HarperIssue) => issue.id !== activeIssue.id))
		.closeSuggestionMenu()
		.run();
}

// Component to render in the bubble menu
function SuggestionMenuComponent({ editor }: { editor: any }) {
	const activeIssue = getActiveIssue(editor);
	if (!activeIssue) return null;

	return (
		<SuggestionMenu
			issue={activeIssue}
			onApplySuggestion={(suggestion: Suggestion) => handleApplySuggestion(editor, suggestion)}
			onAddToDictionary={(word: string) => handleAddToDictionary(editor, word)}
			onIgnore={() => handleIgnore(editor)}
		/>
	);
}

// Override the bubble menu to use our component
(HarperBubbleMenu as any).content = ({ editor }: { editor: any }) => {
	const container = document.createElement('div');
	render(() => SuggestionMenuComponent({ editor }), container);
	return container;
};