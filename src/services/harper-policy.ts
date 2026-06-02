import type { Lint, LintConfig } from 'harper.js';
import type { DictionaryImportResult, HarperIssue, RuleInfo } from '../types';
import type { HarperLinter } from './harper-runtime';
import { pascalCaseToWords } from '../utils/pascal-case';

const DEFAULT_DISABLED_RULES = ['AvoidCurses'];

export type ParseResult<T> = {
	value: T;
	error?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function analyzeTextWithAbort(
	linter: HarperLinter,
	text: string,
	abortSignal?: AbortSignal,
): Promise<Record<string, Lint[]>> {
	if (abortSignal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}

	if (!abortSignal) {
		return await linter.organizedLints(text);
	}

	const lintPromise = linter.organizedLints(text);

	let removeListener: () => void = () => {};
	const abortPromise = new Promise<never>((_, reject) => {
		const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
		abortSignal.addEventListener('abort', onAbort);
		removeListener = () => abortSignal.removeEventListener('abort', onAbort);
	});

	try {
		const result = await Promise.race([lintPromise, abortPromise]);
		removeListener();
		if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
		return result;
	} catch (err) {
		removeListener();
		throw err;
	}
}

export function transformLintsToIssues(organizedLints: Record<string, Lint[]>): HarperIssue[] {
	const issues: HarperIssue[] = [];
	let index = 0;

	for (const [rule, lints] of Object.entries(organizedLints)) {
		for (const lint of lints) {
			issues.push({
				id: `issue-${Date.now()}-${index}`,
				lint,
				rule,
			});
			index++;
		}
	}

	issues.sort((a, b) => a.lint.span().start - b.lint.span().start);
	return issues;
}

export function parseStoredCustomWords(saved: string | null): ParseResult<string[]> {
	if (!saved) return { value: [] };

	try {
		const parsed = JSON.parse(saved);
		if (!Array.isArray(parsed) || !parsed.every((word: unknown) => typeof word === 'string')) {
			return { value: [], error: 'stored value must be an array of strings' };
		}
		return { value: parsed };
	} catch (error) {
		return { value: [], error };
	}
}

export function validateDictionaryJson(input: string): DictionaryImportResult {
	try {
		const parsed = JSON.parse(input);
		if (!isRecord(parsed)) {
			return { valid: false, error: 'JSON must be an object' };
		}
		if (parsed.dictVersion !== 1) {
			return { valid: false, error: 'Unsupported dictVersion. Expected 1.' };
		}
		if (!Array.isArray(parsed.words)) {
			return { valid: false, error: 'Missing or invalid "words" array' };
		}
		if (!parsed.words.every((word: unknown) => typeof word === 'string')) {
			return { valid: false, error: 'All words must be strings' };
		}
		return { valid: true, words: parsed.words };
	} catch (error) {
		return { valid: false, error: error instanceof Error ? error.message : 'Invalid JSON' };
	}
}

export function dedupeWords(words: string[]): string[] {
	return Array.from(new Set(words));
}

export function mergeLintConfig(defaultConfig: LintConfig, savedConfigJson: string | null): ParseResult<LintConfig> {
	if (savedConfigJson) {
		try {
			const savedConfig = JSON.parse(savedConfigJson);
			if (!isRecord(savedConfig)) {
				return { value: defaultConfig, error: 'saved lint config must be an object' };
			}
			return { value: { ...defaultConfig, ...savedConfig } as LintConfig };
		} catch (error) {
			return { value: defaultConfig, error };
		}
	}

	const config = { ...defaultConfig };
	for (const rule of DEFAULT_DISABLED_RULES) {
		if (rule in config) {
			config[rule] = false;
		}
	}
	return { value: config };
}

export function mapRules(config: LintConfig, descriptions: Record<string, string>): RuleInfo[] {
	return Object.entries(config).map(([name, enabled]) => ({
		name,
		displayName: pascalCaseToWords(name),
		description: descriptions[name] || 'No description available',
		enabled: enabled as boolean,
	})).sort((a, b) => a.displayName.localeCompare(b.displayName));
}
