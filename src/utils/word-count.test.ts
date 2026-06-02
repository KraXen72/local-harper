import { describe, expect, it } from 'vitest';
import { countText } from './word-count';

describe('countText', () => {
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
});
