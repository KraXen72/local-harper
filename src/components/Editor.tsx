import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { crosshairCursor, drawSelection, dropCursor, EditorView, highlightSpecialChars, keymap, placeholder, rectangularSelection } from '@codemirror/view';
import { Component, createEffect, onCleanup, onMount } from 'solid-js';
import type { EditorProps } from '../types';
// import SummonEvent removed; editor manager handles summon routing
import {
	darkEditorTheme,
	harperAutocompletion,
	harperCursorTooltip,
	issueClickAutocomplete,
 	issueDecorationsField,
 	issueField,
 	issueNavigationKeymap,
 	issueSyncExtension,
 	issueTheme,
 	setSelectedIssueEffect,
 	updateIssuesEffect,
} from '../utils/editor-extensions';
import editorManager from '../services/editor-manager';

const Editor: Component<EditorProps> = (props) => {
	let editorRef: HTMLDivElement | undefined;
	let view: EditorView | undefined;

	onMount(() => {
		if (!editorRef) return;



		const startState = EditorState.create({
			doc: props.content,
			extensions: [
				highlightSpecialChars(),
				history(),
				drawSelection(),
				dropCursor(),
				rectangularSelection(),
				crosshairCursor(),
				placeholder("Paste text or start typing..."),
				EditorView.lineWrapping,
				keymap.of([...defaultKeymap, ...historyKeymap]),
				issueNavigationKeymap,
				issueField,
				issueDecorationsField,
				issueTheme,
				darkEditorTheme,
				harperAutocompletion,
				harperCursorTooltip,
				issueSyncExtension,
				issueClickAutocomplete,
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

		// Attach the created view to the centralized editor manager which wires
		// callbacks into the editor extensions and summon processor.
		editorManager.attachView(view, {
			onApplySuggestion: (issueId, suggestion) => {
				void editorManager.applySuggestion(issueId, suggestion).catch?.(console.error);
			},
			onAddToDictionary: (word) => {
				void editorManager.addWordToDictionary(word).catch?.(console.error);
			},
			onIgnore: (issueId) => {
				editorManager.ignoreIssue(issueId);
			},
			onIssueSelect: (issueId) => props.onIssueSelect(issueId),
		});
	});

		onCleanup(() => {
			if (view) {
				editorManager.destroy();
				view.destroy();
			}
		});

	// Track previous values to detect real changes
	let prevIssues = props.issues;
	let prevSelectedId = props.selectedIssueId;

	// Update editor content when prop changes
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

	// Update issue decorations only when issues actually change
	createEffect(() => {
		const newIssues = props.issues;
		if (view && newIssues !== prevIssues) {
			prevIssues = newIssues;
			view.dispatch({
				effects: updateIssuesEffect.of(newIssues),
			});
		}
	});

	// Update selected issue only when it actually changes
	createEffect(() => {
		const newSelectedId = props.selectedIssueId;
		if (view && newSelectedId !== prevSelectedId) {
			prevSelectedId = newSelectedId;
			view.dispatch({
				effects: setSelectedIssueEffect.of(newSelectedId),
			});
		}
	});

	// Scroll to issue and select it when requested from sidebar
	createEffect(() => {
		const scrollTo = props.scrollToIssue;
		if (view && scrollTo) {
			const issue = props.issues.find(i => i.id === scrollTo);
			if (issue) {
				const span = issue.lint.span();
				
				view.dispatch({
					selection: { anchor: span.start },
					effects: [
						EditorView.scrollIntoView(span.start, { y: 'center' }),
						setSelectedIssueEffect.of(scrollTo),
					],
				});
				
				// Focus the editor so user can immediately interact
				view.focus();
				
				// Trigger autocomplete/selection through the editor manager (will skip if only Ignore would be shown)
				void editorManager.focusIssue(scrollTo).catch?.(console.error);
			}
		}
	});

	const handleContainerClick = (e: MouseEvent) => {
		// If clicking in the empty space (not on the editor), focus the editor
		if (view && editorRef && e.target !== editorRef && !(editorRef.contains(e.target as Node))) {
			view.focus();
		}
	};

	return (
		<div class="h-full overflow-auto bg-(--flexoki-bg)" onClick={handleContainerClick}>
			{/* Top margin: 20vh (1/5 of screen) */}
			<div class="pt-12 px-4 pb-12 flex justify-center">
				<div class="bg-(--flexoki-bg) rounded-xl overflow-hidden shadow-2xl border border-(--flexoki-ui-2) max-w-[84ch] w-full">
					<div ref={(el) => (editorRef = el!)} class="text-base" />
				</div>
			</div>
		</div>
	);
};

export default Editor;
