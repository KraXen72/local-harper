import { describe, expect, it } from 'vitest';
import { pascalCaseToWords } from './pascal-case';

describe('pascalCaseToWords', () => {
	it.each([
		['AvoidCurses', 'Avoid Curses'],
		['LongSentence', 'Long Sentence'],
		['URLChecker', 'URL Checker'],
		['XMLHTTPRequest', 'XMLHTTP Request'],
		['Already Words', 'Already Words'],
	])('formats %s', (input, expected) => {
		expect(pascalCaseToWords(input)).toBe(expected);
	});
});
