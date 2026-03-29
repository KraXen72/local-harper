import { WorkerLinter, binary, Dialect } from 'harper.js';
import type { Lint } from 'harper.js';
import type { HarperIssue, DictionaryExport, DictionaryImportResult } from '../types';

export { Dialect };

let linter: WorkerLinter | null = null;
let initPromise: Promise<void> | null = null;
let currentDialect: Dialect = Dialect.American;

const DEFAULT_DISABLED_RULES = ['AvoidCurses'];

export async function initHarper(dialect: Dialect = Dialect.American): Promise<void> {
	if (initPromise) return initPromise;

	currentDialect = dialect;

	initPromise = (async () => {
		linter = new WorkerLinter({
			binary,
			dialect,
		});

		await linter.setup();

		const customWords = getCustomWords();
		if (customWords.length > 0) {
			await linter.importWords(customWords);
		}

		const defaultConfig = await linter.getDefaultLintConfig();
		const savedConfigJson = localStorage.getItem('harper-lint-config');
		let config = defaultConfig;

		if (savedConfigJson) {
			try {
				const savedConfig = JSON.parse(savedConfigJson);
				config = { ...defaultConfig, ...savedConfig };
			} catch (e) {
				console.error('Failed to parse saved lint config:', e);
			}
		} else {
			for (const rule of DEFAULT_DISABLED_RULES) {
				if (rule in config) {
					config[rule as keyof typeof config] = false;
				}
			}
		}

		await linter.setLintConfig(config);
	})();

	return initPromise;
}

export async function setHarperDialect(dialect: Dialect): Promise<void> {
	if (currentDialect === dialect) return;
	currentDialect = dialect;
	await resetLinter();
}

// Tears down and recreates the linter so removed/edited words are no longer
// in harper's internal dictionary. importWords() only appends — it doesn't
// remove words that were previously imported.
async function resetLinter(): Promise<void> {
	linter = null;
	initPromise = null;
	await initHarper(currentDialect);
}

export function getLinter(): WorkerLinter {
	if (!linter) {
		throw new Error('Harper linter not initialized. Call initHarper() first.');
	}
	return linter;
}

export async function analyzeText(text: string, abortSignal?: AbortSignal): Promise<Record<string, Lint[]>> {
	const linter = getLinter();

	// Check if already aborted before starting
	if (abortSignal?.aborted) {
		throw new DOMException('Aborted', 'AbortError');
	}

	// If there's no abortSignal, just await the lint result normally
	if (!abortSignal) {
		return await linter.organizedLints(text);
	}

	// Race the linter promise against an abort promise so we can fail fast
	const lintPromise = linter.organizedLints(text);

	let removeListener: () => void = () => { };
	const abortPromise = new Promise<never>((_, reject) => {
		const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
		abortSignal.addEventListener('abort', onAbort);
		removeListener = () => abortSignal.removeEventListener('abort', onAbort);
	});

	try {
		const result = await Promise.race([lintPromise, abortPromise]) as Record<string, Lint[]>;
		removeListener();
		// If the signal became aborted after the race resolved, treat as abort
		if (abortSignal.aborted) throw new DOMException('Aborted', 'AbortError');
		return result;
	} catch (err) {
		removeListener();
		throw err;
	}
}

export function transformLints(organizedLints: Record<string, Lint[]>): HarperIssue[] {
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

	issues.sort((a, b) => {
		const spanA = a.lint.span();
		const spanB = b.lint.span();
		return spanA.start - spanB.start;
	});

	return issues;
}

export function getCustomWords(): string[] {
	const saved = localStorage.getItem('harper-custom-words');
	if (!saved) return [];
	try {
		return JSON.parse(saved);
	} catch (e) {
		console.error('Failed to load custom words:', e);
		return [];
	}
}

export async function addWordToDictionary(word: string): Promise<void> {
	const words = getCustomWords();
	if (!words.includes(word)) {
		words.push(word);
		localStorage.setItem('harper-custom-words', JSON.stringify(words));
		await getLinter().importWords(words);
	}
}

export async function removeWordFromDictionary(word: string): Promise<void> {
	const words = getCustomWords().filter(w => w !== word);
	localStorage.setItem('harper-custom-words', JSON.stringify(words));
	// importWords() only adds — reset the linter so the old word is no longer valid
	await resetLinter();
}

export async function editWordInDictionary(oldWord: string, newWord: string): Promise<void> {
	const trimmed = newWord.trim();
	if (!trimmed || trimmed === oldWord) return;
	const currentWords = getCustomWords();
	// If newWord already exists, just remove the old word
	if (currentWords.includes(trimmed)) {
		const words = currentWords.filter(w => w !== oldWord);
		localStorage.setItem('harper-custom-words', JSON.stringify(words));
	} else {
		const words = currentWords.map(w => w === oldWord ? trimmed : w);
		localStorage.setItem('harper-custom-words', JSON.stringify(words));
	}
	// importWords() only adds — reset the linter so the old word is no longer valid
	await resetLinter();
}

export async function clearAllCustomWords(): Promise<void> {
	localStorage.setItem('harper-custom-words', JSON.stringify([]));
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
	try {
		const parsed = JSON.parse(input);
		if (typeof parsed !== 'object' || parsed === null) {
			return { valid: false, error: 'JSON must be an object' };
		}
		if (parsed.dictVersion !== 1) {
			return { valid: false, error: 'Unsupported dictVersion. Expected 1.' };
		}
		if (!Array.isArray(parsed.words)) {
			return { valid: false, error: 'Missing or invalid "words" array' };
		}
		if (!parsed.words.every((w: unknown) => typeof w === 'string')) {
			return { valid: false, error: 'All words must be strings' };
		}
		return { valid: true, words: parsed.words };
	} catch (e) {
		return { valid: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
	}
}

export async function importDictionary(words: string[]): Promise<void> {
	// De-duplicate imported words
	const uniqueWords = Array.from(new Set(words));
	localStorage.setItem('harper-custom-words', JSON.stringify(uniqueWords));
	await resetLinter();
}

export async function getRules(): Promise<Array<{ name: string; displayName: string; description: string; enabled: boolean }>> {
	const linter = getLinter();
	const [config, descriptions] = await Promise.all([
		linter.getLintConfig(),
		linter.getLintDescriptions()
	]);

	return Object.entries(config).map(([name, enabled]) => ({
		name,
		displayName: pascalCaseToWords(name),
		description: descriptions[name] || 'No description available',
		enabled: enabled as boolean
	})).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function toggleRule(ruleName: string, enabled: boolean): Promise<void> {
	const linter = getLinter();
	const config = await linter.getLintConfig();
	config[ruleName as keyof typeof config] = enabled;
	await linter.setLintConfig(config);
	localStorage.setItem('harper-lint-config', JSON.stringify(config));
}

function pascalCaseToWords(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
		.trim();
}

export function getIssueSignature(issue: HarperIssue): string {
	return `${issue.lint.lint_kind()}|${issue.lint.message()}|${issue.lint.get_problem_text()}`;
}
