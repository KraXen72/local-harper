import { describe, expect, it } from 'vitest';
import { Dialect, LocalLinter } from 'harper.js';
import { binary } from 'harper.js/binary';

describe('Harper LocalLinter contract', () => {
	it('initializes, lints, and applies a suggestion using the packaged binary', async () => {
		const linter = new LocalLinter({ binary, dialect: Dialect.American });
		await linter.setup();

		const source = 'This is definately wrong.';
		const organized = await linter.organizedLints(source);
		const lints = Object.values(organized).flat();
		const lint = lints[0];

		expect(lints.length).toBeGreaterThan(0);
		expect(lint.span().start).toBeGreaterThanOrEqual(0);
		expect(lint.span().end).toBeGreaterThan(lint.span().start);
		expect(lint.message()).toContain('definately');
		expect(lint.lint_kind()).toMatch(/^[A-Za-z]+$/);
		expect(lint.suggestions().length).toBeGreaterThan(0);

		const updated = await linter.applySuggestion(source, lint, lint.suggestions()[0]);
		expect(updated).not.toBe(source);
		expect(updated).toContain('definitely');

		await linter.dispose();
	});
});
