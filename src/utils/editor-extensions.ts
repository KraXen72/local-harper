// src/utils/editor-extensions.ts (simplified)
import { StateField, StateEffect } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, showTooltip, keymap } from '@codemirror/view';
import { autocompletion, closeCompletion, startCompletion } from '@codemirror/autocomplete';
import { getSuggestionActions } from './suggestion-actions';
import type { HarperIssue } from '../types';

// Single state field to track issues and selection
export const issueStateField = StateField.define<{
  issues: HarperIssue[];
  selectedId: string | null;
}>({
  create: () => ({ issues: [], selectedId: null }),
  update(value, tr) {
    let updated = { ...value };
    for (const effect of tr.effects) {
      if (effect.is(updateIssuesEffect)) {
        updated = { ...updated, issues: effect.value };
      } else if (effect.is(setSelectedIssueEffect)) {
        updated = { ...updated, selectedId: effect.value };
      }
    }
    return updated;
  }
});

// Dark editor theme with Flexoki colors
export const darkEditorTheme = EditorView.theme({
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
		fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		lineHeight: '1.6',
	},
}, { dark: true });

// Effect definitions
export const updateIssuesEffect = StateEffect.define<HarperIssue[]>();
export const setSelectedIssueEffect = StateEffect.define<string | null>();

// Decoration field - much simpler implementation
export const issueDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes);
    const issueState = tr.state.field(issueStateField);
    
    // Rebuild all decorations when needed
    if (tr.docChanged || tr.selection || tr.effects.size > 0) {
      return buildDecorations(issueState.issues, issueState.selectedId);
    }
    
    return decorations;
  },
  provide: f => EditorView.decorations.from(f)
});

function buildDecorations(issues: HarperIssue[], selectedId: string | null): DecorationSet {
  const builders = [];
  
  for (const issue of issues) {
    const span = issue.lint.span();
    const isSelected = issue.id === selectedId;
    const lintKind = issue.lint.lint_kind();
    
    builders.push(
      Decoration.mark({
        class: `cm-issue-underline ${isSelected ? 'cm-issue-selected' : ''}`,
        attributes: {
          'data-issue-id': issue.id,
          style: `text-decoration-color: ${lintKindColor(lintKind)}; 
                  background-color: ${isSelected ? lintKindBackgroundColor(lintKind) : 'transparent'};`
        }
      }).range(span.start, span.end)
    );
  }
  
  return Decoration.set(builders);
}

// Unified tooltip and autocomplete handler
export function handleIssueInteraction(view: EditorView, pos: number, explicit = false) {
  const issueState = view.state.field(issueStateField);
  const issue = findIssueAtPosition(issueState.issues, pos);
  
  if (!issue) return false;
  
  // Update selection
  view.dispatch({ effects: setSelectedIssueEffect.of(issue.id) });
  
  // Don't show autocomplete if only "Ignore" would be available
  if (!explicit && wouldOnlyShowIgnore(issue)) {
    return true;
  }
  
  // Show autocomplete
  setTimeout(() => startCompletion(view), 0);
  return true;
}

// Simplified autocomplete source
function harperAutocomplete(context: CompletionContext) {
  const issueState = context.state.field(issueStateField);
  const pos = context.pos;
  const issue = findIssueAtPosition(issueState.issues, pos);
  
  if (!issue) return null;
  
  const span = issue.lint.span();
  const options = getSuggestionActions(issue, {
    onApply: (suggestion) => {
      if (context.editor) {
        // Apply suggestion directly
        applySuggestionInEditor(context.editor.contentDOM, issue, suggestion);
      }
    },
    onIgnore: () => {
      if (context.editor) {
        // Handle ignore
        ignoreIssueInEditor(context.editor.contentDOM, issue.id);
      }
    },
    onAddToDictionary: (word) => {
      if (context.editor) {
        // Handle add to dictionary
        addToDictionaryInEditor(context.editor.contentDOM, word);
      }
    }
  });
  
  if (options.length === 0) return null;
  
  return {
    from: span.start,
    to: span.end,
    options,
    filter: false
  };
}

// Simplified keyboard navigation
export const issueNavigationKeymap = keymap.of([
  { key: "Ctrl-Space", run: (view) => {
    const pos = view.state.selection.main.head;
    return handleIssueInteraction(view, pos, true);
  }},
  { key: "Tab", run: (view) => {
    const pos = view.state.selection.main.head;
    return handleIssueInteraction(view, pos, false);
  }},
  { key: "Ctrl-j", run: (view) => navigateToNextIssue(view) },
  { key: "Ctrl-k", run: (view) => navigateToPreviousIssue(view) }
]);

// Helper functions
function findIssueAtPosition(issues: HarperIssue[], pos: number): HarperIssue | null {
  return issues.find(issue => {
    const span = issue.lint.span();
    return pos >= span.start && pos <= span.end;
  }) || null;
}

function navigateToNextIssue(view: EditorView): boolean {
  const issueState = view.state.field(issueStateField);
  if (issueState.issues.length === 0) return false;
  
  const currentPos = view.state.selection.main.head;
  let nextIssue = issueState.issues.find(issue => issue.lint.span().start > currentPos);
  
  if (!nextIssue) nextIssue = issueState.issues[0];
  if (!nextIssue) return false;
  
  const span = nextIssue.lint.span();
  view.dispatch({
    selection: { anchor: span.start },
    effects: [
      EditorView.scrollIntoView(span.start, { y: "center" }),
      setSelectedIssueEffect.of(nextIssue.id)
    ]
  });
  
  view.focus();
  return true;
}

function navigateToPreviousIssue(view: EditorView): boolean {
  const issueState = view.state.field(issueStateField);
  if (issueState.issues.length === 0) return false;
  
  const currentPos = view.state.selection.main.head;
  let prevIssue = [...issueState.issues].reverse().find(issue => issue.lint.span().start < currentPos);
  
  if (!prevIssue) prevIssue = issueState.issues[issueState.issues.length - 1];
  if (!prevIssue) return false;
  
  const span = prevIssue.lint.span();
  view.dispatch({
    selection: { anchor: span.start },
    effects: [
      EditorView.scrollIntoView(span.start, { y: "center" }),
      setSelectedIssueEffect.of(prevIssue.id)
    ]
  });
  
  view.focus();
  return true;
}

// Export simplified extensions
export const harperExtensions = [
  issueStateField,
  issueDecorations,
  autocompletion({ override: [harperAutocomplete] }),
  issueNavigationKeymap,
  EditorView.domEventHandlers({
    mousedown(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos !== null) {
        handleIssueInteraction(view, pos);
      }
      return false;
    }
  })
];