import { StateField, StateEffect, EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, showTooltip, Tooltip, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { autocompletion, startCompletion, closeCompletion } from '@codemirror/autocomplete';
import type { HarperIssue, Suggestion } from '../types';
import { lintKindColor, lintKindBackgroundColor } from './lint-kind-colors';

export const updateIssuesEffect = StateEffect.define<HarperIssue[]>();
export const setSelectedIssueEffect = StateEffect.define<string | null>();

interface HarperPluginCallbacks {
	onChange: (doc: string, selection?: string) => void;
	onSelectIssue: (id: string | null) => void;
	onApply: (issue: HarperIssue, suggestion: Suggestion) => void;
	onIgnore: (signature: string) => void;
	onAddDict: (word: string) => void;
}

export function createHarperExtensions(callbacks: HarperPluginCallbacks) {
	// 1. Issue Tracking State
	const issueStateField = StateField.define<{ issues: HarperIssue[]; selectedId: string | null }>({
		create: () => ({ issues: [], selectedId: null }),
																																																	update(state, tr) {
																																																		let next = { ...state };
																																																		for (const e of tr.effects) {
																																																			if (e.is(updateIssuesEffect)) next.issues = e.value;
																																																			if (e.is(setSelectedIssueEffect)) next.selectedId = e.value;
																																																		}
																																																		return next;
																																																	}
	});

	// 2. Decorations (Underlines)
	const decorationField = StateField.define<DecorationSet>({
		create: () => Decoration.none,
																													 update(decs, tr) {
																														 decs = decs.map(tr.changes);
																														 const state = tr.state.field(issueStateField);

																														 if (tr.effects.some(e => e.is(updateIssuesEffect) || e.is(setSelectedIssueEffect))) {
																															 const marks = state.issues.map(issue => {
																																 const isSelected = issue.id === state.selectedId;
																																 const kind = issue.lint.lint_kind();
																																 return Decoration.mark({
																																	 class: `cm-issue-underline ${isSelected ? 'cm-issue-selected' : ''}`,
																																	 attributes: {
																																		 style: `text-decoration-color: ${lintKindColor(kind)}; background-color: ${isSelected ? lintKindBackgroundColor(kind) : 'transparent'};`,
																																												'data-issue-id': issue.id
																																	 }
																																 }).range(issue.lint.span().start, issue.lint.span().end);
																															 });
																															 return Decoration.set(marks, true);
																														 }
																														 return decs;
																													 },
																													 provide: f => EditorView.decorations.from(f)
	});

	// 3. Autocomplete Provider
	const harperCompletion = autocompletion({
		override: [
			(context) => {
				const state = context.state.field(issueStateField);
				const issue = state.issues.find(i =>
				i.lint.span().start <= context.pos && i.lint.span().end >= context.pos
				);

				if (!issue) return null;

				const isSpelling = issue.lint.lint_kind().toLowerCase().includes('spelling');
				const suggestions = issue.lint.suggestions();

				// Smart suppression: if no real actions, don't popup
				if (suggestions.length === 0 && !isSpelling) return null;

				const options = suggestions.map(s => ({
					label: s.get_replacement_text() || '(Remove)',
																							apply: () => callbacks.onApply(issue, s),
																							type: 'text'
				}));

				if (isSpelling) {
					options.push({ label: 'Add to Dictionary', type: 'class', apply: () => callbacks.onAddDict(issue.lint.get_problem_text()) });
				}

				options.push({ label: 'Ignore', type: 'class', apply: () => callbacks.onIgnore(issue.signature) });

				return { from: issue.lint.span().start, to: issue.lint.span().end, options, filter: false };
			}
		],
		activateOnTyping: false
	});

	// 4. Update Listener
	const updateListener = EditorView.updateListener.of((update) => {
		if (update.docChanged) {
			const sel = update.state.selection.main;
			const selectedText = sel.empty ? undefined : update.state.sliceDoc(sel.from, sel.to);
			callbacks.onChange(update.state.doc.toString(), selectedText);
		}

		if (update.selectionSet && !update.transactions.some(tr => tr.effects.some(e => e.is(setSelectedIssueEffect)))) {
			const pos = update.state.selection.main.head;
			const issues = update.state.field(issueStateField).issues;
			const hovered = issues.find(i => i.lint.span().start <= pos && i.lint.span().end >= pos);
			callbacks.onSelectIssue(hovered ? hovered.id : null);
		}
	});

	// 5. Keymaps (Ctrl+J, Ctrl+K, Tab)
	const navigationKeymap = keymap.of([
		{ key: 'Tab', run: (view) => { startCompletion(view); return true; } },
																		 { key: 'Ctrl-j', run: (view) => navigateIssues(view, 1, issueStateField, callbacks) },
																		 { key: 'Ctrl-k', run: (view) => navigateIssues(view, -1, issueStateField, callbacks) }
	]);

	// 6. Click handler to open suggestions
	const clickHandler = EditorView.domEventHandlers({
		mousedown(event, view) {
			const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
			if (pos !== null) {
				const issues = view.state.field(issueStateField).issues;
				const clickedIssue = issues.find(i => i.lint.span().start <= pos && i.lint.span().end >= pos);
				if (clickedIssue) {
					setTimeout(() => startCompletion(view), 10);
				}
			}
			return false;
		}
	});

	return [
		history(),
		EditorView.lineWrapping,
		keymap.of([...defaultKeymap, ...historyKeymap]),
		issueStateField,
		decorationField,
		harperCompletion,
		updateListener,
		navigationKeymap,
		clickHandler,
		theme
	];
}

function navigateIssues(view: EditorView, dir: 1 | -1, field: any, cb: HarperPluginCallbacks) {
	const issues: HarperIssue[] = view.state.field(field).issues;
	if (!issues.length) return false;

	const pos = view.state.selection.main.head;
	let target = dir === 1
	? issues.find(i => i.lint.span().start > pos) || issues[0]
	: [...issues].reverse().find(i => i.lint.span().start < pos) || issues[issues.length - 1];

	cb.onSelectIssue(target.id);
	view.dispatch({
		selection: { anchor: target.lint.span().start },
								effects: EditorView.scrollIntoView(target.lint.span().start, { y: 'center' })
	});
	setTimeout(() => startCompletion(view), 10);
	return true;
}

const theme = EditorView.theme({
	'&': { color: '#CECDC3', backgroundColor: 'transparent' },
	'.cm-content': { padding: '0', caretColor: '#CECDC3' },
	'.cm-selectionBackground, ::selection': { backgroundColor: '#3aa99f4c !important' },
	'.cm-issue-underline': { textDecoration: 'underline solid 2px', textUnderlineOffset: '2px' }
}, { dark: true });
