import { StateField, StateEffect, type EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, showTooltip, type Tooltip, keymap } from '@codemirror/view';
import { autocompletion, closeCompletion, startCompletion, type CompletionContext, type CompletionResult, type Completion } from '@codemirror/autocomplete';
import type { HarperIssue, Suggestion } from '../types';
import { SuggestionKind } from '../types';
import { render } from 'solid-js/web';
import IssueTooltipWrapper from '../components/IssueTooltipWrapper';
import { lintKindColor, lintKindBackgroundColor } from './lint-kind-colors';
import { getLinter } from '../services/harper-service';

// Effect to update issues
export const updateIssuesEffect = StateEffect.define<HarperIssue[]>();

// Effect to update selected issue (kept for sidebar highlighting)
export const setSelectedIssueEffect = StateEffect.define<string | null>();

// Custom theme for issue decorations using CodeMirror's baseTheme
// Only contains base styles, actual colors are applied inline via decorations
const issueTheme = EditorView.baseTheme({
	'.cm-issue-underline': {
		textDecoration: 'underline solid',
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
		textDecorationSkipInk: 'auto',
	},
	'.cm-issue-selected': {
		backgroundColor: 'rgba(58, 169, 159, 0.3)', // flexoki-cyan with opacity
	},
});

// StateField to track current issues and selected issue
export const issueField = StateField.define<{ issues: HarperIssue[]; selectedId: string | null }>({
	create() {
		return { issues: [], selectedId: null };
	},
	update(state, tr) {
		let newState = state;

		for (const effect of tr.effects) {
			if (effect.is(updateIssuesEffect)) {
				newState = { ...newState, issues: effect.value };
			}
			if (effect.is(setSelectedIssueEffect)) {
				newState = { ...newState, selectedId: effect.value };
			}
		}

		return newState;
	},
});

// StateField for decorations
export const issueDecorationsField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(decorations, tr) {
		// Always map decorations through document changes first to keep positions in sync
		decorations = decorations.map(tr.changes);

		const hasNewIssues = tr.effects.some(e => e.is(updateIssuesEffect));
		const hasSelectionChange = tr.effects.some(e => e.is(setSelectedIssueEffect));
		const issueState = tr.state.field(issueField);

		if (hasNewIssues) {
			// Rebuild all decorations when issues change
			return buildDecorations(issueState.issues, issueState.selectedId);
		}
		
		if (hasSelectionChange) {
			// Update selection highlighting on existing (already mapped) decorations
			return updateDecorationsForSelection(decorations, issueState.selectedId);
		}

		return decorations;
	},
	provide: f => EditorView.decorations.from(f),
});

function buildDecorations(issues: HarperIssue[], selectedId: string | null): DecorationSet {
	const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

	for (const issue of issues) {
		const span = issue.lint.span();
		const isSelected = issue.id === selectedId;
		const lintKind = issue.lint.lint_kind();
		const color = lintKindColor(lintKind);
		const bgColor = lintKindBackgroundColor(lintKind);
		
		const cssClass = 'cm-issue-underline' + (isSelected ? ' cm-issue-selected' : '');

		// Use Decoration.mark with inline styles for colors
		decorations.push({
			from: span.start,
			to: span.end,
			decoration: Decoration.mark({
				class: cssClass,
				attributes: { 
					'data-issue-id': issue.id,
					'data-lint-kind': lintKind,
					style: `text-decoration-color: ${color}; background-color: ${bgColor};`,
				},
			}),
		});
	}

	// Sort by position to ensure proper decoration order
	decorations.sort((a, b) => a.from - b.from);

	return Decoration.set(decorations.map(d => d.decoration.range(d.from, d.to)));
}

function updateDecorationsForSelection(decorations: DecorationSet, selectedId: string | null): DecorationSet {
	const updated: Array<{ from: number; to: number; decoration: Decoration }> = [];

	// Iterate through existing decorations and rebuild them with updated selection class
	decorations.between(0, Number.MAX_SAFE_INTEGER, (from, to, value) => {
		if (value.spec.attributes && value.spec.attributes['data-issue-id']) {
			const issueId = value.spec.attributes['data-issue-id'] as string;
			const lintKind = value.spec.attributes['data-lint-kind'] as string;
			const isSelected = issueId === selectedId;
			
			const cssClass = 'cm-issue-underline' + (isSelected ? ' cm-issue-selected' : '');
			const color = lintKindColor(lintKind);
			const bgColor = lintKindBackgroundColor(lintKind);
			
			updated.push({
				from,
				to,
				decoration: Decoration.mark({
					class: cssClass,
					attributes: { 
						'data-issue-id': issueId,
						'data-lint-kind': lintKind,
						style: `text-decoration-color: ${color}; background-color: ${bgColor};`,
					},
				}),
			});
		}
	});

	return Decoration.set(updated.map(d => d.decoration.range(d.from, d.to)));
}

// Actions interface for applying suggestions
interface IssueActions {
	onApplySuggestion: (issueId: string, suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
	onIgnore: (issueId: string) => void;
	onIssueSelect?: (issueId: string | null) => void;
}

let issueActions: IssueActions | null = null;

export function setIssueActions(actions: IssueActions) {
	issueActions = actions;
}

// Helper to find issue at cursor position
function findIssueAtPos(state: EditorState, pos: number): HarperIssue | null {
	const issueState = state.field(issueField);
	const decorations = state.field(issueDecorationsField);
	
	let foundIssueId: string | null = null;
	decorations.between(pos, pos, (from, to, value) => {
		if (value.spec.attributes && value.spec.attributes['data-issue-id']) {
			foundIssueId = value.spec.attributes['data-issue-id'] as string;
			return false;
		}
	});
	
	if (foundIssueId) {
		return issueState.issues.find((i) => i.id === foundIssueId) || null;
	}
	
	return null;
}

// Helper function to check if an issue would only show "Ignore" option
export function wouldOnlyShowIgnore(issue: HarperIssue): boolean {
	const suggestions = issue.lint.suggestions();
	const isSpelling = issue.lint.lint_kind().toLowerCase().includes('spelling');
	// If there are suggestions or it's a spelling issue (which gets "Add to Dictionary"), return false
	return suggestions.length === 0 && !isSpelling;
}

// Custom autocomplete source for Harper issues
function harperAutocomplete(context: CompletionContext): CompletionResult | null {
	const issue = findIssueAtPos(context.state, context.pos);
	
	console.log('harperAutocomplete called:', {
		pos: context.pos,
		explicit: context.explicit,
		hasIssue: !!issue,
		hasActions: !!issueActions,
	});
	
	if (!issue || !issueActions) return null;
	
	const suggestions = issue.lint.suggestions();
	const span = issue.lint.span();
	
	// Debug logging
	console.log('Issue found:', {
		kind: issue.lint.lint_kind(),
		message: issue.lint.message(),
		problemText: issue.lint.get_problem_text(),
		suggestionCount: suggestions.length,
		suggestions: suggestions.map(s => s.get_replacement_text()),
		span: { start: span.start, end: span.end },
		contextPos: context.pos,
	});
	
	const options: Completion[] = [];
	
	// Add suggestion completions
	for (const suggestion of suggestions) {
		const kind = suggestion.kind();
		const isRemove = kind === SuggestionKind.Remove;
		const replacementText = isRemove ? '' : suggestion.get_replacement_text();
		const label = isRemove ? '(Remove)' : replacementText;
		
		options.push({
			label,
			// detail: isRemove ? 'Remove this text' : 'Replace',
			apply: async (view) => {
				// Use linter.applySuggestion() to properly handle all suggestion types,
				// including insertions (comma rules), replacements, and removals.
				const linter = getLinter();
				const oldText = view.state.doc.toString();
				const newText = await linter.applySuggestion(oldText, issue.lint, suggestion);
				
				// Find the minimal changed region by comparing from both ends
				let changeStart = 0;
				const minLen = Math.min(oldText.length, newText.length);
				while (changeStart < minLen && oldText[changeStart] === newText[changeStart]) {
					changeStart++;
				}
				
				let changeEndOld = oldText.length;
				let changeEndNew = newText.length;
				while (changeEndOld > changeStart && changeEndNew > changeStart &&
				       oldText[changeEndOld - 1] === newText[changeEndNew - 1]) {
					changeEndOld--;
					changeEndNew--;
				}
				
				// Apply the minimal change and position cursor at the end of the inserted text
				view.dispatch({
					changes: { from: changeStart, to: changeEndOld, insert: newText.slice(changeStart, changeEndNew) },
					selection: { anchor: changeEndNew }
				});
			},
			type: 'text',
			// info: 'Replace'
		});
	}
	
	// Always add ignore option first (before dictionary so it's always at the bottom)
	options.push({
		label: 'Ignore',
		// detail: 'Ignore this issue',
		apply: (view) => {
			if (issueActions) {
				issueActions.onIgnore(issue.id);
			}
			// Close the autocomplete popup
			closeCompletion(view);
		},
		type: 'class',
	});
	
	// Add dictionary option for spelling issues (will appear above Ignore)
	const isSpelling = issue.lint.lint_kind().toLowerCase().includes('spelling');
	if (isSpelling) {
		options.push({
			label: 'Add to Dictionary',
			// detail: 'Add word to dictionary',
			apply: (view) => {
				if (issueActions) {
					issueActions.onAddToDictionary(issue.lint.get_problem_text());
				}
				// Close the autocomplete popup
				closeCompletion(view);
			},
			type: 'class',
		});
	}
	
	// Don't show autocomplete if there are no options (shouldn't happen, but just in case)
	if (options.length === 0) {
		console.log('No options generated!');
		return null;
	}
	
	console.log('Returning completion result:', {
		from: span.start,
		to: span.end,
		optionCount: options.length,
	});
	
	return {
		from: span.start,
		to: span.end,
		options,
		// Don't filter - these are action items, not text completions
		filter: false,
	};
}

// Helper to create tooltip from issue
function createTooltipFromIssue(issue: HarperIssue): Tooltip {
	const span = issue.lint.span();
	const lintKind = issue.lint.lint_kind();
	
	// Check if ignore would be the only option
	const suggestions = issue.lint.suggestions();
	const isSpelling = lintKind.toLowerCase().includes('spelling');
	const hasActions = suggestions.length > 0 || isSpelling;
	const showIgnoreButton = !hasActions;
	
	return {
		pos: span.start,
		end: span.end,
		create: (view: EditorView) => {
			const container = view.dom.ownerDocument.createElement('div');
			const dispose = render(() => IssueTooltipWrapper({ 
				issue, 
				lintKind,
				showIgnoreButton,
				onIgnore: (showIgnoreButton && issueActions) 
					? () => {
						if (issueActions) {
							issueActions.onIgnore(issue.id);
						}
					}
					: undefined
			}), container);
			
			return {
				dom: container,
				destroy: () => dispose(),
			};
		},
		above: true,
		arrow: false
	};
}

// Track last notified issue ID to avoid duplicate notifications
let lastNotifiedIssueId: string | null = null;

// StateField to track current tooltip based on cursor position
const cursorTooltipField = StateField.define<readonly Tooltip[]>({
	create(state) {
		const cursorPos = state.selection.main.head;
		const issue = findIssueAtPos(state, cursorPos);
		
		// Notify parent about initial issue selection
		const issueId = issue?.id ?? null;
		if (issueActions?.onIssueSelect) {
			issueActions.onIssueSelect(issueId);
			lastNotifiedIssueId = issueId;
		}
		
		if (!issue) return [];
		
		return [createTooltipFromIssue(issue)];
	},
	update(tooltips, tr) {
		// Check if issues were updated (e.g., issue was ignored/removed)
		const issuesUpdated = tr.effects.some(e => e.is(updateIssuesEffect));
		
		// If issues were updated, check if current tooltip's issue still exists
		if (issuesUpdated && tooltips.length > 0) {
			const cursorPos = tr.state.selection.main.head;
			const issue = findIssueAtPos(tr.state, cursorPos);
			
			// Notify parent about issue change
			const issueId = issue?.id ?? null;
			if (issueId !== lastNotifiedIssueId && issueActions?.onIssueSelect) {
				issueActions.onIssueSelect(issueId);
				lastNotifiedIssueId = issueId;
			}
			
			// If the issue no longer exists at cursor position, clear the tooltip
			if (!issue) {
				return [];
			}
			
			// If a different issue is now at cursor position, show new tooltip
			return [createTooltipFromIssue(issue)];
		}
		
		// Only recalculate if document changed or selection changed
		if (!tr.docChanged && !tr.selection) {
			return tooltips;
		}
		
		const cursorPos = tr.state.selection.main.head;
		const issue = findIssueAtPos(tr.state, cursorPos);
		
		// Notify parent about issue change (only if it actually changed)
		const issueId = issue?.id ?? null;
		if (issueId !== lastNotifiedIssueId && issueActions?.onIssueSelect) {
			issueActions.onIssueSelect(issueId);
			lastNotifiedIssueId = issueId;
		}
		
		// If there's an issue at cursor, show tooltip
		if (issue) {
			return [createTooltipFromIssue(issue)];
		}
		
		return [];
	},
	provide: f => showTooltip.computeN([f], state => state.field(f)),
});

// Export the autocomplete extension
export const harperAutocompletion = autocompletion({
	override: [harperAutocomplete],
	activateOnTyping: false,  // Only activate on Ctrl+Space
	closeOnBlur: true,
	aboveCursor: false,
});

// Export the cursor-based tooltip extension
export const harperCursorTooltip = cursorTooltipField;

// Track last clicked issue in editor to avoid re-triggering autocomplete
let lastClickedIssueInEditor: string | null = null;

// Helper function to trigger autocomplete for an issue (returns true if triggered, false if skipped)
export function triggerAutocompleteForIssue(view: EditorView, issue: HarperIssue, explicit = false): boolean {
	// For explicit triggers (Ctrl+Space), always trigger
	if (explicit) {
		setTimeout(() => startCompletion(view), 0);
		return true;
	}
	
	// For implicit triggers (click/sidebar), check if only Ignore would be shown
	if (wouldOnlyShowIgnore(issue)) {
		return false;
	}
	
	setTimeout(() => startCompletion(view), 0);
	return true;
}

// Click handler to trigger autocomplete when clicking on issues
export const issueClickAutocomplete = EditorView.domEventHandlers({
	mousedown(event, view) {
		const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
		if (pos === null) return false;

		const issue = findIssueAtPos(view.state, pos);
		
		if (issue) {
			// Only trigger autocomplete if it's a different issue than last clicked
			if (issue.id !== lastClickedIssueInEditor) {
				lastClickedIssueInEditor = issue.id;
				triggerAutocompleteForIssue(view, issue);
			}
		} else {
			// Clicking off an issue resets the tracking
			lastClickedIssueInEditor = null;
		}
		
		return false; // Don't prevent default behavior
	},
});

// Update listener to sync issue selection highlighting with cursor position
export const issueSyncExtension = EditorView.updateListener.of((update) => {
	// Only process if selection changed (cursor moved)
	if (!update.selectionSet) return;
	
	// Skip if this update already has a setSelectedIssueEffect (from keyboard nav or sidebar)
	if (update.transactions.some(tr => tr.effects.some(e => e.is(setSelectedIssueEffect)))) {
		return;
	}
	
	const cursorPos = update.state.selection.main.head;
	const issue = findIssueAtPos(update.state, cursorPos);
	const issueId = issue?.id ?? null;
	
	// Get current selected issue
	const currentSelectedId = update.state.field(issueField).selectedId;
	
	// Only dispatch if the issue changed
	if (issueId !== currentSelectedId) {
		update.view.dispatch({
			effects: setSelectedIssueEffect.of(issueId),
		});
	}
	
	// Reset editor click tracking when cursor moves away from the last clicked issue
	// This allows clicking the same issue again to trigger autocomplete
	if (issueId !== lastClickedIssueInEditor) {
		lastClickedIssueInEditor = null;
	}
});

// Dark editor theme with Flexoki colors
const darkEditorTheme = EditorView.theme({
	'&': {
		color: '#CECDC3', // flexoki-tx
		backgroundColor: '#100F0F', // flexoki-bg
		padding: '1.5rem',
	},
	'.cm-content': {
		caretColor: '#CECDC3',
		padding: '0',
	},
	'&.cm-focused .cm-cursor': {
		borderLeftColor: '#CECDC3',
	},
	'&.cm-focused .cm-selectionBackground, ::selection': {
		backgroundColor: '#3aa99f4c !important', // flexoki-cyan with opacity (matching text-selection)
	},
	'.cm-selectionBackground': {
		backgroundColor: '#3aa99f4c !important',
	},
	'.cm-gutters': {
		backgroundColor: '#1C1B1A', // flexoki-bg-2
		color: '#878580', // flexoki-tx-2
		border: 'none',
	},
	'.cm-activeLineGutter': {
		backgroundColor: '#282726', // flexoki-ui
	},
	'.cm-activeLine': {
		backgroundColor: 'rgba(40, 39, 38, 0.5)', // flexoki-ui with transparency
	},
	'.cm-scroller': {
		lineHeight: '1.5',
	},
}, { dark: true });

// Navigation functions for next/previous issue
function navigateToNextIssue(view: EditorView): boolean {
	const issueState = view.state.field(issueField);
	const issues = issueState.issues;
	
	if (issues.length === 0) return false;
	
	const currentPos = view.state.selection.main.head;
	
	// Find the next issue after current position
	let nextIssue = issues.find(issue => issue.lint.span().start > currentPos);
	
	// If no issue after current position, wrap to first issue
	if (!nextIssue) {
		nextIssue = issues[0];
	}
	
	if (nextIssue) {
		const span = nextIssue.lint.span();
		view.dispatch({
			selection: { anchor: span.start },
			effects: [
				EditorView.scrollIntoView(span.start, { y: 'center' }),
				setSelectedIssueEffect.of(nextIssue.id),
			],
		});
		view.focus();
		// Trigger autocomplete for the navigated-to issue
		triggerAutocompleteForIssue(view, nextIssue);
		return true;
	}
	
	return false;
}

function navigateToPreviousIssue(view: EditorView): boolean {
	const issueState = view.state.field(issueField);
	const issues = issueState.issues;
	
	if (issues.length === 0) return false;
	
	const currentPos = view.state.selection.main.head;
	
	// Find the previous issue before current position (search in reverse)
	let prevIssue = issues.slice().reverse().find(issue => issue.lint.span().start < currentPos);
	
	// If no issue before current position, wrap to last issue
	if (!prevIssue) {
		prevIssue = issues[issues.length - 1];
	}
	
	if (prevIssue) {
		const span = prevIssue.lint.span();
		view.dispatch({
			selection: { anchor: span.start },
			effects: [
				EditorView.scrollIntoView(span.start, { y: 'center' }),
				setSelectedIssueEffect.of(prevIssue.id),
			],
		});
		view.focus();
		// Trigger autocomplete for the navigated-to issue
		triggerAutocompleteForIssue(view, prevIssue);
		return true;
	}
	
	return false;
}

// Handler for Tab key to trigger autocomplete on issues
function handleTabOnIssue(view: EditorView): boolean {
	const cursorPos = view.state.selection.main.head;
	const issue = findIssueAtPos(view.state, cursorPos);
	
	// If cursor is on an issue, trigger autocomplete
	if (issue) {
		startCompletion(view);
		return true;
	}
	
	// Otherwise, let Tab behave normally (indentation)
	return false;
}

// Keymap for issue navigation and Tab trigger
export const issueNavigationKeymap = keymap.of([
	{
		key: 'Tab',
		run: handleTabOnIssue,
	},
	{
		key: 'Ctrl-j',
		run: navigateToNextIssue,
	},
	{
		key: 'Ctrl-k',
		run: navigateToPreviousIssue,
	},
]);

export { issueTheme, darkEditorTheme };
