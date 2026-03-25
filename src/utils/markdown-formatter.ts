type FormatFn = (text: string, options?: Record<string, unknown>) => Promise<string>;

import { EditorView } from '@codemirror/view';
import type { FormatOptions } from '@hongdown/wasm';

const STORAGE_KEY = 'hongdown-config';

export const DEFAULT_CONFIG = JSON.stringify({
	lineWidth: 80,
	setextH1: true,
	setextH2: true,
	headingSentenceCase: false,
	headingProperNouns: [],
	headingCommonNouns: [],
	unorderedMarker: '-',
	fenceChar: '`',
	minFenceLength: 3,
	spaceAfterFence: false,
	defaultLanguage: '',
	curlyDoubleQuotes: false,
	curlySingleQuotes: false,
	curlyApostrophes: false,
	ellipsis: false,
	enDash: false,
	emDash: '--',
	evenLevelMarker: ".",
	thematicBreakLeadingSpaces: 0,
	thematicBreakStyle: '-----',
} satisfies FormatOptions, null, 2);

let formatFn: FormatFn | null = null;
let loadPromise: Promise<void> | null = null;

export async function loadFormatter(): Promise<void> {
	if (loadPromise) return loadPromise;
	loadPromise = (async () => {
		console.log('[hongdown] Loading WASM formatter...');
		const { format } = await import('@hongdown/wasm');
		formatFn = format;
		console.log('[hongdown] Formatter ready.');
	})();
	return loadPromise;
}

export function getFormatterConfig(): string {
	return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CONFIG;
}

export function saveFormatterConfig(config: string): void {
	localStorage.setItem(STORAGE_KEY, config);
}

function parseConfig(config: string): Record<string, unknown> {
	try {
		return JSON.parse(config) as Record<string, unknown>;
	} catch {
		console.warn('[hongdown] Failed to parse config, using defaults.');
		return {};
	}
}

export async function formatMarkdown(text: string): Promise<string> {
	if (!formatFn) {
		await loadFormatter();
	}
	if (!formatFn) return text;
	const options = parseConfig(getFormatterConfig());
	return await formatFn(text, options);
}

// format selection or entire document with hongdown
export function formatMarkdownCommand(view: EditorView): boolean {
	console.log("[hongdown] Formatting...")

	const sel = view.state.selection.main;

	if (!sel.empty) {
		// Format only the selected range
		const from = sel.from;
		const to = sel.to;
		const selectedText = view.state.sliceDoc(from, to);

		formatMarkdown(selectedText)
			.then(formatted => {
				// Trim trailing newline added by the formatter when formatting a fragment
				const result = formatted.trimEnd();
				if (result === selectedText) return;
				view.dispatch({
					changes: { from, to, insert: result },
					selection: { anchor: from + result.length },
				});
			})
			.catch(err => console.error('[hongdown] Format failed:', err));
	} else {
		// Format the entire document
		const fullText = view.state.doc.toString();

		formatMarkdown(fullText)
			.then(formatted => {
				// Guard against stale dispatch if the doc changed while formatting
				if (view.state.doc.toString() !== fullText) return;
				if (formatted === fullText) return;
				view.dispatch({
					changes: { from: 0, to: view.state.doc.length, insert: formatted },
				});
			})
			.catch(err => console.error('[hongdown] Format failed:', err));
	}

	return false;
}