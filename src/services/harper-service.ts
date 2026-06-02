import { Dialect } from 'harper.js';
import type { Lint, LintConfig } from 'harper.js';
import type { DictionaryExport, DictionaryImportResult, HarperIssue, RuleInfo } from '../types';
import { createWorkerHarperLinter, type HarperLinter } from './harper-runtime';
import {
	analyzeTextWithAbort,
	dedupeWords,
	mapRules,
	mergeLintConfig,
	parseStoredCustomWords,
	transformLintsToIssues,
	validateDictionaryJson as validateDictionaryJsonInput,
} from './harper-policy';

export { Dialect };

let linter: HarperLinter | null = null;
let initPromise: Promise<void> | null = null;
let currentDialect: Dialect = Dialect.American;

export async function initHarper(dialect: Dialect = Dialect.American): Promise<void> {
	if (initPromise) return initPromise;

	currentDialect = dialect;

	initPromise = (async () => {
		linter = createWorkerHarperLinter(dialect);

		await linter.setup();

		const customWords = getCustomWords();
		if (customWords.length > 0) {
			await linter.importWords(customWords);
		}

		const config = loadLintConfig(await linter.getDefaultLintConfig());
		await linter.setLintConfig(config);
	})();

	return initPromise;
}

export async function setHarperDialect(dialect: Dialect): Promise<void> {
	if (currentDialect === dialect) return;
	currentDialect = dialect;
	await resetLinter();
}

// Recreate the linter so removed/edited words leave Harper's internal dictionary.
async function resetLinter(): Promise<void> {
	linter = null;
	initPromise = null;
	await initHarper(currentDialect);
}

export function getLinter(): HarperLinter {
	if (!linter) {
		throw new Error('Harper linter not initialized. Call initHarper() first.');
	}
	return linter;
}

export async function analyzeText(text: string, abortSignal?: AbortSignal): Promise<Record<string, Lint[]>> {
	return await analyzeTextWithAbort(getLinter(), text, abortSignal);
}

export function transformLints(organizedLints: Record<string, Lint[]>): HarperIssue[] {
	return transformLintsToIssues(organizedLints);
}

export function getCustomWords(): string[] {
	return loadCustomWords();
}

export async function addWordToDictionary(word: string): Promise<void> {
	const words = getCustomWords();
	if (!words.includes(word)) {
		words.push(word);
		saveCustomWords(words);
		await getLinter().importWords(words);
	}
}

export async function removeWordFromDictionary(word: string): Promise<void> {
	saveCustomWords(getCustomWords().filter(w => w !== word));
	await resetLinter();
}

export async function editWordInDictionary(oldWord: string, newWord: string): Promise<void> {
	const trimmed = newWord.trim();
	if (!trimmed || trimmed === oldWord) return;

	const currentWords = getCustomWords();
	const words = currentWords.includes(trimmed)
		? currentWords.filter(w => w !== oldWord)
		: currentWords.map(w => w === oldWord ? trimmed : w);

	saveCustomWords(words);
	await resetLinter();
}

export async function clearAllCustomWords(): Promise<void> {
	saveCustomWords([]);
	await resetLinter();
}

export function exportDictionary(): void {
	const words = getCustomWords();
	const exportData: DictionaryExport = { dictVersion: 1, words };
	const json = JSON.stringify(exportData, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${new Date().toISOString().split('T')[0]}-local-harper-dictionary.json`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function validateDictionaryJson(input: string): DictionaryImportResult {
	return validateDictionaryJsonInput(input);
}

export async function importDictionary(words: string[]): Promise<void> {
	saveCustomWords(dedupeWords(words));
	await resetLinter();
}

export async function getRules(): Promise<RuleInfo[]> {
	const linter = getLinter();
	const [config, descriptions] = await Promise.all([
		linter.getLintConfig(),
		linter.getLintDescriptions(),
	]);

	return mapRules(config, descriptions);
}

export async function toggleRule(ruleName: string, enabled: boolean): Promise<void> {
	const linter = getLinter();
	const config = await linter.getLintConfig();
	config[ruleName as keyof typeof config] = enabled;
	await linter.setLintConfig(config);
	localStorage.setItem('harper-lint-config', JSON.stringify(config));
}

export function getIssueSignature(issue: HarperIssue): string {
	return `${issue.lint.lint_kind()}|${issue.lint.message()}|${issue.lint.get_problem_text()}`;
}

function loadLintConfig(defaultConfig: LintConfig): LintConfig {
	const result = mergeLintConfig(defaultConfig, localStorage.getItem('harper-lint-config'));
	if (result.error) {
		console.error('Failed to parse saved lint config:', result.error);
	}
	return result.value;
}

function loadCustomWords(): string[] {
	const result = parseStoredCustomWords(localStorage.getItem('harper-custom-words'));
	if (result.error) {
		console.error('Failed to load custom words:', result.error);
	}
	return result.value;
}

function saveCustomWords(words: string[]): void {
	localStorage.setItem('harper-custom-words', JSON.stringify(words));
}
