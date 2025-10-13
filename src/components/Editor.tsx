import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import type { ViewUpdate } from '@codemirror/view';
import type { EditorProps } from '../types';
import { issueField, issueTheme, issueClickHandler, updateIssuesEffect } from '../utils/editor-extensions';

const Editor: Component<EditorProps> = (props) => {
	let editorRef!: HTMLDivElement;
	let view: EditorView | undefined;

	onMount(() => {
		if (!editorRef) return;

		const startState = EditorState.create({
			doc: props.content,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightSpecialChars(),
				history(),
				drawSelection(),
				dropCursor(),
				rectangularSelection(),
				crosshairCursor(),
				highlightActiveLine(),
				EditorView.lineWrapping,
				keymap.of([...defaultKeymap, ...historyKeymap]),
				issueField,
				issueTheme,
				issueClickHandler((issueId) => props.onIssueSelect(issueId)),
				EditorView.updateListener.of((update: ViewUpdate) => {
					if (update.docChanged) {
						const newContent = update.state.doc.toString();
						props.onContentChange(newContent);
					}
				}),
			],
		});

		view = new EditorView({
			state: startState,
			parent: editorRef,
		});
	});

	onCleanup(() => {
		if (view) {
			view.destroy();
		}
	});

	// Update editor content when prop changes (if different from current)
	createEffect(() => {
		if (view && view.state.doc.toString() !== props.content) {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: props.content,
				},
			});
		}
	});

	// Update issue decorations when issues change
	createEffect(() => {
		if (view) {
			view.dispatch({
				effects: updateIssuesEffect.of(props.issues),
			});
		}
	});

	// Scroll to selected issue
	createEffect(() => {
		const issueId = props.selectedIssueId;
		if (view && issueId) {
			const issue = props.issues.find(i => i.id === issueId);
			if (issue) {
				const span = issue.lint.span();
				view.dispatch({
					effects: EditorView.scrollIntoView(span.start, { y: 'center' }),
				});
			}
		}
	});

	return (
		<div class="h-full overflow-auto bg-white border-r border-gray-300">
			<div class="mx-auto max-w-[65ch] py-4 px-3">
				<div ref={editorRef} class="text-base" />
			</div>
		</div>
	);
};

export default Editor;
