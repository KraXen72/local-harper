import { describe, expect, it } from 'vitest';
import { parseMessage } from './message-formatter';

describe('parseMessage', () => {
	it('keeps plain text messages as a single text part', () => {
		expect(parseMessage('Nothing special here.')).toEqual([
			{ type: 'text', content: 'Nothing special here.' },
		]);
	});

	it('splits inline code spans out of surrounding text', () => {
		expect(parseMessage('Use `have` instead of `of`.')).toEqual([
			{ type: 'text', content: 'Use ' },
			{ type: 'code', content: 'have' },
			{ type: 'text', content: ' instead of ' },
			{ type: 'code', content: 'of' },
			{ type: 'text', content: '.' },
		]);
	});

	it('leaves unmatched backticks as text', () => {
		expect(parseMessage('Odd `input with emoji 😀')).toEqual([
			{ type: 'text', content: 'Odd `input with emoji 😀' },
		]);
	});
});
