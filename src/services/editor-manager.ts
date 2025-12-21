import { EditorView } from '@codemirror/view';
import { SummonEvent, type SummonOptions } from '../types';
import { startCompletion } from '@codemirror/autocomplete';
import { setIssueActions as setEditorIssueActions, setSummonHandler as setEditorSummonHandler, issueField, setSelectedIssueEffect, triggerAutocompleteForIssue } from '../utils/editor-extensions';
import { getLinter, analyzeText, transformLints, addWordToDictionary as svcAddWordToDictionary } from '../services/harper-service';
import { content, setContent, issues as storeIssues, setIssues, setSelectedIssueId } from '../state/app-store';
import type { Suggestion } from '../types';

type Callbacks = {
  onContentChange?: (content: string) => void;
  onApplySuggestion?: (issueId: string, suggestion: Suggestion) => void;
  onAddToDictionary?: (word: string) => void;
  onIgnore?: (issueId: string) => void;
  onIssueSelect?: (issueId: string | null) => void;
};

class EditorManager {
  private view: EditorView | null = null;
  private callbacks: Callbacks | null = null;

  // Default mapping from SummonEvent to options (migrated from summon-events.ts)
  private DEFAULT_MAPPING: Record<SummonEvent, SummonOptions> = {
    CursorMoved: { showPopup: true, showAutocomplete: false, focusEditor: false },
    ClickedInEditor: { showPopup: true, showAutocomplete: true, focusEditor: true },
    SidebarClicked: { showPopup: true, showAutocomplete: false, focusEditor: true },
    ExplicitAutocomplete: { showPopup: false, showAutocomplete: true, focusEditor: true, explicit: true },
    TabPressed: { showPopup: true, showAutocomplete: false, focusEditor: true },
    NavigateNext: { showPopup: true, showAutocomplete: false, focusEditor: true },
    NavigatePrevious: { showPopup: true, showAutocomplete: false, focusEditor: true },
    Programmatic: { showPopup: true, showAutocomplete: false, focusEditor: true },
  };

  // Centralized summon/event processor (migrated from summon-events.ts)
  async processSummonEvent(
    event: SummonEvent,
    ctx: { view?: EditorView; issueId?: string; pos?: number },
    opts?: Partial<SummonOptions>
  ) {
    const mapping = this.DEFAULT_MAPPING[event] ?? this.DEFAULT_MAPPING.Programmatic;
    const options: SummonOptions = { ...mapping, ...opts };

    const view = ctx.view ?? this.view;
    if (!view) return false;

    const state = view.state;
    const issueState = state.field(issueField);
    let targetIssue = null as any;

    if (ctx.issueId) {
      targetIssue = issueState.issues.find((i: any) => i.id === ctx.issueId) || null;
    } else if (typeof ctx.pos === 'number') {
      const pos = ctx.pos;
      targetIssue = issueState.issues.find((i: any) => {
        const span = i.lint.span();
        return span.start <= pos && pos <= span.end;
      }) || null;
    } else {
      const cursorPos = state.selection.main.head;
      targetIssue = issueState.issues.find((i: any) => {
        const span = i.lint.span();
        return span.start <= cursorPos && cursorPos <= span.end;
      }) || null;
    }

    if (!targetIssue) return false;

    if (options.focusEditor) {
      view.focus();
    }

    if (event === SummonEvent.TabPressed || event === SummonEvent.ExplicitAutocomplete) {
      const pos = typeof ctx.pos === 'number' ? ctx.pos : state.selection.main.head;
      const issueAtPos = issueState.issues.find((i: any) => {
        const s = i.lint.span();
        return s.start <= pos && pos <= s.end;
      }) || null;

      if (issueAtPos) {
        return !!triggerAutocompleteForIssue(view, issueAtPos, event === SummonEvent.ExplicitAutocomplete);
      }

      if (event === SummonEvent.ExplicitAutocomplete) {
        setTimeout(() => startCompletion(view), 0);
        return true;
      }

      return false;
    }

    const span = targetIssue.lint.span();
    view.dispatch({
      selection: { anchor: span.start },
      effects: [setSelectedIssueEffect.of(targetIssue.id), EditorView.scrollIntoView(span.start, { y: 'center' })],
    });

    if (options.showAutocomplete) {
      return !!triggerAutocompleteForIssue(view, targetIssue, !!options.explicit);
    }

    return true;
  }

  // Apply a suggestion via Harper linter and update app store
  async applySuggestion(issueId: string, suggestion: Suggestion): Promise<boolean> {
    try {
      const currentContent = content();
      const currentIssues = storeIssues();
      const issue = currentIssues.find(i => i.id === issueId);
      if (!issue) return false;

      const linter = getLinter();
      const newText = await linter.applySuggestion(currentContent, issue.lint, suggestion);

      const lints = await analyzeText(newText);
      const harperIssues = transformLints(lints);

      setSelectedIssueId(null);
      setContent(newText);
      setIssues(harperIssues);
      return true;
    } catch (e) {
      console.error('editorManager.applySuggestion failed:', e);
      return false;
    }
  }

  // Add a word to dictionary and re-analyze
  async addWordToDictionary(word: string): Promise<boolean> {
    try {
      await svcAddWordToDictionary(word);
      const newText = content();
      const lints = await analyzeText(newText);
      const harperIssues = transformLints(lints);
      setIssues(harperIssues);
      return true;
    } catch (e) {
      console.error('editorManager.addWordToDictionary failed:', e);
      return false;
    }
  }

  // Ignore an issue locally
  ignoreIssue(issueId: string): void {
    const current = storeIssues();
    setIssues(current.filter(i => i.id !== issueId));
    setSelectedIssueId(null);
  }

  attachView(view: EditorView, callbacks: Callbacks) {
    this.view = view;
    this.callbacks = callbacks;

    // Wire the existing editor-extensions' small API to the provided callbacks
    setEditorIssueActions({
      onApplySuggestion: (issueId, suggestion) => callbacks.onApplySuggestion?.(issueId, suggestion),
      onAddToDictionary: (word) => callbacks.onAddToDictionary?.(word),
      onIgnore: (issueId) => callbacks.onIgnore?.(issueId),
      onIssueSelect: (issueId) => callbacks.onIssueSelect?.(issueId),
    });

    // Route summon events from editor-extensions into the centralized processor
    setEditorSummonHandler((event, ctx) => {
      if (!this.view) return Promise.resolve(false);
      return this.processSummonEvent(event, { view: this.view, issueId: ctx.issueId, pos: ctx.pos }).catch((e) => {
        console.error('processSummonEvent failed:', e);
        return false;
      });
    });
  }

  destroy() {
    // Clear handlers to avoid leaking callbacks after view destroyed
    setEditorSummonHandler(null);
    setEditorIssueActions(null as any);
    this.view = null;
    this.callbacks = null;
  }

  // Focus an issue and optionally trigger popup/autocomplete via existing processor
  async focusIssue(issueId: string): Promise<boolean> {
    if (!this.view) return false;
    try {
      const res = await this.processSummonEvent(SummonEvent.SidebarClicked, { view: this.view, issueId });
      return !!res;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  // Trigger autocomplete programmatically (explicit=false will map to Programmatic event)
  async triggerAutocomplete(issueId?: string, explicit = false): Promise<boolean> {
    if (!this.view) return false;
    try {
      const event = explicit ? SummonEvent.ExplicitAutocomplete : SummonEvent.Programmatic;
      const res = await this.processSummonEvent(event, { view: this.view, issueId });
      return !!res;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  getView(): EditorView | null {
    return this.view;
  }
}

export const editorManager = new EditorManager();

export default editorManager;
