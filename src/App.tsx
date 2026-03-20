import { Component, createSignal, onMount, createEffect, batch, Show } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { initHarper, analyzeText, getLinter, addWordToDictionary } from './services/harper';
import type { HarperIssue, Suggestion } from './types';

const App: Component = () => {
	const [content, setContent] = createSignal('');
	const [issues, setIssues] = createSignal<HarperIssue[]>([]);
	const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);

	const [isInitializing, setIsInitializing] = createSignal(true);
	const [isAnalyzing, setIsAnalyzing] = createSignal(false);
	const [ignoredSignatures, setIgnoredSignatures] = createSignal<Set<string>>(new Set());

	let debounceTimeout: number;
	let analysisGeneration = 0;

	onMount(async () => {
		await initHarper();
		setIsInitializing(false);
	});

	// The Centralized Analysis Pipeline
	createEffect(() => {
		const text = content();
		if (isInitializing()) return;

		clearTimeout(debounceTimeout);
		if (!text.trim()) {
			batch(() => { setIssues([]); setIsAnalyzing(false); });
			return;
		}

		const currentGeneration = ++analysisGeneration;

		debounceTimeout = window.setTimeout(async () => {
			setIsAnalyzing(true);
			try {
				const rawLints = await analyzeText(text);
				if (currentGeneration !== analysisGeneration) return; // Stale analysis

				const parsedIssues: HarperIssue[] = [];
				for (const [rule, lints] of Object.entries(rawLints)) {
					for (const lint of lints) {
						const signature = `${rule}:${lint.get_problem_text()}`;
						// Filter out ignored issues immediately
						if (!ignoredSignatures().has(signature)) {
							parsedIssues.push({
								id: `${rule}-${lint.span().start}-${lint.span().end}`,
																lint,
																rule,
																signature
							});
						}
					}
				}

				// Sort by position
				parsedIssues.sort((a, b) => a.lint.span().start - b.lint.span().start);
				setIssues(parsedIssues);
			} finally {
				if (currentGeneration === analysisGeneration) setIsAnalyzing(false);
			}
		}, 200);
	});

	const handleApplySuggestion = async (issue: HarperIssue, suggestion: Suggestion) => {
		const newText = await getLinter().applySuggestion(content(), issue.lint, suggestion);
		batch(() => {
			setContent(newText);
			setSelectedIssueId(null);
		});
	};

	const handleIgnore = (signature: string) => {
		const newSet = new Set(ignoredSignatures());
		newSet.add(signature);
		batch(() => {
			setIgnoredSignatures(newSet);
			setIssues(issues().filter(i => i.signature !== signature));
			setSelectedIssueId(null);
		});
	};

	const handleAddWord = async (word: string) => {
		await addWordToDictionary(word);
		// Force re-analysis
		const temp = content();
		setContent('');
		setContent(temp);
	};

	return (
		<div class="h-screen flex flex-col bg-(--flexoki-bg) overflow-hidden">
		<TopBar
		onCopy={() => navigator.clipboard.writeText(content())}
		isAnalyzing={isAnalyzing()}
		isInitializing={isInitializing()}
		/>
		<div class="flex-1 grid grid-cols-[minmax(250px,1fr)_minmax(84ch,3fr)] h-full min-h-0">
		<Sidebar
		issues={issues()}
		selectedIssueId={selectedIssueId()}
		onIssueSelect={setSelectedIssueId}
		/>
		<div class="overflow-hidden relative">
		<Show when={!isInitializing()}>
		<Editor
		content={content()}
		issues={issues()}
		selectedIssueId={selectedIssueId()}
		onContentChange={setContent}
		onIssueSelect={setSelectedIssueId}
		onApplySuggestion={handleApplySuggestion}
		onIgnore={handleIgnore}
		onAddToDictionary={handleAddWord}
		/>
		</Show>
		</div>
		</div>
		</div>
	);
};

export default App;
