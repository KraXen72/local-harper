import { Component, onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import type { HarperIssue, Suggestion } from '../types';
import { createHarperExtensions, updateIssuesEffect, setSelectedIssueEffect } from '../utils/editor-extensions';
import WordCounter from './WordCounter';

interface EditorProps {
	content: string;
	issues: HarperIssue[];
	selectedIssueId: string | null;
	onContentChange: (content: string) => void;
	onIssueSelect: (id: string | null) => void;
	onApplySuggestion: (issue: HarperIssue, suggestion: Suggestion) => void;
	onIgnore: (signature: string) => void;
	onAddToDictionary: (word: string) => void;
}

const Editor: Component<EditorProps> = (props) => {
	let editorRef!: HTMLDivElement;
	let view: EditorView;
	const [counterText, setCounterText] = createSignal(props.content);

	onMount(() => {
		const state = EditorState.create({
			doc: props.content,
			extensions: createHarperExtensions({
				onChange: (text, selectedText) => {
					props.onContentChange(text);
					setCounterText(selectedText || text);
				},
				onSelectIssue: props.onIssueSelect,
				onApply: props.onApplySuggestion,
				onIgnore: props.onIgnore,
				onAddDict: props.onAddToDictionary,
			}),
		});

		view = new EditorView({ state, parent: editorRef });
	});

	onCleanup(() => view?.destroy());

	// Sync content from outside (e.g. applying a suggestion)
	createEffect(() => {
		if (view && view.state.doc.toString() !== props.content) {
			view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.content } });
		}
	});

	// Sync issues down to CodeMirror
	createEffect(() => {
		if (view) view.dispatch({ effects: updateIssuesEffect.of(props.issues) });
	});

	// Sync selected issue from Sidebar -> Editor (scrolls to it)
	createEffect(() => {
		if (view && props.selectedIssueId) {
			view.dispatch({ effects: setSelectedIssueEffect.of(props.selectedIssueId) });
			const issue = props.issues.find(i => i.id === props.selectedIssueId);
			if (issue) {
				view.dispatch({
					selection: { anchor: issue.lint.span().start },
											effects: EditorView.scrollIntoView(issue.lint.span().start, { y: 'center' })
				});
				view.focus();
			}
		}
	});

	return (
		<div class="h-full overflow-auto bg-(--flexoki-bg) flex flex-col" onClick={(e) => { if(e.target === e.currentTarget) view?.focus() }}>
		<div class="flex-1 p-8 flex justify-center">
		<div class="w-full max-w-3xl rounded-xl border border-(--flexoki-ui-2) bg-(--flexoki-bg) overflow-hidden" ref={editorRef} />
		</div>
		<div class="sticky bottom-0 bg-(--flexoki-bg) border-t border-(--flexoki-ui-2) px-4">
		<div class="max-w-3xl mx-auto"><WordCounter text={counterText()} /></div>
		</div>
		</div>
	);
};

export default Editor;
