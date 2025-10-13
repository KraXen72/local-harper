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

// Custom theme for underlines and highlights using CodeMirror's baseTheme
// Using Flexoki color scheme
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
	'.cm-tooltip.cm-tooltip-above, .cm-tooltip.cm-tooltip-below': {
		'&.cm-tooltip-cursor': {
			backgroundColor: 'transparent',
			border: 'none',
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
		// Check for effects first
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
		// Don't bother mapping old decorations if we're rebuilding anyway
		if (hasNewIssues) {
			decorations = buildDecorations(issueState.issues, issueState.selectedId);
		}
		// If only selection changed, update classes on existing (mapped) decorations
		else if (hasSelectionChange) {
			// Map first, then update selection
			decorations = decorations.map(tr.changes);
			decorations = updateDecorationsForSelection(decorations, issueState.selectedId);
		}
		// Otherwise, just map decorations through document changes
		else if (tr.docChanged) {
			decorations = decorations.map(tr.changes);
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
			above: false, // Default to showing below
			strictSide: false,
			arrow: false,
			create: (view) => createContextMenuTooltip(view, val.issueId, val.pos),
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

function createContextMenuTooltip(view: EditorView, issueId: string, pos: number): TooltipView {
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
	
	// Position adjustment after DOM is mounted
	const mount = () => {
		requestAnimationFrame(() => {
			const coords = view.coordsAtPos(pos);
			if (!coords) return;
			
			const rect = dom.getBoundingClientRect();
			const editorRect = view.dom.getBoundingClientRect();
			
			// Check if tooltip overflows right edge
			if (rect.right > editorRect.right) {
				const overflow = rect.right - editorRect.right;
				dom.style.transform = `translateX(-${overflow + 10}px)`;
			}
			// Check if tooltip overflows left edge
			else if (rect.left < editorRect.left) {
				const overflow = editorRect.left - rect.left;
				dom.style.transform = `translateX(${overflow + 10}px)`;
			}
		});
	};
	
	// Header container with title and close button
	const header = document.createElement('div');
	header.className = 'cm-context-menu-title';
	
	const titleText = document.createElement('span');
	titleText.textContent = issue.lint.message();
	header.appendChild(titleText);
	
	const closeBtn = document.createElement('button');
	closeBtn.className = 'cm-context-menu-close';
	closeBtn.innerHTML = '×';
	closeBtn.addEventListener('mousedown', (e) => {
		e.preventDefault();
		e.stopPropagation();
		view.dispatch({ effects: showContextMenuEffect.of(null) });
	});
	header.appendChild(closeBtn);
	
	dom.appendChild(header);
	
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
	
	return { dom, mount };
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
		contextmenu(event, view) {
			// Prevent default context menu
			event.preventDefault();
			
			// Close Harper context menu if open
			const currentMenu = view.state.field(contextMenuField);
			if (currentMenu) {
				view.dispatch({
					effects: [
						setSelectedIssueEffect.of(null),
						showContextMenuEffect.of(null),
					],
				});
			}
			
			return true;
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

export { issueTheme, darkEditorTheme, contextMenuField, closeMenuOnEscape };
