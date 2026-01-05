import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { HarperIssue } from '../types';
import { lintKindColor, lintKindBackgroundColor } from '../utils/lint-kind-colors';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		harperDecoration: {
			setHarperIssues: (issues: HarperIssue[]) => ReturnType;
			setSelectedHarperIssue: (issueId: string | null) => ReturnType;
		};
	}
}

export const HarperDecoration = Extension.create({
	name: 'harperDecoration',

	addStorage() {
		return {
			issues: [] as HarperIssue[],
			selectedIssueId: null as string | null,
		};
	},

	addCommands() {
		return {
			setHarperIssues: (issues: HarperIssue[]) => ({ tr, dispatch }) => {
				if (dispatch) {
					tr.setMeta('setHarperIssues', issues);
				}
				return true;
			},
			setSelectedHarperIssue: (issueId: string | null) => ({ tr, dispatch }) => {
				if (dispatch) {
					tr.setMeta('setSelectedHarperIssue', issueId);
				}
				return true;
			},
		};
	},

	addKeyboardShortcuts() {
		const selectNextIssue = (editor: any) => {
			const issues = editor.storage.harperDecoration.issues;
			if (issues.length === 0) return null;

			const currentIndex = issues.findIndex((issue: HarperIssue) => issue.id === editor.storage.harperDecoration.selectedIssueId);
			const nextIndex = currentIndex < issues.length - 1 ? currentIndex + 1 : 0;
			const nextIssue = issues[nextIndex];

			// Scroll to issue
			editor.chain()
				.setTextSelection(nextIssue.lint.span().start)
				.focus()
				.run();

			return nextIssue.id;
		};

		const selectPreviousIssue = (editor: any) => {
			const issues = editor.storage.harperDecoration.issues;
			if (issues.length === 0) return null;

			const currentIndex = issues.findIndex((issue: HarperIssue) => issue.id === editor.storage.harperDecoration.selectedIssueId);
			const prevIndex = currentIndex > 0 ? currentIndex - 1 : issues.length - 1;
			const prevIssue = issues[prevIndex];

			// Scroll to issue
			editor.chain()
				.setTextSelection(prevIssue.lint.span().start)
				.focus()
				.run();

			return prevIssue.id;
		};

		return {
			'Mod-j': ({ editor }) => editor.commands.setSelectedHarperIssue(selectNextIssue(editor)),
			'Mod-k': ({ editor }) => editor.commands.setSelectedHarperIssue(selectPreviousIssue(editor)),
		};
	},

	addProseMirrorPlugins() {
		const extension = this;

		return [
			new Plugin({
				key: new PluginKey('harperDecoration'),
				state: {
					init(config, state) {
						return DecorationSet.empty;
					},
					apply(tr, oldDecorationSet, oldState, newState) {
						// Always map decorations through document changes first
						let decorationSet = oldDecorationSet.map(tr.mapping, tr.doc);

						// Handle issue updates
						const newIssues = tr.getMeta('setHarperIssues');
						if (newIssues !== undefined) {
							extension.storage.issues = newIssues;
							decorationSet = buildDecorations(newIssues, extension.storage.selectedIssueId, newState.doc);
						}

						// Handle selection updates with diffing
						const newSelectedId = tr.getMeta('setSelectedHarperIssue');
						if (newSelectedId !== undefined) {
							extension.storage.selectedIssueId = newSelectedId;
							decorationSet = updateDecorationsForSelection(decorationSet, newSelectedId, extension.storage.issues, newState.doc);
						}

						return decorationSet;
					},
				},
				props: {
					decorations(state) {
						return this.getState(state);
					},
					handleDOMEvents: {
						click(view, event) {
							const node = event.target as Node;
							// event.target can be a Text node; ensure we operate on an Element
							let targetEl: HTMLElement | null = null;
							if (node instanceof HTMLElement) targetEl = node;
							else if (node && 'parentElement' in node && node.parentElement) targetEl = node.parentElement as HTMLElement;

							if (!targetEl) return false;

							const issueElement = targetEl.closest('[data-issue-id]') as HTMLElement | null;
							if (issueElement) {
								const issueId = issueElement.getAttribute('data-issue-id');
								if (issueId) {
									extension.editor.commands.setSelectedHarperIssue(issueId);
									extension.editor.view.dispatch(extension.editor.view.state.tr.setMeta('openSuggestionMenu', issueId));
									return true;
								}
							}
							return false;
						},
					},
				},
			}),
		];
	},
});

function buildDecorations(issues: HarperIssue[], selectedId: string | null, doc: any): DecorationSet {
	const decorations: Decoration[] = [];

	for (const issue of issues) {
		const span = issue.lint.span();
		const isSelected = issue.id === selectedId;
		const lintKind = issue.lint.lint_kind();
		const color = lintKindColor(lintKind);
		const bgColor = lintKindBackgroundColor(lintKind);

		const cssClass = 'cm-issue-underline' + (isSelected ? ' cm-issue-selected' : '');

		// Create decoration with inline styles
		decorations.push(
			Decoration.inline(span.start, span.end, {
				class: cssClass,
				style: `text-decoration-color: ${color};`,
				'data-issue-id': issue.id,
				'data-lint-kind': lintKind,
				nodeName: 'span',
			})
		);
	}

	return DecorationSet.create(doc, decorations);
}

function updateDecorationsForSelection(
	decorations: DecorationSet,
	selectedId: string | null,
	issues: HarperIssue[],
	doc: any
): DecorationSet {
	const updatedDecorations: Decoration[] = [];

	decorations.find().forEach(({ from, to, spec }) => {
		const issueId = spec['data-issue-id'];
		const lintKind = spec['data-lint-kind'];
		const isSelected = issueId === selectedId;

		const cssClass = 'cm-issue-underline' + (isSelected ? ' cm-issue-selected' : '');
		const color = lintKindColor(lintKind);
		const bgColor = lintKindBackgroundColor(lintKind);

		updatedDecorations.push(
			Decoration.inline(from, to, {
				class: cssClass,
				style: `text-decoration-color: ${color};`,
				'data-issue-id': issueId,
				'data-lint-kind': lintKind,
				nodeName: 'span',
			})
		);
	});

	return DecorationSet.create(doc, updatedDecorations);
}