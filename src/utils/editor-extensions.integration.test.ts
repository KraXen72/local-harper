/* @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import { Dialect, LocalLinter } from 'harper.js';
import { binary } from 'harper.js/binary';
import { computeSuggestionCursor } from './editor-extensions';

const MISSPELLED_WORDS: Record<string, string> = {
	definately: 'definitely',
	recieve: 'receive',
	seperate: 'separate',
	embarass: 'embarrass',
	acomodate: 'accommodate',
	independant: 'independent',
	priviledge: 'privilege',
	neccessary: 'necessary',
	occassion: 'occasion',
	pharoah: 'pharaoh',
	beleive: 'believe',
	wierd: 'weird',
};

const SENTENCES = [
	'It is definately not recieve a seperate package.',
	'She felt embarass about the acomodate arrangments.',
	'The independant priviledge was neccessary for the occassion.',
	'Pharoah could not beleive how wierd the situation was.',
];

const TEXT = SENTENCES.join('\n');

interface LintWithSuggestion {
	lint: any;
	suggestion: any;
}

async function collectLints(linter: LocalLinter, text: string): Promise<LintWithSuggestion[]> {
	const organized = await linter.organizedLints(text);
	const all = Object.values(organized).flat();
	const result: LintWithSuggestion[] = [];
	for (const lint of all) {
		const suggestions = lint.suggestions();
		if (suggestions.length > 0) {
			result.push({ lint, suggestion: suggestions[0] });
		}
	}
	return result;
}

describe('apply suggestions with real Harper linter', () => {
	it(
		'applies all suggestions sequentially and tracks cursor in bounds',
		{ timeout: 15_000 },
		async () => {
			const linter = new LocalLinter({ binary, dialect: Dialect.American });
			await linter.setup();

			let currentText = TEXT;
			let cursor = 20;

			for (let round = 0; round < 3; round++) {
				const lints = await collectLints(linter, currentText);
				if (lints.length === 0) break;
				lints.sort((a, b) => b.lint.span().start - a.lint.span().start);

				for (const { lint, suggestion } of lints) {
					const newText = await linter.applySuggestion(currentText, lint, suggestion);
					expect(newText).not.toBe(currentText);

					const { newCursor } = computeSuggestionCursor(currentText, newText, cursor);
					expect(newCursor).greaterThanOrEqual(0);
					expect(newCursor).lessThanOrEqual(newText.length);

					currentText = newText;
					cursor = newCursor;
				}
			}

			const finalLints = await collectLints(linter, currentText);
			expect(finalLints.length).toBe(0);
			expect(cursor).greaterThanOrEqual(0);
			expect(cursor).lessThanOrEqual(currentText.length);

			await linter.dispose();
		},
	);

	it(
		'applies suggestions in random order and tracks cursor in bounds',
		{ timeout: 15_000 },
		async () => {
			const linter = new LocalLinter({ binary, dialect: Dialect.American });
			await linter.setup();

			let currentText = TEXT;
			let cursor = 0;

			for (let round = 0; round < 5; round++) {
				const lints = await collectLints(linter, currentText);
				if (lints.length === 0) break;

				const shuffled = [...lints].sort(() => 0.5 - Math.random());

				for (const { lint, suggestion } of shuffled) {
					const newText = await linter.applySuggestion(currentText, lint, suggestion);
					expect(newText).not.toBe(currentText);

					const { newCursor } = computeSuggestionCursor(currentText, newText, cursor);
					expect(newCursor).greaterThanOrEqual(0);
					expect(newCursor).lessThanOrEqual(newText.length);

					currentText = newText;
					cursor = newCursor;
				}
			}

			const finalLints = await collectLints(linter, currentText);
			expect(finalLints.length).toBe(0);

			await linter.dispose();
		},
	);

	it(
		'handles fix-9 → re-misspell → fix-all cycle',
		{ timeout: 15_000 },
		async () => {
			const linter = new LocalLinter({ binary, dialect: Dialect.American });
			await linter.setup();

			let cursor = 3;

			// Phase 1 — fix 9 misspellings, skip the 10th.
			const initial = await collectLints(linter, TEXT);
			expect(initial.length).toBeGreaterThanOrEqual(10);
			const toFix = initial.slice(0, 9);

			let text = TEXT;
			for (const { lint, suggestion } of toFix) {
				const newText = await linter.applySuggestion(text, lint, suggestion);
				expect(newText).not.toBe(text);
				const { newCursor } = computeSuggestionCursor(text, newText, cursor);
				expect(newCursor).greaterThanOrEqual(0);
				expect(newCursor).lessThanOrEqual(newText.length);
				text = newText;
				cursor = newCursor;
			}
			expect(text).not.toBe(TEXT);

			// Phase 2 — mangle the corrected words back to their misspellings.
			for (const [misspelled, correct] of Object.entries(MISSPELLED_WORDS)) {
				if (text.includes(correct)) {
					text = text.replace(correct, misspelled);
				}
			}
			// cursor is now stale; reset to a valid position.
			cursor = Math.min(cursor, text.length);

			// Phase 3 — fix everything again.
			for (let round = 0; round < 5; round++) {
				const lints = await collectLints(linter, text);
				if (lints.length === 0) break;
				lints.sort((a, b) => b.lint.span().start - a.lint.span().start);

				for (const { lint, suggestion } of lints) {
					const newText = await linter.applySuggestion(text, lint, suggestion);
					const { newCursor } = computeSuggestionCursor(text, newText, cursor);
					expect(newCursor).greaterThanOrEqual(0);
					expect(newCursor).lessThanOrEqual(newText.length);
					text = newText;
					cursor = newCursor;
				}
			}

			const finalLints = await collectLints(linter, text);
			expect(finalLints.length).toBe(0);

			await linter.dispose();
		},
	);

	it(
		'never produces negative or out-of-bounds cursor for any start cursor',
		{ timeout: 15_000 },
		async () => {
			const linter = new LocalLinter({ binary, dialect: Dialect.American });
			await linter.setup();

			for (const startCursor of [0, 3, 10, TEXT.length]) {
				let currentText = TEXT;
				let cursor = startCursor;

				const lints = await collectLints(linter, currentText);
				lints.sort((a, b) => b.lint.span().start - a.lint.span().start);

				for (const { lint, suggestion } of lints) {
					const newText = await linter.applySuggestion(currentText, lint, suggestion);
					const { newCursor } = computeSuggestionCursor(currentText, newText, cursor);

					expect(newCursor).greaterThanOrEqual(0);
					expect(newCursor).lessThanOrEqual(newText.length);

					currentText = newText;
					cursor = newCursor;
				}
			}

			await linter.dispose();
		},
	);
});
