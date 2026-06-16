import { describe, expect, it, vi } from 'vitest';
import { countText } from './word-count';
import { afterEach } from 'node:test';

describe('countText', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	})

	it('counts empty and whitespace-only text without throwing', () => {
		expect(countText('')).toEqual({
			words: 0,
			graphemes: 0,
			paragraphs: 0,
			lines: 0,
			sentences: 0,
		});

		const whitespace = countText(' \n\n\t ');
		expect(whitespace.words).toBe(0);
		expect(whitespace.lines).toBeGreaterThanOrEqual(1);
	});

	it('handles multiline unicode text', () => {
		const counts = countText('Hello 😀 world.\nCafe\u0301 works too.');

		expect(counts.words).toBeGreaterThanOrEqual(4);
		expect(counts.graphemes).toBeGreaterThan(0);
		expect(counts.lines).toBe(2);
		expect(counts.sentences).toBeGreaterThanOrEqual(1);
	});

	it('falls back to word and sentence count when countAll throws', async () => {
		// Arrange: mock the tally module so countAll throws, but countWords and countSentences work normally.
		const tallyModule = await import('@twocaretcat/tally-ts');
		vi.spyOn(tallyModule.Tally.prototype, 'countAll').mockImplementation(() => {
			throw new Error('Simulated error');
		});

		// The countText function imports its own tally instance, but it uses the same class.
		// Our spy on the prototype will affect the instance inside countText as well.

		const result = countText('Some text.');
		expect(result.words).toBeGreaterThan(0);
		expect(result.sentences).toBeGreaterThan(0);
		// These values come from countAll, so they should fall back to 0.
		expect(result.graphemes).toBe(0);
		expect(result.paragraphs).toBe(0);
		expect(result.lines).toBe(0);
	});
});