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
	darkEditorTheme,
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
				darkEditorTheme,
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

	// Combined effect to handle content and issues updates together
	// This prevents decorations from flashing when both change simultaneously
	createEffect(() => {
		if (!view) return;
		
		const currentContent = view.state.doc.toString();
		const newContent = props.content;
		const newIssues = props.issues;
		const newSelectedId = props.selectedIssueId;
		
		const contentChanged = currentContent !== newContent;
		
		// If content changed, dispatch both content and issues in same transaction
		if (contentChanged) {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: newContent,
				},
				effects: [
					updateIssuesEffect.of(newIssues),
					setSelectedIssueEffect.of(newSelectedId),
				],
			});
		}
		// If only issues or selection changed, dispatch those effects
		else {
			view.dispatch({
				effects: [
					updateIssuesEffect.of(newIssues),
					setSelectedIssueEffect.of(newSelectedId),
				],
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

	const handleContainerClick = (e: MouseEvent) => {
		// If clicking in the empty space (not on the editor), focus the editor
		if (view && e.target !== editorRef && !(editorRef.contains(e.target as Node))) {
			view.focus();
		}
	};

	return (
		<div class="h-full overflow-auto bg-[#1a1a1a]" onClick={handleContainerClick}>
			<div class="h-full mx-auto max-w-[65ch] py-4 px-3">
				<div ref={editorRef} class="h-full text-base" />
			</div>
		</div>
	);
};

export default Editor;
