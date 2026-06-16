/* @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalLinter, Dialect } from 'harper.js';
import { binary } from 'harper.js/binary';
import type { LintConfig, Lint } from 'harper.js';
import type { HarperLinter } from './harper-runtime';
import type * as HarperService from './harper-service';

const DEFAULT_DISABLED_RULES = ['AvoidCurses'];

type LoadedService = {
	service: typeof HarperService;
	instances: HarperLinter[];
};

async function loadService(): Promise<LoadedService> {
	vi.resetModules();
	const instances: HarperLinter[] = [];

	vi.doMock('./harper-runtime', () => ({
		createWorkerHarperLinter: vi.fn((): HarperLinter => {
			const linter = new LocalLinter({ binary, dialect: 0 }); // American
			vi.spyOn(linter, 'setup');
			vi.spyOn(linter, 'importWords');
			vi.spyOn(linter, 'getDefaultLintConfig');
			vi.spyOn(linter, 'getLintConfig');
			vi.spyOn(linter, 'getLintDescriptions');
			vi.spyOn(linter, 'setLintConfig');
			vi.spyOn(linter, 'applySuggestion');
			vi.spyOn(linter, 'organizedLints');
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

		const defaultConfig: LintConfig = await (
			instances[0].getDefaultLintConfig as ReturnType<typeof vi.fn>
		).mock.results[0].value;

		const expectedConfig: LintConfig = { ...defaultConfig };
		for (const rule of DEFAULT_DISABLED_RULES) {
			if (rule in expectedConfig) {
				expectedConfig[rule] = false;
			}
		}

		expect(instances[0].setLintConfig).toHaveBeenCalledWith(expectedConfig);
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
		(instances[0].setLintConfig as ReturnType<typeof vi.fn>).mockClear();

		const ruleToToggle = 'AvoidCurses';
		const initialConfig = await instances[0].getLintConfig();
		expect(initialConfig[ruleToToggle]).toBe(false);

		await service.toggleRule(ruleToToggle, true);

		expect(instances[0].setLintConfig).toHaveBeenCalledTimes(1);
		const newConfig = (instances[0].setLintConfig as ReturnType<typeof vi.fn>).mock.calls[0][0] as LintConfig;
		expect(newConfig[ruleToToggle]).toBe(true);
		for (const [key, value] of Object.entries(initialConfig)) {
			if (key !== ruleToToggle) {
				expect(newConfig[key]).toBe(value);
			}
		}

		const stored = JSON.parse(localStorage.getItem('harper-lint-config') ?? '{}');
		expect(stored[ruleToToggle]).toBe(true);
	});

	describe('setHarperDialect', () => {
		it('does nothing when the new dialect matches the current one', async () => {
			const { service, instances } = await loadService();
			await service.initHarper(Dialect.American);
			await service.setHarperDialect(Dialect.American);
			expect(instances).toHaveLength(1);
			expect(instances[0].setup).toHaveBeenCalledTimes(1);
		});

		it('resets the linter when dialect changes', async () => {
			const { service, instances } = await loadService();
			await service.initHarper(Dialect.American);
			await service.setHarperDialect(Dialect.British);
			expect(instances).toHaveLength(2);
			const newLinter = instances[1];
			expect(newLinter).not.toBe(instances[0]);
			expect(newLinter.setup).toHaveBeenCalledOnce();
		});
	});

	describe('getLinter', () => {
		it('throws error when called before initialization', async () => {
			const { service } = await loadService();
			expect(() => service.getLinter()).toThrowError('Harper linter not initialized');
		});
	});

	describe('analyzeText', () => {
		it('returns lint results for a given text', async () => {
			const { service } = await loadService();
			await service.initHarper();
			const result = await service.analyzeText('This is a testt.');
			expect(result).toBeDefined();
			expect(Object.keys(result).length).toBeGreaterThan(0);
		});
	});

	describe('transformLints', () => {
		it('converts organized lints into sorted issues', async () => {
			const { service } = await loadService();
			const organized = {
				Spelling: [
					{ span: () => ({ start: 5, end: 9 }), message: () => 'err', lint_kind: () => 'Spelling', get_problem_text: () => '', suggestions: () => [] } as unknown as Lint,
					{ span: () => ({ start: 1, end: 4 }), message: () => 'err2', lint_kind: () => 'Spelling', get_problem_text: () => '', suggestions: () => [] } as unknown as Lint,
				],
			};
			const issues = service.transformLints(organized);
			expect(issues).toHaveLength(2);
			expect(issues[0].lint.span().start).toBe(1);
			expect(issues[1].lint.span().start).toBe(5);
		});
	});

	describe('exportDictionary', () => {
		it('creates a downloadable JSON file with current words', async () => {
			const { service } = await loadService();
			localStorage.setItem('harper-custom-words', JSON.stringify(['test', 'word']));
			await service.initHarper();

			const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
			const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
			const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
			const createElementSpy = vi.spyOn(document, 'createElement');

			service.exportDictionary();

			// The anchor was created by document.createElement
			const anchor = createElementSpy.mock.results[0].value as HTMLAnchorElement;
			expect(anchor).toBeInstanceOf(HTMLAnchorElement);
			expect(anchor.download).toMatch(/^\d{4}-\d{2}-\d{2}-local-harper-dictionary\.json$/);
			expect(anchor.href).toBe('blob:url');

			expect(createObjectURLSpy).toHaveBeenCalled();
			const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe('application/json');

			expect(clickSpy).toHaveBeenCalled();
			expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url');
		});
	});

	describe('getIssueSignature', () => {
		it('returns a unique string combining lint kind, message, and problem text', async () => {
			const { service } = await loadService();
			const issue = {
				lint: {
					lint_kind: () => 'Spelling',
					message: () => 'misspelled',
					get_problem_text: () => 'errword',
				},
			} as any;
			const sig = service.getIssueSignature(issue);
			expect(sig).toBe('Spelling|misspelled|errword');
		});
	});

	describe('error handling in loadLintConfig and loadCustomWords', () => {
		it('logs error and falls back when stored lint config is invalid', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			localStorage.setItem('harper-lint-config', '{invalid');
			const { service, instances } = await loadService();
			await service.initHarper();

			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(consoleErrorSpy.mock.calls[0][0]).toContain('Failed to parse saved lint config');

			// Fallback to the default config as-is (no rule disabling)
			const config = await instances[0].getLintConfig();
			expect(config.AvoidCurses).toBe(true); // default from Harper
			consoleErrorSpy.mockRestore();
		});

		it('logs error and returns empty array when stored custom words are invalid', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			localStorage.setItem('harper-custom-words', '{notjson');
			const { service } = await loadService();
			await service.initHarper();
			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(consoleErrorSpy.mock.calls[0][0]).toContain('Failed to load custom words');
			expect(service.getCustomWords()).toEqual([]);
			consoleErrorSpy.mockRestore();
		});
	});
});
