import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewUpdate, keymap, showTooltip, Tooltip } from '@codemirror/view';
import { createEffect, onCleanup, onMount } from 'solid-js';
import { actions, store } from '../store';
import { getLintColor } from '../utils';

// Define the shape of our sanitized issue
interface SafeIssue {
  id: string;
  lint: {
    kind: string;       // Property, not function
    message: string;    // Property
    span: { start: number; end: number }; // Property
    suggestions: any[];
  };
}

const setIssuesEffect = StateEffect.define<SafeIssue[]>();

interface IssueState {
  issues: SafeIssue[];
  decorations: DecorationSet;
}

const issueField = StateField.define<IssueState>({
  create: () => ({ issues: [], decorations: Decoration.none }),
  update(value, tr) {
    let { issues, decorations } = value;
    decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(setIssuesEffect)) {
        issues = effect.value;
        decorations = Decoration.set(
          issues.map(issue => {
            const span = issue.lint.span; // Property access
            return Decoration.mark({
              class: 'cm-lint-mark',
              attributes: {
                // Property access for kind
                style: `text-decoration-color: ${getLintColor(issue.lint.kind)};` 
              }
            }).range(span.start, span.end);
          }).sort((a, b) => a.from - b.from)
        );
      }
    }
    return { issues, decorations };
  },
  provide: f => EditorView.decorations.from(f, v => v.decorations)
});

// --- Tooltip Extension ---
const cursorTooltipBaseTheme = EditorView.baseTheme({
  ".cm-tooltip.cm-cursor-tooltip": {
    backgroundColor: "var(--flexoki-bg-2)",
    border: "1px solid var(--flexoki-ui-2)",
    padding: "8px",
    borderRadius: "6px"
  }
});

const cursorTooltipField = StateField.define<Tooltip | null>({
  create: () => null,
  update(tooltip, tr) {
    const state = tr.state;
    const pos = state.selection.main.head;
    const { issues } = state.field(issueField);
    
    const activeIssue = issues.find(i => {
      const s = i.lint.span;
      return s.start <= pos && pos <= s.end;
    });

    if (!activeIssue) return null;

    return {
      pos,
      above: true,
      create: () => {
        const dom = document.createElement("div");
        dom.className = "cm-cursor-tooltip";
        
        const title = document.createElement("div");
        title.style.fontWeight = "bold";
        title.style.color = getLintColor(activeIssue.lint.kind);
        title.textContent = activeIssue.lint.kind;

        const msg = document.createElement("div");
        msg.textContent = activeIssue.lint.message; 

        dom.appendChild(title);
        dom.appendChild(msg);
        return { dom };
      }
    };
  },
  provide: f => showTooltip.from(f)
});

export default function Editor() {
  let parent!: HTMLDivElement;
  let view: EditorView;

  onMount(() => {
    view = new EditorView({
      parent,
      state: EditorState.create({
        doc: store.text,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.lineWrapping,
          issueField,
          cursorTooltipField,
          cursorTooltipBaseTheme,
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.docChanged) {
              actions.setText(update.state.doc.toString());
            }
            if (update.selectionSet) {
              const pos = update.state.selection.main.head;
              const { issues } = update.state.field(issueField);
              const issue = issues.find(i => {
                const s = i.lint.span;
                return s.start <= pos && pos <= s.end;
              });
              if (issue && issue.id !== store.focusedIssueId) {
                actions.setFocus(issue.id);
              } else if (!issue && store.focusedIssueId) {
                actions.setFocus(null);
              }
            }
          })
        ]
      })
    });

    onCleanup(() => view.destroy());
  });

  createEffect(() => {
    if (!view) return;
    view.dispatch({ effects: setIssuesEffect.of(store.issues as SafeIssue[]) });
  });

  createEffect(() => {
    const id = store.focusedIssueId;
    if (!id || !view) return;

    const { issues } = view.state.field(issueField);
    const issue = issues.find(i => i.id === id);
    if (issue) {
      const span = issue.lint.span;
      view.dispatch({
        selection: { anchor: span.start },
        effects: EditorView.scrollIntoView(span.start, { y: 'center' })
      });
      view.focus();
    }
  });

  return <div ref={parent} class="h-full w-full overflow-hidden text-base" />;
}
