import { StateField, StateEffect, type EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, showTooltip, type Tooltip } from '@codemirror/view';
import { autocompletion, startCompletion, closeCompletion, type CompletionContext, type CompletionResult, type Completion } from '@codemirror/autocomplete';
import type { HarperIssue, Suggestion } from '../types';
import { IssueSeverity, SuggestionKind } from '../types';
import { render } from 'solid-js/web';
import IssueTooltipWrapper from '../components/IssueTooltipWrapper';

// Effect to update issues
export const updateIssuesEffect = StateEffect.define<HarperIssue[]>();

// Effect to update selected issue (kept for sidebar highlighting)
export const setSelectedIssueEffect = StateEffect.define<string | null>();

// Custom theme for issue decorations using CodeMirror's baseTheme
// Using Flexoki color scheme
// Only contains styles that MUST be in baseTheme (CodeMirror decorations)
const issueTheme = EditorView.baseTheme({
	'.cm-issue-error': {
		textDecoration: 'underline solid',
		textDecorationColor: '#D14D41', // flexoki-red
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
		textDecorationSkipInk: 'auto',
	},
	'.cm-issue-warning': {
		textDecoration: 'underline solid',
		textDecorationColor: '#D0A215', // flexoki-yellow
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
		textDecorationSkipInk: 'auto',
	},
	'.cm-issue-info': {
		textDecoration: 'underline solid',
		textDecorationColor: '#4385BE', // flexoki-blue
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
		const cssClass = getSeverityCssClass(issue.severity) + (isSelected ? ' cm-issue-selected' : '');

		// Use Decoration.mark for inline text decoration
		decorations.push({
			from: span.start,
			to: span.end,
			decoration: Decoration.mark({
				class: cssClass,
				attributes: { 'data-issue-id': issue.id },
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
			const isSelected = issueId === selectedId;
			
			// Extract the base class (severity) from the current decoration
			let baseClass = '';
			if (value.spec.class) {
				baseClass = value.spec.class.replace(' cm-issue-selected', '');
			}
			
			const cssClass = baseClass + (isSelected ? ' cm-issue-selected' : '');
			
			updated.push({
				from,
				to,
				decoration: Decoration.mark({
					class: cssClass,
					attributes: { 'data-issue-id': issueId },
				}),
			});
		}
	});

	return Decoration.set(updated.map(d => d.decoration.range(d.from, d.to)));
}

function getSeverityCssClass(severity: IssueSeverity): string {
	switch (severity) {
		case IssueSeverity.Error:
			return 'cm-issue-error';
		case IssueSeverity.Warning:
			return 'cm-issue-warning';
		case IssueSeverity.Info:
			return 'cm-issue-info';
	}
}

// Actions interface for applying suggestions
interface IssueActions {
	onApplySuggestion: (issueId: string, suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
	onIgnore: (issueId: string) => void;
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
				const { getLinter } = await import('../services/harper-service');
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
	const severityClass = getSeverityCssClass(issue.severity).replace('cm-issue-', '');
	
	// Check if ignore would be the only option
	const suggestions = issue.lint.suggestions();
	const isSpelling = issue.lint.lint_kind().toLowerCase().includes('spelling');
	const hasActions = suggestions.length > 0 || isSpelling;
	const showIgnoreButton = !hasActions;
	
	return {
		pos: span.start,
		end: span.end,
		create: (view: EditorView) => {
			const container = view.dom.ownerDocument.createElement('div');
			const dispose = render(() => IssueTooltipWrapper({ 
				issue, 
				severityClass,
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
	};
}

// StateField to track current tooltip based on cursor position
const cursorTooltipField = StateField.define<readonly Tooltip[]>({
	create(state) {
		const cursorPos = state.selection.main.head;
		const issue = findIssueAtPos(state, cursorPos);
		
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
});

// Export the cursor-based tooltip extension
export const harperCursorTooltip = cursorTooltipField;

// Click handler to trigger autocomplete when clicking on an issue
export const issueClickHandler = EditorView.domEventHandlers({
	mousedown(event, view) {
		const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
		if (pos === null) return false;

		// Check if clicking on an issue
		const issue = findIssueAtPos(view.state, pos);
		if (issue) {
			// Check if this issue has suggestions or dictionary option
			const suggestions = issue.lint.suggestions();
			const isSpelling = issue.lint.lint_kind().toLowerCase().includes('spelling');
			const hasActions = suggestions.length > 0 || isSpelling;
			
			if (!hasActions) {
				// Only "Ignore" would be available - don't trigger autocomplete
				// The tooltip with ignore button will already be visible from cursor position
				console.log('Click on issue with no actions - showing tooltip with ignore button');
				
				// Just select the issue and position cursor
				event.preventDefault();
				view.dispatch({
					selection: { anchor: pos },
					effects: setSelectedIssueEffect.of(issue.id),
				});
				
				return true;
			}
			
			console.log('Click on issue detected, triggering autocomplete');
			
			// Prevent default to handle cursor positioning ourselves
			event.preventDefault();
			
			// Select the issue and position cursor, then trigger autocomplete
			view.dispatch({
				selection: { anchor: pos },
				effects: setSelectedIssueEffect.of(issue.id),
			});
			
			// Trigger autocomplete after state is updated, with a small delay to ensure state is synced
			setTimeout(() => {
				console.log('Calling startCompletion');
				const result = startCompletion(view);
				console.log('startCompletion result:', result);
			}, 0);
			
			return true; // We handled the event
		} else {
			// Clicking elsewhere - clear selection
			view.dispatch({
				effects: setSelectedIssueEffect.of(null),
			});
		}

		return false;
	},
});

// Dark editor theme with Flexoki colors
const darkEditorTheme = EditorView.theme({
	'&': {
		color: '#CECDC3', // flexoki-tx
		backgroundColor: '#100F0F', // flexoki-bg
	},
	'.cm-content': {
		caretColor: '#CECDC3',
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
}, { dark: true });

export { issueTheme, darkEditorTheme };
