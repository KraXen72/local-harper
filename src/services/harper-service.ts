import { WorkerLinter, binary, Dialect } from 'harper.js';
import type { Lint, LintConfig } from 'harper.js';
import type { HarperIssue } from '../types';
import { IssueSeverity } from '../types';

let linter: WorkerLinter | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Harper.js linter with configuration from localStorage
 */
export async function initHarper(): Promise<void> {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		// Load saved dialect or default to American
		const savedDialect = localStorage.getItem('harper-dialect');
		const dialect = savedDialect ? parseInt(savedDialect, 10) : Dialect.American;

		linter = new WorkerLinter({
			binary,
			dialect,
		});

		await linter.setup();

		// Load and apply custom words
		const customWords = loadCustomWords();
		if (customWords.length > 0) {
			await linter.importWords(customWords);
		}

		// Load and apply lint config
		const savedConfig = localStorage.getItem('harper-lint-config');
		if (savedConfig) {
			try {
				const config = JSON.parse(savedConfig);
				await linter.setLintConfig(config);
			} catch (e) {
				console.error('Failed to load lint config:', e);
			}
		} else {
			// Apply default configuration with AvoidCurses disabled
			const defaultConfig = await linter.getDefaultLintConfig();
			defaultConfig.AvoidCurses = false;
			await linter.setLintConfig(defaultConfig);
		}
	})();

	return initPromise;
}

/**
 * Get the linter instance (must call initHarper first)
 */
export function getLinter(): WorkerLinter {
	if (!linter) {
		throw new Error('Harper linter not initialized. Call initHarper() first.');
	}
	return linter;
}

/**
 * Analyze text and return organized lints with rule names
 */
export async function analyzeText(text: string): Promise<Record<string, Lint[]>> {
	const linter = getLinter();
	return linter.organizedLints(text);
}

/**
 * Transform organized Harper Lints to HarperIssue objects with metadata
 * Issues are sorted by their logical location in the source document (span.start)
 */
export function transformLints(organizedLints: Record<string, Lint[]>): HarperIssue[] {
	const issues: HarperIssue[] = [];
	let index = 0;
	
	for (const [rule, lints] of Object.entries(organizedLints)) {
		for (const lint of lints) {
			issues.push({
				id: `issue-${Date.now()}-${index}`,
				lint,
				severity: mapLintKindToSeverity(lint),
				rule,
			});
			index++;
		}
	}
	
	// Sort issues by their location in the source document
	issues.sort((a, b) => {
		const spanA = a.lint.span();
		const spanB = b.lint.span();
		return spanA.start - spanB.start;
	});
	
	return issues;
}

/**
 * Map lint_kind to IssueSeverity
 */
function mapLintKindToSeverity(lint: Lint): IssueSeverity {
	const kind = lint.lint_kind().toLowerCase();

	if (kind.includes('spelling') || kind.includes('grammar')) {
		return IssueSeverity.Error;
	}

	if (kind.includes('punctuation')) {
		return IssueSeverity.Warning;
	}

	return IssueSeverity.Info;
}

/**
 * Load custom words from localStorage
 */
function loadCustomWords(): string[] {
	const saved = localStorage.getItem('harper-custom-words');
	if (!saved) return [];

	try {
		return JSON.parse(saved);
	} catch (e) {
		console.error('Failed to load custom words:', e);
		return [];
	}
}

/**
 * Save custom words to localStorage
 */
export function saveCustomWords(words: string[]): void {
	localStorage.setItem('harper-custom-words', JSON.stringify(words));
}

/**
 * Add a word to the custom dictionary
 */
export async function addWordToDictionary(word: string): Promise<void> {
	const words = loadCustomWords();
	if (!words.includes(word)) {
		words.push(word);
		saveCustomWords(words);
		// Re-import all words to ensure the linter has the complete dictionary
		await getLinter().importWords(words);
	}
}

/**
 * Get all custom words
 */
export function getCustomWords(): string[] {
	return loadCustomWords();
}

/**
 * Get current lint configuration
 */
export async function getLintConfig(): Promise<LintConfig> {
	return getLinter().getLintConfig();
}

/**
 * Get default lint configuration
 */
export async function getDefaultLintConfig(): Promise<LintConfig> {
	return getLinter().getDefaultLintConfig();
}

/**
 * Update lint configuration
 */
export async function setLintConfig(config: LintConfig): Promise<void> {
	await getLinter().setLintConfig(config);
	localStorage.setItem('harper-lint-config', JSON.stringify(config));
}

/**
 * Set dialect
 */
export async function setDialect(dialect: Dialect): Promise<void> {
	await getLinter().setDialect(dialect);
	localStorage.setItem('harper-dialect', dialect.toString());
}
