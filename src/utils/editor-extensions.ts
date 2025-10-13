import { StateField, StateEffect } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import type { HarperIssue } from '../types';
import { IssueSeverity } from '../types';

// Effect to update issues
export const updateIssuesEffect = StateEffect.define<HarperIssue[]>();

// CSS for underlines
const issueTheme = EditorView.baseTheme({
	'.cm-issue-error': {
		textDecoration: 'underline wavy',
		textDecorationColor: 'rgb(239 68 68)', // red-500
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
	},
	'.cm-issue-warning': {
		textDecoration: 'underline wavy',
		textDecorationColor: 'rgb(234 179 8)', // yellow-500
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
	},
	'.cm-issue-info': {
		textDecoration: 'underline wavy',
		textDecorationColor: 'rgb(59 130 246)', // blue-500
		textDecorationThickness: '2px',
		textUnderlineOffset: '2px',
	},
});

// StateField for issue decorations
export const issueField = StateField.define<DecorationSet>({
	create() {
		return Decoration.none;
	},
	update(decorations, tr) {
		decorations = decorations.map(tr.changes);

		for (const effect of tr.effects) {
			if (effect.is(updateIssuesEffect)) {
				decorations = buildDecorations(effect.value);
			}
		}

		return decorations;
	},
	provide: f => EditorView.decorations.from(f),
});

function buildDecorations(issues: HarperIssue[]): DecorationSet {
	const decorations: Array<{ from: number; to: number; decoration: Decoration }> = [];

	for (const issue of issues) {
		const span = issue.lint.span();
		const cssClass = getSeverityCssClass(issue.severity);

		decorations.push({
			from: span.start,
			to: span.end,
			decoration: Decoration.mark({
				class: cssClass,
				attributes: { 'data-issue-id': issue.id },
			}),
		});
	}

	// Sort by position to avoid overlapping issues breaking the decoration set
	decorations.sort((a, b) => a.from - b.from);

	return Decoration.set(decorations.map(d => d.decoration.range(d.from, d.to)));
}

function getSeverityCssClass(severity: IssueSeverity): string {
	switch (severity) {
		case IssueSeverity.Error:
			return 'cm-issue-error';
		case IssueSeverity.Warning:
			return 'cm-issue-warning';
		case IssueSeverity.Info:
			return 'cm-issue-info';
	}
}

// Click handler extension
export function issueClickHandler(onIssueClick: (issueId: string) => void) {
	return EditorView.domEventHandlers({
		mousedown(event, view) {
			const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
			if (pos === null) return false;

			// Find decoration at position
			const decorations = view.state.field(issueField).iter(pos);
			while (decorations.value !== null) {
				const spec = decorations.value.spec;
				if (spec.attributes && spec.attributes['data-issue-id']) {
					onIssueClick(spec.attributes['data-issue-id'] as string);
					return true;
				}
				decorations.next();
			}

			return false;
		},
	});
}

export { issueTheme };
