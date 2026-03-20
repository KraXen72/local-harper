import { WorkerLinter, binary, Dialect } from 'harper.js';
import type { Lint } from '../types';

let linter: WorkerLinter | null = null;
let initPromise: Promise<void> | null = null;

export async function initHarper(): Promise<void> {
	if (initPromise) return initPromise;

	initPromise = (async () => {
		// Use the resolved wasmUrl
		linter = new WorkerLinter({
			binary: wasmUrl,
			dialect: Dialect.American
		});

		await linter.setup();

		const words = getCustomWords();
		if (words.length > 0) await linter.importWords(words);
	})();

		return initPromise;
}

export function getLinter(): WorkerLinter {
	if (!linter) throw new Error('Harper not initialized');
	return linter;
}

export async function analyzeText(text: string): Promise<Record<string, Lint[]>> {
	return getLinter().organizedLints(text);
}

// Custom Dictionary Management
export function getCustomWords(): string[] {
	try { return JSON.parse(localStorage.getItem('harper-words') || '[]'); }
	catch { return []; }
}

export async function addWordToDictionary(word: string): Promise<void> {
	const words = getCustomWords();
	if (!words.includes(word)) {
		words.push(word);
		localStorage.setItem('harper-words', JSON.stringify(words));
		await getLinter().importWords(words);
	}
}
