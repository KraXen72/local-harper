/**
 * Editor.tsx — CodeMirror 6 component
 *
 * Owns the CM EditorView and all CM extensions:
 *   - Harper underline decorations
 *   - Cursor-position tooltip
 *   - Autocomplete (suggestions + Add to Dictionary)
 *   - Ctrl+J/K navigation, Tab trigger
 *   - Click-on-issue → autocomplete
 *
 * All Solid ↔ CM communication goes through `createEffect` (pushing changes
 * into CM) and the `callbacks` ref object (CM events flowing out).
 */

import {
  createEffect,
  onCleanup,
  onMount,
  type Component,
} from "solid-js";
import {
  EditorState,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  type DecorationSet,
  keymap,
  showTooltip,
  type Tooltip,
  type ViewUpdate,
  ViewPlugin,
} from "@codemirror/view";
import {
  autocompletion,
  startCompletion,
  type CompletionContext,
  type CompletionResult,
  type Completion,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { RangeSetBuilder } from "@codemirror/state";
import type { Issue } from "./harper";

// ── Constants ──────────────────────────────────────────────────────────────

const KIND_COLORS: Record<string, string> = {
  Spelling:      "#D14D41",
  Grammar:       "#4385BE",
  Punctuation:   "#D0A215",
  Capitalization:"#DA702C",
  Style:         "#3AA99F",
  Enhancement:   "#879A39",
  Formatting:    "#8B7EC8",
  Readability:   "#CE5D97",
  Other:         "#8B7EC8",
};

function kindColor(kind: string): string {
  return KIND_COLORS[kind] ?? KIND_COLORS.Other;
}

// ── State effects + fields ─────────────────────────────────────────────────

const setIssuesEffect = StateEffect.define<Issue[]>();

/** Central issues field — all extensions read from here. */
const issuesField = StateField.define<Issue[]>({
  create: () => [],
  update(issues, tr) {
    for (const e of tr.effects) {
      if (e.is(setIssuesEffect)) return e.value;
    }
    return issues;
  },
});

// ── Decorations ────────────────────────────────────────────────────────────

function buildDecorations(issues: Issue[]): DecorationSet {
  if (issues.length === 0) return Decoration.none;
  const sorted = [...issues].sort((a, b) => a.start - b.start);
  const builder = new RangeSetBuilder<Decoration>();
  for (const issue of sorted) {
    const color = kindColor(issue.lintKind);
    builder.add(
      issue.start,
      issue.end,
      Decoration.mark({
        class: "cm-harper-underline",
        attributes: {
          style: `text-decoration-color: ${color}`,
          "data-harper-key": issue.key,
        },
      })
    );
  }
  return builder.finish();
}

const issueDecosField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decos, tr) {
    // Remap existing ranges when document changes
    decos = decos.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setIssuesEffect)) return buildDecorations(e.value);
    }
    return decos;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ── Tooltip ────────────────────────────────────────────────────────────────

type CallbackRefs = {
  onIgnore: (key: string) => void;
  onAddWord: (word: string) => void;
  onCursorIssueChange: (index: number | null) => void;
  onNavigate: (dir: "next" | "prev") => void;
  onApplySuggestion: (issue: Issue, suggestion: string) => void;
};

function formatMessage(raw: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "harper-tooltip-message";
  const parts = raw.split(/(`[^`]+`)/g);
  for (const part of parts) {
    if (part.startsWith("`") && part.endsWith("`")) {
      const code = document.createElement("code");
      code.textContent = part.slice(1, -1);
      span.appendChild(code);
    } else {
      span.appendChild(document.createTextNode(part));
    }
  }
  return span;
}

function makeTooltipField(callbacks: CallbackRefs): Extension {
  return StateField.define<Tooltip | null>({
    create: () => null,
    update(tooltip, tr) {
      const relevant =
        tr.docChanged ||
        tr.selectionSet ||
        tr.effects.some((e) => e.is(setIssuesEffect));
      if (!relevant) return tooltip;

      const cursor = tr.state.selection.main.head;
      const issues = tr.state.field(issuesField);
      const issue = issues.find((i) => cursor > i.start && cursor <= i.end);
      if (!issue) return null;

      // Only show tooltip when issue has no suggestions and isn't spelling
      // (if it has suggestions, the tooltip would duplicate the autocomplete)
      const hasAutocomplete = issue.suggestions.length > 0 || issue.isSpelling;

      return {
        pos: issue.start,
        above: true,
        strictSide: false,
        arrow: false,
        create: () => {
          const dom = document.createElement("div");

          // Kind badge
          const badge = document.createElement("span");
          badge.className = "harper-tooltip-kind";
          badge.style.setProperty("--harper-kind-color", kindColor(issue.lintKind));
          badge.textContent = issue.lintKind;
          dom.appendChild(badge);
          dom.appendChild(document.createElement("br"));

          // Message
          dom.appendChild(formatMessage(issue.message));

          // Ignore button (always shown in tooltip)
          if (!hasAutocomplete) {
            const btn = document.createElement("button");
            btn.className = "harper-tooltip-ignore";
            btn.textContent = "Ignore";
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              callbacks.onIgnore(issue.key);
            });
            dom.appendChild(btn);
          }

          return {
            dom,
            // Add class to CM's wrapper div so our CSS selector works
            mount() {
              dom.parentElement?.classList.add("harper-tooltip");
            },
          };
        },
      };
    },
    provide: (f) => showTooltip.from(f),
  });
}

// ── Cursor issue tracking plugin ───────────────────────────────────────────

function makeCursorPlugin(callbacks: CallbackRefs): Extension {
  let lastIndex: number | null = null;

  return ViewPlugin.define((_view) => ({
    update(update: ViewUpdate) {
      const relevant =
        update.selectionSet ||
        update.effects.some((e) => e.is(setIssuesEffect));
      if (!relevant) return;

      const cursor = update.view.state.selection.main.head;
      const issues = update.view.state.field(issuesField);
      const idx = issues.findIndex((i) => cursor > i.start && cursor <= i.end);
      const newIdx = idx === -1 ? null : idx;

      if (newIdx !== lastIndex) {
        lastIndex = newIdx;
        // Use queueMicrotask to keep CM update and Solid signal write separate
        queueMicrotask(() => callbacks.onCursorIssueChange(newIdx));
      }

      // Click on issue → auto-open autocomplete (if it has suggestions)
      const isPointerSelect = update.transactions.some((t) =>
        t.isUserEvent("select.pointer")
      );
      if (isPointerSelect && newIdx !== null) {
        const issue = issues[newIdx];
        if (issue.suggestions.length > 0 || issue.isSpelling) {
          requestAnimationFrame(() => startCompletion(update.view));
        }
      }
    },
  }));
}

// ── Autocomplete ───────────────────────────────────────────────────────────

function makeAutocomplete(callbacks: CallbackRefs): Extension {
  function completionSource(context: CompletionContext): CompletionResult | null {
    const cursor = context.pos;
    const issues = context.state.field(issuesField);
    const issue = issues.find((i) => cursor > i.start && cursor <= i.end);
    if (!issue) return null;
    if (issue.suggestions.length === 0 && !issue.isSpelling) return null;

    const options: Completion[] = issue.suggestions.map((s) => ({
      label: s,
      apply(view: EditorView, _completion: Completion, from: number, to: number) {
        view.dispatch({
          changes: { from, to, insert: s },
          selection: { anchor: from + s.length },
        });
        callbacks.onApplySuggestion(issue, s);
      },
    }));

    if (issue.isSpelling) {
      const word = context.state.sliceDoc(issue.start, issue.end);
      options.push({
        label: `Add "${word}" to dictionary`,
        apply(_view: EditorView) {
          // Don't insert text — just add the word, which re-triggers analysis
          callbacks.onAddWord(word);
        },
      });
    }

    return { from: issue.start, to: issue.end, options };
  }

  return autocompletion({
    override: [completionSource],
    closeOnBlur: true,
    activateOnTyping: false,
  });
}

// ── Keymap ─────────────────────────────────────────────────────────────────

function makeKeymap(callbacks: CallbackRefs): Extension {
  return keymap.of([
    {
      key: "Ctrl-j",
      run: () => {
        callbacks.onNavigate("next");
        return true;
      },
    },
    {
      key: "Ctrl-k",
      run: () => {
        callbacks.onNavigate("prev");
        return true;
      },
    },
    {
      key: "Tab",
      run: (view) => {
        const cursor = view.state.selection.main.head;
        const issues = view.state.field(issuesField);
        const issue = issues.find((i) => cursor > i.start && cursor <= i.end);
        if (!issue) return false;
        if (issue.suggestions.length === 0 && !issue.isSpelling) return false;
        startCompletion(view);
        return true;
      },
    },
    ...defaultKeymap,
    ...historyKeymap,
  ]);
}

// ── Theme ──────────────────────────────────────────────────────────────────

const harperTheme = EditorView.theme({
  "&": { height: "100%", background: "transparent" },
  ".cm-tooltip.harper-tooltip": { fontFamily: "var(--font-family-sans)" },
});

// ── Component ──────────────────────────────────────────────────────────────

interface EditorProps {
  issues: Issue[];
  selectedIssueIndex: number | null;
  /** Incrementing this triggers autocomplete at the selected issue. */
  autocompleteTrigger: number;
  placeholder?: string;
  onTextChange: (text: string) => void;
  onCursorIssueChange: (index: number | null) => void;
  onNavigate: (dir: "next" | "prev") => void;
  onIgnore: (key: string) => void;
  onAddWord: (word: string) => void;
  onApplySuggestion: (issue: Issue, suggestion: string) => void;
  onSelectionChange: (selectedText: string | null) => void;
}

const Editor: Component<EditorProps> = (props) => {
  let container!: HTMLDivElement;
  let view: EditorView | undefined;

  // Mutable ref bag so CM extensions always call the latest Solid callbacks
  const callbacks: CallbackRefs = {
    onIgnore: (key) => props.onIgnore(key),
    onAddWord: (word) => props.onAddWord(word),
    onCursorIssueChange: (idx) => props.onCursorIssueChange(idx),
    onNavigate: (dir) => props.onNavigate(dir),
    onApplySuggestion: (issue, s) => props.onApplySuggestion(issue, s),
  };

  // Keep callbacks in sync — these are plain function reassignments,
  // no reactive tracking needed (callbacks is a plain object, not a signal).
  createEffect(() => {
    callbacks.onIgnore           = (key)     => props.onIgnore(key);
    callbacks.onAddWord          = (word)    => props.onAddWord(word);
    callbacks.onCursorIssueChange= (idx)     => props.onCursorIssueChange(idx);
    callbacks.onNavigate         = (dir)     => props.onNavigate(dir);
    callbacks.onApplySuggestion  = (issue,s) => props.onApplySuggestion(issue, s);
  });

  onMount(() => {
    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        props.onTextChange(update.state.doc.toString());
      }
      if (update.selectionSet) {
        const sel = update.state.selection.main;
        const selectedText = sel.empty ? null : update.state.sliceDoc(sel.from, sel.to);
        props.onSelectionChange(selectedText);
      }
    });

    const placeholderAttrs = props.placeholder
      ? [EditorView.contentAttributes.of({ "aria-placeholder": props.placeholder })]
      : [];

    view = new EditorView({
      parent: container,
      state: EditorState.create({
        doc: "",
        extensions: [
          issuesField,
          issueDecosField,
          makeTooltipField(callbacks),
          makeCursorPlugin(callbacks),
          makeAutocomplete(callbacks),
          makeKeymap(callbacks),
          harperTheme,
          history(),
          EditorView.lineWrapping,
          updateListener,
          ...placeholderAttrs,
        ],
      }),
    });
  });

  onCleanup(() => view?.destroy());

  // Push updated issues into CM
  createEffect(() => {
    const issues = props.issues;
    const v = view;
    if (!v) return;
    v.dispatch({ effects: setIssuesEffect.of(issues) });
  });

  // Scroll editor to selected issue (from sidebar click or Ctrl+J/K)
  createEffect(() => {
    const idx = props.selectedIssueIndex;
    const v = view;
    if (idx === null || !v) return;
    const issue = props.issues[idx];
    if (!issue) return;

    const cursor = v.state.selection.main.head;
    if (cursor > issue.start && cursor <= issue.end) return;

    v.dispatch({
      selection: { anchor: issue.start + 1 },
      scrollIntoView: true,
    });
    v.focus();
  });

  // Trigger autocomplete when requested by parent (sidebar click)
  let lastTrigger = 0;
  createEffect(() => {
    const trigger = props.autocompleteTrigger;
    const v = view;
    if (trigger === 0 || trigger === lastTrigger || !v) return;
    lastTrigger = trigger;
    requestAnimationFrame(() => startCompletion(v));
  });

  return (
    <div
      ref={container}
      class="h-full w-full overflow-hidden"
      style={{ background: "transparent" }}
    />
  );
};

export default Editor;
