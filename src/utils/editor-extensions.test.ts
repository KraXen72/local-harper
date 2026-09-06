/* @vitest-environment happy-dom */

import { describe, expect, it } from 'vitest';
import { computeSuggestionCursor } from './editor-extensions';

describe('computeSuggestionCursor', () => {
	describe('capitalization / single-character replacement', () => {
		it('keeps cursor in same logical place when change is before cursor', () => {
			// fl|atpak -> F|latpak — the bug case
			const result = computeSuggestionCursor('flatpak', 'Flatpak', 2);
			expect(result.newCursor).toBe(2);
			expect(result.changeStart).toBe(0);
		});

		it('stays at boundary when cursor is at the start of a replaced range', () => {
			// |flatpak -> |Flatpak — cursor at position 0, the 'f' is replaced
			// but cursor isn't strictly inside the deleted region, so it stays.
			const result = computeSuggestionCursor('flatpak', 'Flatpak', 0);
			expect(result.newCursor).toBe(0);
		});

		it('keeps cursor at end when cursor was after the change', () => {
			const result = computeSuggestionCursor('flatpak', 'Flatpak', 7);
			expect(result.newCursor).toBe(7);
		});

		it('moves cursor to after the diff when cursor is one past the changed region', () => {
			// f|latpak -> F|latpak — cursor at boundary
			const result = computeSuggestionCursor('flatpak', 'Flatpak', 1);
			expect(result.newCursor).toBe(1);
		});
	});

	describe('pure insertions', () => {
		it('moves cursor past inserted text when cursor is at insertion point', () => {
			// Hello| World -> Hello,| World
			const result = computeSuggestionCursor('Hello World', 'Hello, World', 5);
			expect(result.newCursor).toBe(6);
		});

		it('keeps cursor unchanged when it is before insertion point', () => {
			const result = computeSuggestionCursor('Hello World', 'Hello, World', 3);
			expect(result.newCursor).toBe(3);
		});

		it('adjusts cursor forward when it is after insertion point', () => {
			const result = computeSuggestionCursor('Hello World', 'Hello, World', 7);
			expect(result.newCursor).toBe(8);
		});

		it('moves past final-sentence comma insertion', () => {
			const result = computeSuggestionCursor('The cat', 'The cat,', 7);
			expect(result.newCursor).toBe(8);
		});

		it('keeps middle-of-word cursor unchanged on terminal insertion', () => {
			const result = computeSuggestionCursor('The cat', 'The cat,', 4);
			expect(result.newCursor).toBe(4);
		});
	});

	describe('pure deletions', () => {
		it('adjusts cursor backward when text before cursor is removed', () => {
			// He|llo -> H|lo (remove 'e' at position 1)
			const result = computeSuggestionCursor('Hello', 'Hllo', 2);
			expect(result.newCursor).toBe(1);
		});

		it('shifts cursor by delta when cursor is at the start of a deletion', () => {
			// Hel|lo -> Hel|o — cursor at position 3, the 'l' at that position
			// is deleted, so cursor shifts by (3-4) = -1 → ends at 2.
			const result = computeSuggestionCursor('Hello', 'Helo', 3);
			expect(result.newCursor).toBe(2);
		});

		it('places cursor at end of kept region when cursor was inside deleted region', () => {
			const result = computeSuggestionCursor('HHello', 'Hello', 3);
			expect(result.newCursor).toBe(2);
		});
	});

	describe('full-word replacements', () => {
		it('moves cursor from middle to end when entire word changes length', () => {
			const result = computeSuggestionCursor('foobar', 'FOO', 3);
			expect(result.newCursor).toBe(3);
		});

		it('moves cursor to end of new text when cursor was inside replaced region', () => {
			const result = computeSuggestionCursor('test', 'TEST', 2);
			expect(result.newCursor).toBe(4);
		});

		it('stays at boundary when cursor is at the start of a same-length replacement', () => {
			// |test -> |TEST — cursor at position 0 is at the boundary, not inside.
			const result = computeSuggestionCursor('test', 'TEST', 0);
			expect(result.newCursor).toBe(0);
		});
	});

	describe('multi-character replacements', () => {
		it('replacement of prefix keeps suffix cursor', () => {
			const result = computeSuggestionCursor('abchello', 'xyzhello', 5);
			expect(result.newCursor).toBe(5);
		});

		it('replacement of same-length prefix at boundary', () => {
			// abc|xyz -> ABC|xyz (cursor right after the replaced section)
			const result = computeSuggestionCursor('abcxyz', 'ABCxyz', 3);
			expect(result.newCursor).toBe(3);
		});
	});

	describe('spelling correction in context', () => {
		it('adjusts cursor when replacement is in the middle of a sentence', () => {
			// I havve| a dream -> I have| a dream
			const result = computeSuggestionCursor('I havve a dream', 'I have a dream', 7);
			expect(result.newCursor).toBe(6);
		});

		it('keeps cursor before the misspelling unchanged', () => {
			const result = computeSuggestionCursor('I havve a dream', 'I have a dream', 2);
			expect(result.newCursor).toBe(2);
		});
	});

	describe('no-change scenarios', () => {
		it('returns same cursor position when text is unchanged', () => {
			const result = computeSuggestionCursor('hello', 'hello', 2);
			expect(result.newCursor).toBe(2);
		});

		it('returns same cursor at start when text is unchanged', () => {
			const result = computeSuggestionCursor('hello', 'hello', 0);
			expect(result.newCursor).toBe(0);
		});
	});

	describe('the diff metadata is correct', () => {
		it('reports correct change ranges for capitalization', () => {
			const result = computeSuggestionCursor('flatpak', 'Flatpak', 2);
			expect(result.changeStart).toBe(0);
			expect(result.changeEndOld).toBe(1);
			expect(result.changeEndNew).toBe(1);
		});

		it('reports zero-width insertion range', () => {
			const result = computeSuggestionCursor('Hello World', 'Hello, World', 5);
			expect(result.changeStart).toBe(5);
			expect(result.changeEndOld).toBe(5);
			expect(result.changeEndNew).toBe(6);
		});
	});

	describe('adversarial / torture tests', () => {
		it('handles emoji and multi-byte characters by byte offset', () => {
			const result = computeSuggestionCursor('Hello 😀 world', 'Hello 😎 world', 8);
			expect(result.newCursor).toBe(8);
		});

		it('handles leading whitespace correction', () => {
			const result = computeSuggestionCursor('  indented', ' indented', 0);
			expect(result.newCursor).toBe(0);
		});

		it('handles trailing whitespace correction', () => {
			const result = computeSuggestionCursor('trailing  ', 'trailing ', 11);
			expect(result.newCursor).toBe(10);
		});

		it('handles empty-to-empty', () => {
			const result = computeSuggestionCursor('', '', 0);
			expect(result.newCursor).toBe(0);
		});

		it('handles full replacement where cursor inside deleted range', () => {
			const result = computeSuggestionCursor('abc', 'xyz', 1);
			expect(result.newCursor).toBe(3);
		});

		it('handles full replacement with length change', () => {
			const result = computeSuggestionCursor('abcdef', '123', 3);
			expect(result.newCursor).toBe(3);
		});

		it('handles insertion at start of document', () => {
			const result = computeSuggestionCursor('world', 'hello world', 0);
			expect(result.newCursor).toBe(6);
		});

		it('handles insertion at end of document', () => {
			const result = computeSuggestionCursor('hello', 'hello!', 5);
			expect(result.newCursor).toBe(6);
		});

		it('round-trips: cursor at same logical index for single-char change', () => {
			// Common autocorrect: its -> it's (insert apostrophe at position 2)
			const result = computeSuggestionCursor('its', "it's", 2);
			expect(result.newCursor).toBe(3);
		});

		it('handles multiple changes from point diff', () => {
			// "can't" -> "cannot" — diff: [3,4) -> [3,5). Cursor at 3 is at the
			// boundary (not strictly inside), so it shifts by (5-4)=1 → 4.
			const result = computeSuggestionCursor("can't", 'cannot', 3);
			expect(result.newCursor).toBe(4);
		});

		it('handles change to uppercase at very end', () => {
			const result = computeSuggestionCursor('hello', 'hellO', 5);
			expect(result.newCursor).toBe(5);
		});

		it('handles cursor exactly at changeEndOld boundary', () => {
			// Replace 'foo' with 'XYZ' - cursor right after 'foo' is at the boundary
			const result = computeSuggestionCursor('foo and', 'XYZ and', 3);
			expect(result.newCursor).toBe(3);
		});

		it('handles repeated characters (double letter removal)', () => {
			const result = computeSuggestionCursor('accomodate', 'accommodate', 5);
			expect(result.newCursor).toBe(6);
		});

		it('handles correction at the very start with cursor at position 0', () => {
			const result = computeSuggestionCursor('teh start', 'the start', 0);
			expect(result.newCursor).toBe(0);
		});

		it('handles comprehensive sentence correction', () => {
			// Cursor at end of old text (pos 41) maps to end of new text (pos 43)
			const result = computeSuggestionCursor(
				'this is a sentence with a spelling mistke',
				'This is a sentence with a spelling mistake.',
				41,
			);
			expect(result.newCursor).toBe(43);
		});

		it('handles comprehensive sentence correction with cursor mid-word', () => {
			const result = computeSuggestionCursor(
				'this is a sentence with a spelling mistke',
				'This is a sentence with a spelling mistake.',
				10,
			);
			// Cursor inside changed region (the entire text differs from start)
			// → maps to end of new text
			expect(result.newCursor).toBe(43);
		});
	});
});
