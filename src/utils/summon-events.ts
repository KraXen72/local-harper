import { SummonEvent, type SummonOptions } from '../types';
import { EditorView } from '@codemirror/view';
import { startCompletion } from '@codemirror/autocomplete';
import { issueField, setSelectedIssueEffect } from './editor-extensions';
import { triggerAutocompleteForIssue } from './editor-extensions';

// Default mapping from SummonEvent to options
const DEFAULT_MAPPING: Record<SummonEvent, SummonOptions> = {
	CursorMoved: { showPopup: true, showAutocomplete: false, focusEditor: false },
	ClickedInEditor: { showPopup: true, showAutocomplete: true, focusEditor: true },
	SidebarClicked: { showPopup: true, showAutocomplete: false, focusEditor: true },
	ExplicitAutocomplete: { showPopup: false, showAutocomplete: true, focusEditor: true, explicit: true },
	TabPressed: { showPopup: true, showAutocomplete: false, focusEditor: true },
	NavigateNext: { showPopup: true, showAutocomplete: false, focusEditor: true },
	NavigatePrevious: { showPopup: true, showAutocomplete: false, focusEditor: true },
	Programmatic: { showPopup: true, showAutocomplete: false, focusEditor: true },
};

/**
 * Focuses an issue in the editor by issueId or position and optionally triggers popup/autocomplete.
 * ctx: { view?, issueId?, pos? }
 */
export async function processSummonEvent(
	event: SummonEvent,
	ctx: { view?: EditorView; issueId?: string; pos?: number },
	opts?: Partial<SummonOptions>
) {
	const mapping = DEFAULT_MAPPING[event] ?? DEFAULT_MAPPING.Programmatic;
	const options: SummonOptions = { ...mapping, ...opts };

	const view = ctx.view;
	if (!view) return false;

	// Determine target issue either by id or by pos
	const state = view.state;
	const issueState = state.field(issueField);
	let targetIssue = null as any;

	if (ctx.issueId) {
		targetIssue = issueState.issues.find((i: any) => i.id === ctx.issueId) || null;
	} else if (typeof ctx.pos === 'number') {
		const pos = ctx.pos;
		// Search issues by span that contains pos
		targetIssue = issueState.issues.find((i: any) => {
			const span = i.lint.span();
			return span.start <= pos && pos <= span.end;
		}) || null;
	} else {
		// If no id/pos provided, use selection head
		const cursorPos = state.selection.main.head;
		targetIssue = issueState.issues.find((i: any) => {
			const span = i.lint.span();
			return span.start <= cursorPos && cursorPos <= span.end;
		}) || null;
	}

	if (!targetIssue) return false;

	// Focus editor if requested
	if (options.focusEditor) {
		view.focus();
	}

	// Set selection and selected issue effect — this will cause cursor tooltip to recompute
	// Special-case: TabPressed and ExplicitAutocomplete should trigger autocomplete at
	// the current cursor/issue position without moving the selection to the start
	// of the issue span. This prevents the cursor from jumping when the user
	// presses Tab to see suggestions.
	if (event === SummonEvent.TabPressed || event === SummonEvent.ExplicitAutocomplete) {
		// Prefer provided pos, otherwise use current selection head
		const pos = typeof ctx.pos === 'number' ? ctx.pos : state.selection.main.head;
		const issueAtPos = issueState.issues.find((i: any) => {
			const s = i.lint.span();
			return s.start <= pos && pos <= s.end;
		}) || null;

		if (issueAtPos) {
			return !!triggerAutocompleteForIssue(view, issueAtPos, event === SummonEvent.ExplicitAutocomplete);
		}

		// If no issue at pos but explicit autocomplete requested, start normal completion
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

	// Show popup: relying on existing cursorTooltipField to create tooltip for current selection
	// so no explicit action required other than selection change

	// Show autocomplete when requested
	if (options.showAutocomplete) {
		return !!triggerAutocompleteForIssue(view, targetIssue, !!options.explicit);
	}

	return true;
}
