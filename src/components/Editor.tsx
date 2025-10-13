import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import { EditorView, keymap, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import type { ViewUpdate } from '@codemirror/view';
import type { EditorProps } from '../types';
import { 
	issueField, 
	issueDecorationsField,
	issueTheme, 
	issueClickHandler, 
	updateIssuesEffect, 
	setSelectedIssueEffect,
	showContextMenuEffect,
	contextMenuField,
	closeMenuOnEscape,
	setContextMenuActions
} from '../utils/editor-extensions';

const Editor: Component<EditorProps> = (props) => {
	let editorRef!: HTMLDivElement;
	let view: EditorView | undefined;

	onMount(() => {
		if (!editorRef) return;

		// Set up context menu actions
		setContextMenuActions({
			onApplySuggestion: (issueId, suggestion) => {
				props.onApplySuggestion(issueId, suggestion);
			},
			onAddToDictionary: (word) => {
				props.onAddToDictionary(word);
			},
			onIgnore: () => {
				// Just deselect for now
				props.onIssueSelect(null);
			},
		});

		const startState = EditorState.create({
			doc: props.content,
			extensions: [
				highlightSpecialChars(),
				history(),
				drawSelection(),
				dropCursor(),
				rectangularSelection(),
				crosshairCursor(),
				EditorView.lineWrapping,
				keymap.of([...defaultKeymap, ...historyKeymap]),
				issueField,
				issueDecorationsField,
				contextMenuField,
				issueTheme,
				issueClickHandler(),
				closeMenuOnEscape,
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

	// Update selected issue
	createEffect(() => {
		if (view) {
			view.dispatch({
				effects: setSelectedIssueEffect.of(props.selectedIssueId),
			});
		}
	});

	// Scroll to issue and show context menu when requested from sidebar
	createEffect(() => {
		const scrollTo = props.scrollToIssue;
		if (view && scrollTo) {
			const issue = props.issues.find(i => i.id === scrollTo);
			if (issue) {
				const span = issue.lint.span();
				view.dispatch({
					effects: [
						EditorView.scrollIntoView(span.start, { y: 'center' }),
						showContextMenuEffect.of({ issueId: scrollTo, pos: span.start }),
					],
				});
			}
		}
	});

	return (
		<div class="h-full overflow-auto bg-white">
			<div class="h-full mx-auto max-w-[65ch] py-4 px-3">
				<div ref={editorRef} class="h-full text-base" />
			</div>
		</div>
	);
};

export default Editor;
