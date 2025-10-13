import { StateField, StateEffect } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, showTooltip, type TooltipView } from '@codemirror/view';
import type { HarperIssue, Suggestion } from '../types';
import { IssueSeverity, SuggestionKind } from '../types';

// Effect to update issues
export const updateIssuesEffect = StateEffect.define<HarperIssue[]>();

// Effect to update selected issue
export const setSelectedIssueEffect = StateEffect.define<string | null>();

// Effect to show context menu
export const showContextMenuEffect = StateEffect.define<{ issueId: string; pos: number } | null>();

// Custom theme for underlines, highlights, and context menu using CodeMirror's baseTheme
const issueTheme = EditorView.baseTheme({
	'.cm-issue-error': {
		textDecoration: 'underline solid',
		textDecorationColor: 'rgb(239 68 68)', // red-500
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
		textDecorationSkipInk: 'auto',
	},
	'.cm-issue-warning': {
		textDecoration: 'underline solid',
		textDecorationColor: 'rgb(234 179 8)', // yellow-500
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
		textDecorationSkipInk: 'auto',
	},
	'.cm-issue-info': {
		textDecoration: 'underline solid',
		textDecorationColor: 'rgb(59 130 246)', // blue-500
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
		textDecorationSkipInk: 'auto',
	},
	'.cm-issue-selected': {
		backgroundColor: 'rgba(191 219 254 / 0.5)', // blue-200 with 50% opacity
	},
	'.cm-tooltip.cm-tooltip-above': {
		'&.cm-tooltip-cursor': {
			backgroundColor: 'transparent',
			border: 'none',
		},
	},
	'.cm-context-menu': {
		backgroundColor: 'white',
		border: '1px solid rgb(209 213 219)', // gray-300
		borderRadius: '0.375rem',
		boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
		padding: '0.5rem',
		minWidth: '200px',
		maxWidth: '300px',
		fontFamily: 'system-ui, -apple-system, sans-serif',
	},
	'.cm-context-menu-title': {
		fontSize: '0.875rem',
		fontWeight: '600',
		color: 'rgb(17 24 39)', // gray-900
		marginBottom: '0.25rem',
		lineHeight: '1.25rem',
	},
	'.cm-context-menu-problem': {
		fontSize: '0.75rem',
		color: 'rgb(75 85 99)', // gray-600
		fontFamily: 'monospace',
		backgroundColor: 'rgb(243 244 246)', // gray-100
		padding: '0.125rem 0.375rem',
		borderRadius: '0.25rem',
		marginBottom: '0.5rem',
		display: 'inline-block',
	},
	'.cm-context-menu-section-title': {
		fontSize: '0.75rem',
		fontWeight: '600',
		color: 'rgb(55 65 81)', // gray-700
		marginTop: '0.5rem',
		marginBottom: '0.375rem',
	},
	'.cm-context-menu-button': {
		display: 'block',
		width: '100%',
		textAlign: 'left',
		padding: '0.375rem 0.625rem',
		fontSize: '0.75rem',
		backgroundColor: 'rgb(243 244 246)', // gray-100
		border: '1px solid rgb(209 213 219)', // gray-300
		borderRadius: '0.25rem',
		marginBottom: '0.25rem',
		cursor: 'pointer',
		transition: 'all 150ms',
		'&:hover': {
			backgroundColor: 'rgb(229 231 235)', // gray-200
		},
		'&:last-child': {
			marginBottom: '0',
		},
	},
	'.cm-context-menu-button-secondary': {
		color: 'rgb(75 85 99)', // gray-600
		fontStyle: 'italic',
	},
	'.cm-context-menu-button-success': {
		backgroundColor: 'rgb(220 252 231)', // green-100
		borderColor: 'rgb(187 247 208)', // green-200
		color: 'rgb(22 101 52)', // green-800
		'&:hover': {
			backgroundColor: 'rgb(187 247 208)', // green-200
		},
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
		// Map decorations through document changes - this keeps positions in sync
		decorations = decorations.map(tr.changes);

		// Check for effects
		let hasNewIssues = false;
		let hasSelectionChange = false;

		for (const effect of tr.effects) {
			if (effect.is(updateIssuesEffect)) {
				hasNewIssues = true;
			}
			if (effect.is(setSelectedIssueEffect)) {
				hasSelectionChange = true;
			}
		}

		const issueState = tr.state.field(issueField);

		// If we have new issues, rebuild decorations from scratch
		if (hasNewIssues) {
			decorations = buildDecorations(issueState.issues, issueState.selectedId);
		}
		// If only selection changed, update classes on existing (mapped) decorations
		else if (hasSelectionChange) {
			decorations = updateDecorationsForSelection(decorations, issueState.selectedId);
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

// StateField for context menu
const contextMenuField = StateField.define<{ issueId: string; pos: number } | null>({
	create() {
		return null;
	},
	update(value, tr) {
		for (const effect of tr.effects) {
			if (effect.is(showContextMenuEffect)) {
				return effect.value;
			}
		}
		return value;
	},
	provide: f => showTooltip.from(f, val => {
		if (!val) return null;
		return {
			pos: val.pos,
			above: true,
			strictSide: false,
			arrow: false,
			create: (view) => createContextMenuTooltip(view, val.issueId),
		};
	}),
});

// Context menu actions interface
interface ContextMenuActions {
	onApplySuggestion: (issueId: string, suggestion: Suggestion) => void;
	onAddToDictionary: (word: string) => void;
	onIgnore: (issueId: string) => void;
}

let contextMenuActions: ContextMenuActions | null = null;

export function setContextMenuActions(actions: ContextMenuActions) {
	contextMenuActions = actions;
}

function createContextMenuTooltip(view: EditorView, issueId: string): TooltipView {
	const issueState = view.state.field(issueField);
	const issue = issueState.issues.find(i => i.id === issueId);
	
	const dom = document.createElement('div');
	dom.className = 'cm-context-menu';
	
	// Prevent clicks on the tooltip from propagating to the editor
	dom.addEventListener('mousedown', (e) => {
		e.stopPropagation();
	});
	
	if (!issue) {
		dom.textContent = 'Issue not found';
		return { dom };
	}

	const suggestions = issue.lint.suggestions();
	const isSpelling = issue.lint.lint_kind().toLowerCase().includes('spelling');
	
	// Title
	const title = document.createElement('div');
	title.className = 'cm-context-menu-title';
	title.textContent = issue.lint.message();
	dom.appendChild(title);
	
	// Problem text
	const problemText = document.createElement('div');
	problemText.className = 'cm-context-menu-problem';
	problemText.textContent = `"${issue.lint.get_problem_text()}"`;
	dom.appendChild(problemText);
	
	// Suggestions
	if (suggestions.length > 0) {
		const suggestionsTitle = document.createElement('div');
		suggestionsTitle.className = 'cm-context-menu-section-title';
		suggestionsTitle.textContent = 'Suggestions:';
		dom.appendChild(suggestionsTitle);
		
		suggestions.forEach(suggestion => {
			const btn = document.createElement('button');
			btn.className = 'cm-context-menu-button';
			
			if (suggestion.kind() === SuggestionKind.Replace) {
				btn.textContent = suggestion.get_replacement_text();
			} else {
				btn.textContent = '(Remove)';
				btn.classList.add('cm-context-menu-button-secondary');
			}
			
			btn.addEventListener('mousedown', (e) => {
				e.preventDefault();
				e.stopPropagation();
				if (contextMenuActions) {
					contextMenuActions.onApplySuggestion(issueId, suggestion);
				}
				// Close menu
				view.dispatch({ effects: showContextMenuEffect.of(null) });
			});
			
			dom.appendChild(btn);
		});
	}
	
	// Add to dictionary (for spelling errors)
	if (isSpelling) {
		const dictBtn = document.createElement('button');
		dictBtn.className = 'cm-context-menu-button cm-context-menu-button-success';
		dictBtn.textContent = 'Add to Dictionary';
		dictBtn.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (contextMenuActions) {
				contextMenuActions.onAddToDictionary(issue.lint.get_problem_text());
			}
			view.dispatch({ effects: showContextMenuEffect.of(null) });
		});
		dom.appendChild(dictBtn);
	}
	
	// Ignore button
	const ignoreBtn = document.createElement('button');
	ignoreBtn.className = 'cm-context-menu-button cm-context-menu-button-secondary';
	ignoreBtn.textContent = 'Ignore';
	ignoreBtn.addEventListener('mousedown', (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (contextMenuActions) {
			contextMenuActions.onIgnore(issueId);
		}
		view.dispatch({ effects: showContextMenuEffect.of(null) });
	});
	dom.appendChild(ignoreBtn);
	
	return { dom };
}

// Click handler extension
export function issueClickHandler() {
	return EditorView.domEventHandlers({
		mousedown(event, view) {
			const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
			if (pos === null) return false;

			// Check if clicking on an issue - need to verify position is within the decoration range
			const decorations = view.state.field(issueDecorationsField);
			let foundIssueId: string | null = null;
			
			decorations.between(pos, pos, (from, to, value) => {
				if (value.spec.attributes && value.spec.attributes['data-issue-id']) {
					foundIssueId = value.spec.attributes['data-issue-id'] as string;
					return false; // Stop iteration
				}
			});

			if (foundIssueId) {
				// Show context menu and select issue
				view.dispatch({
					effects: [
						setSelectedIssueEffect.of(foundIssueId),
						showContextMenuEffect.of({ issueId: foundIssueId, pos }),
					],
				});
			} else {
				// Close context menu and deselect issue if clicking elsewhere
				view.dispatch({
					effects: [
						setSelectedIssueEffect.of(null),
						showContextMenuEffect.of(null),
					],
				});
			}

			// Always return false to allow default cursor placement
			return false;
		},
	});
}

// Extension to close menu on Escape and when scrolled off-screen
const closeMenuOnEscape = EditorView.domEventHandlers({
	keydown(event, view) {
		if (event.key === 'Escape') {
			const currentMenu = view.state.field(contextMenuField);
			if (currentMenu) {
				event.preventDefault();
				view.dispatch({ effects: showContextMenuEffect.of(null) });
				return true;
			}
		}
		return false;
	},
	scroll(event, view) {
		const currentMenu = view.state.field(contextMenuField);
		if (currentMenu) {
			// Check if the menu position is still visible
			const coords = view.coordsAtPos(currentMenu.pos);
			if (coords) {
				const rect = view.dom.getBoundingClientRect();
				// Close if the position is outside the visible editor area
				if (coords.top < rect.top || coords.bottom > rect.bottom) {
					view.dispatch({ effects: showContextMenuEffect.of(null) });
				}
			}
		}
		return false;
	},
});

export { issueTheme, contextMenuField, closeMenuOnEscape };
