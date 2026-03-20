import { Component, onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import WordCounter from './WordCounter';
import { EditorView, keymap, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import type { ViewUpdate } from '@codemirror/view';
import type { EditorProps } from '../types';
import {
	issueField,
	issueDecorationsField,
	issueTheme,
	darkEditorTheme,
	updateIssuesEffect,
	setSelectedIssueEffect,
	harperAutocompletion,
	harperCursorTooltip,
	setIssueActions,
	issueNavigationKeymap,
	issueSyncExtension,
	issueClickAutocomplete,
	triggerAutocompleteForIssue,
} from '../utils/editor-extensions';

const Editor: Component<EditorProps> = (props) => {
	let editorRef!: HTMLDivElement;
	let view: EditorView | undefined;

	const [counterText, setCounterText] = createSignal(props.content);

	onMount(() => {
		if (!editorRef) return;

		// Set up issue actions for autocomplete
		setIssueActions({
			onApplySuggestion: (issueId, suggestion) => {
				props.onApplySuggestion(issueId, suggestion);
			},
			onAddToDictionary: (word) => {
				props.onAddToDictionary(word);
			},
			onIgnore: (issueId) => {
				props.onIgnore(issueId);
			},
			onIssueSelect: (issueId) => {
				props.onIssueSelect(issueId);
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

					// Update word counter based on selection or whole document
					if (update.selectionSet) {
						const sel = update.state.selection.main;
						if (!sel.empty) {
							const selectedText = update.state.sliceDoc(sel.from, sel.to);
							setCounterText(selectedText);
						} else {
							setCounterText(update.state.doc.toString());
						}
					}
				}),
			],
		});

		view = new EditorView({
			state: startState,
			parent: editorRef,
		});

		// ensure initial counter state reflects the full document
		setCounterText(props.content);
	});

	onCleanup(() => {
		if (view) {
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

				// Trigger autocomplete using the unified helper (will skip if only Ignore would be shown)
				triggerAutocompleteForIssue(view, issue);
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
		<div class="h-full overflow-auto bg-(--flexoki-bg)" onClick={handleContainerClick}>
			<div class="pt-12 px-4 pb-12 flex justify-center">
				<div
					class="bg-(--flexoki-bg) rounded-xl overflow-hidden shadow-2xl border border-(--flexoki-ui-2) w-full max-w-216.75"
					ref={editorRef}>
				</div>
			</div>

			{/* Sticky word counter at bottom of the scrolling container */}
			<div class="sticky bottom-0 left-0 right-0 px-4">
				<div class="w-full max-w-216.75 mx-auto bg-(--flexoki-bg)">
					<hr class="border-(--flexoki-ui-2) my-2" />
					<WordCounter text={counterText()} />
				</div>
			</div>
		</div>
	);
};

export default Editor;
