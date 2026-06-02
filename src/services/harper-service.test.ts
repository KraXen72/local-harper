/* @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lint, LintConfig, Suggestion } from 'harper.js';
import type { HarperLinter } from './harper-runtime';
import type * as HarperService from './harper-service';

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

type LoadedService = {
	service: typeof HarperService;
	instances: MockLinter[];
};

function createMockLinter(): MockLinter {
	const defaultConfig: LintConfig = {
		AvoidCurses: true,
		BetaRule: false,
		AlphaRule: true,
	};

	return {
		setup: vi.fn(async () => undefined),
		importWords: vi.fn(async () => undefined),
		organizedLints: vi.fn(async () => ({})),
		getDefaultLintConfig: vi.fn(async () => ({ ...defaultConfig })),
		getLintConfig: vi.fn(async () => ({ BetaRule: false, AlphaRule: true })),
		getLintDescriptions: vi.fn(async () => ({ AlphaRule: 'Alpha description' })),
		setLintConfig: vi.fn(async () => undefined),
		applySuggestion: vi.fn(async (text) => `${text}!`),
	};
}

async function loadService(): Promise<LoadedService> {
	vi.resetModules();
	const instances: MockLinter[] = [];

	vi.doMock('./harper-runtime', () => ({
		createWorkerHarperLinter: vi.fn((): HarperLinter => {
			const linter = createMockLinter();
			instances.push(linter);
			return linter;
		}),
	}));

	const service = await import('./harper-service');
	return { service, instances };
}

describe('harper service singleton lifecycle', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
		vi.doUnmock('./harper-runtime');
		localStorage.clear();
	});

	it('initializes a linter, imports stored words, and applies default config policy', async () => {
		const { service, instances } = await loadService();
		localStorage.setItem('harper-custom-words', JSON.stringify(['Harperish']));

		await service.initHarper();

		expect(instances).toHaveLength(1);
		expect(instances[0].setup).toHaveBeenCalledOnce();
		expect(instances[0].importWords).toHaveBeenCalledWith(['Harperish']);
		expect(instances[0].setLintConfig).toHaveBeenCalledWith({
			AvoidCurses: false,
			BetaRule: false,
			AlphaRule: true,
		});
	});

	it('imports dictionaries with duplicate words removed and resets the linter', async () => {
		const { service, instances } = await loadService();
		const words = Array.from({ length: 1000 }, (_, index) => `word-${index % 10}`);

		await service.initHarper();
		await service.importDictionary(words);

		expect(service.getCustomWords()).toEqual([
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
		expect(instances).toHaveLength(2);
		expect(instances[1].importWords).toHaveBeenCalledWith(service.getCustomWords());
	});

	it('adds, edits, removes, and clears custom words at the storage boundary', async () => {
		const { service, instances } = await loadService();

		await service.initHarper();
		await service.addWordToDictionary('Harperish');
		await service.addWordToDictionary('Harperish');

		expect(service.getCustomWords()).toEqual(['Harperish']);
		expect(instances[0].importWords).toHaveBeenCalledTimes(1);
		expect(instances[0].importWords).toHaveBeenCalledWith(['Harperish']);

		await service.editWordInDictionary('Harperish', ' Local Harper ');
		expect(service.getCustomWords()).toEqual(['Local Harper']);

		await service.addWordToDictionary('Existing');
		await service.editWordInDictionary('Local Harper', 'Existing');
		expect(service.getCustomWords()).toEqual(['Existing']);

		await service.removeWordFromDictionary('Existing');
		expect(service.getCustomWords()).toEqual([]);

		await service.clearAllCustomWords();
		expect(service.getCustomWords()).toEqual([]);
		expect(instances.length).toBeGreaterThanOrEqual(5);
	});

	it('saves toggled rule config', async () => {
		const { service, instances } = await loadService();

		await service.initHarper();
		await service.toggleRule('BetaRule', true);

		expect(instances[0].setLintConfig).toHaveBeenLastCalledWith({
			AlphaRule: true,
			BetaRule: true,
		});
		expect(JSON.parse(localStorage.getItem('harper-lint-config') ?? '{}')).toEqual({
			AlphaRule: true,
			BetaRule: true,
		});
	});
});
