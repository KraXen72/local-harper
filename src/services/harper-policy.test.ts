import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Lint, LintConfig, Suggestion } from 'harper.js';
import type { HarperLinter } from './harper-runtime';
import {
	analyzeTextWithAbort,
	dedupeWords,
	mapRules,
	mergeLintConfig,
	parseStoredCustomWords,
	transformLintsToIssues,
	validateDictionaryJson,
} from './harper-policy';

type MockLinter = {
	setup: ReturnType<typeof vi.fn<() => Promise<void>>>;
	importWords: ReturnType<typeof vi.fn<(words: string[]) => Promise<void>>>;
	organizedLints: ReturnType<typeof vi.fn<(text: string) => Promise<Record<string, Lint[]>>>>;
	getDefaultLintConfig: ReturnType<typeof vi.fn<() => Promise<LintConfig>>>;
	getLintConfig: ReturnType<typeof vi.fn<() => Promise<LintConfig>>>;
	getLintDescriptions: ReturnType<typeof vi.fn<() => Promise<Record<string, string>>>>;
	setLintConfig: ReturnType<typeof vi.fn<(config: LintConfig) => Promise<void>>>;
	applySuggestion: ReturnType<typeof vi.fn<(text: string, lint: Lint, suggestion: Suggestion) => Promise<string>>>;
};

type Deferred<T> = {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}

function createMockLinter(): MockLinter {
	return {
		setup: vi.fn(async () => undefined),
		importWords: vi.fn(async () => undefined),
		organizedLints: vi.fn(async () => ({})),
		getDefaultLintConfig: vi.fn(async () => ({})),
		getLintConfig: vi.fn(async () => ({})),
		getLintDescriptions: vi.fn(async () => ({})),
		setLintConfig: vi.fn(async () => undefined),
		applySuggestion: vi.fn(async (text) => `${text}!`),
	};
}

function fakeLint(start: number, message = `message-${start}`): Lint {
	return {
		span: () => ({ start, end: start + 4 }),
		message: () => message,
		lint_kind: () => 'Spelling',
		get_problem_text: () => `word-${start}`,
		suggestions: () => [],
	} as unknown as Lint;
}

describe('dictionary policy', () => {
	it('rejects malformed and wrong-shaped dictionary JSON', () => {
		expect(validateDictionaryJson('{')).toMatchObject({ valid: false });
		expect(validateDictionaryJson('[]')).toEqual({ valid: false, error: 'JSON must be an object' });
		expect(validateDictionaryJson('{"dictVersion":2,"words":[]}')).toEqual({
			valid: false,
			error: 'Unsupported dictVersion. Expected 1.',
		});
		expect(validateDictionaryJson('{"dictVersion":1,"words":"nope"}')).toEqual({
			valid: false,
			error: 'Missing or invalid "words" array',
		});
		expect(validateDictionaryJson('{"dictVersion":1,"words":["ok",42]}')).toEqual({
			valid: false,
			error: 'All words must be strings',
		});
	});

	it('accepts valid dictionary JSON without changing word order', () => {
		expect(validateDictionaryJson('{"dictVersion":1,"words":["zeta","alpha","zeta"]}')).toEqual({
			valid: true,
			words: ['zeta', 'alpha', 'zeta'],
		});
	});

	it('parses stored custom words defensively', () => {
		expect(parseStoredCustomWords(null)).toEqual({ value: [] });
		expect(parseStoredCustomWords('["alpha","beta"]')).toEqual({ value: ['alpha', 'beta'] });
		expect(parseStoredCustomWords('{broken')).toMatchObject({ value: [] });
		expect(parseStoredCustomWords(JSON.stringify(['ok', 42, null]))).toEqual({
			value: [],
			error: 'stored value must be an array of strings',
		});
	});

	it('dedupes imported words while preserving first occurrence order', () => {
		const words = Array.from({ length: 1000 }, (_, index) => `word-${index % 10}`);

		expect(dedupeWords(words)).toEqual([
			'word-0',
			'word-1',
			'word-2',
			'word-3',
			'word-4',
			'word-5',
			'word-6',
			'word-7',
			'word-8',
			'word-9',
		]);
	});
});

describe('lint config and rule policy', () => {
	const defaultConfig: LintConfig = {
		AvoidCurses: true,
		BetaRule: false,
		AlphaRule: true,
	};

	it('applies default disabled rules when no saved config exists', () => {
		expect(mergeLintConfig(defaultConfig, null)).toEqual({
			value: {
				AvoidCurses: false,
				BetaRule: false,
				AlphaRule: true,
			},
		});
	});

	it('merges saved config over defaults', () => {
		expect(mergeLintConfig(defaultConfig, '{"BetaRule":true}')).toEqual({
			value: {
				AvoidCurses: true,
				BetaRule: true,
				AlphaRule: true,
			},
		});
	});

	it('falls back to default config on invalid saved config', () => {
		expect(mergeLintConfig(defaultConfig, '{broken')).toMatchObject({
			value: defaultConfig,
		});
		expect(mergeLintConfig(defaultConfig, '[]')).toEqual({
			value: defaultConfig,
			error: 'saved lint config must be an object',
		});
	});

	it('maps and sorts rules with description fallback', () => {
		expect(mapRules(
			{ BetaRule: false, AlphaRule: true },
			{ AlphaRule: 'Alpha description' },
		)).toEqual([
			{
				name: 'AlphaRule',
				displayName: 'Alpha Rule',
				description: 'Alpha description',
				enabled: true,
			},
			{
				name: 'BetaRule',
				displayName: 'Beta Rule',
				description: 'No description available',
				enabled: false,
			},
		]);
	});
});

describe('analysis and lint transforms', () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('aborts before analysis starts', async () => {
		const linter = createMockLinter();
		const abortController = new AbortController();
		abortController.abort();

		await expect(analyzeTextWithAbort(linter, 'text', abortController.signal)).rejects.toMatchObject({
			name: 'AbortError',
		});
		expect(linter.organizedLints).not.toHaveBeenCalled();
	});

	it('aborts while the lint promise is pending and removes the abort listener', async () => {
		const linter = createMockLinter();
		const abortController = new AbortController();
		const deferred = createDeferred<Record<string, Lint[]>>();
		const addListener = vi.spyOn(abortController.signal, 'addEventListener');
		const removeListener = vi.spyOn(abortController.signal, 'removeEventListener');

		linter.organizedLints.mockReturnValueOnce(deferred.promise);
		const result = analyzeTextWithAbort(linter, 'pending text', abortController.signal);

		abortController.abort();

		await expect(result).rejects.toMatchObject({ name: 'AbortError' });
		expect(addListener).toHaveBeenCalledWith('abort', expect.any(Function));
		expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));

		deferred.resolve({});
	});

	it('returns lints when no abort signal is provided', async () => {
		const linter = createMockLinter();
		const organized = { SpellCheck: [fakeLint(1)] };
		linter.organizedLints.mockResolvedValueOnce(organized);

		await expect(analyzeTextWithAbort(linter as HarperLinter, 'text')).resolves.toBe(organized);
	});

	it('transforms and sorts lints with stable issue ids', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-02T00:00:00.000Z'));

		const issues = transformLintsToIssues({
			LateRule: [fakeLint(20), fakeLint(5)],
			EarlyRule: [fakeLint(1)],
		});

		expect(issues.map((issue) => [issue.id, issue.rule, issue.lint.span().start])).toEqual([
			['issue-1780358400000-2', 'EarlyRule', 1],
			['issue-1780358400000-1', 'LateRule', 5],
			['issue-1780358400000-0', 'LateRule', 20],
		]);
	});
});
