import { Component, createSignal, onMount, createEffect } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { initHarper, analyzeText, transformLints, getLinter, addWordToDictionary } from './services/harper-service';
import type { HarperIssue, Suggestion } from './types';

const App: Component = () => {
	const [content, setContent] = createSignal('');
	const [issues, setIssues] = createSignal<HarperIssue[]>([]);
	const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
	const [isInitialized, setIsInitialized] = createSignal(false);
	const [isAnalyzing, setIsAnalyzing] = createSignal(false);
	const [scrollToIssue, setScrollToIssue] = createSignal<string | null>(null);

	// Debounce state - not reactive, just regular variables
	let debounceTimeout: number | undefined;
	let analysisGeneration = 0;

	// Initialize Harper.js on mount
	onMount(async () => {
		try {
			await initHarper();
			setIsInitialized(true);
		} catch (error) {
			console.error('Failed to initialize Harper:', error);
		}
	});

	// Manual debounced analysis function
	const scheduleAnalysis = (text: string) => {
		// Clear any pending analysis
		if (debounceTimeout !== undefined) {
			clearTimeout(debounceTimeout);
		}
		setIsAnalyzing(false);

		// Handle empty text
		if (!text.trim()) {
			setIssues([]);
			return;
		}

		// Increment generation to invalidate any in-flight analysis
		const currentGeneration = ++analysisGeneration;

		// Schedule new analysis
		debounceTimeout = window.setTimeout(async () => {
			setIsAnalyzing(true);
			try {
				const lints = await analyzeText(text);
				
				// Only update if this is still the latest analysis
				if (currentGeneration === analysisGeneration) {
					const harperIssues = transformLints(lints);
					setIssues(harperIssues);
					setIsAnalyzing(false);
				}
			} catch (error) {
				if (currentGeneration === analysisGeneration) {
					console.error('Failed to analyze text:', error);
					setIsAnalyzing(false);
				}
			}
		}, 200);
	};

	// Watch content changes and trigger analysis
	createEffect(() => {
		const text = content();
		if (isInitialized()) {
			scheduleAnalysis(text);
		}
	});

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(content());
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	};

	const handleApplySuggestion = async (issueId: string, suggestion: Suggestion) => {
		const issue = issues().find(i => i.id === issueId);
		if (!issue) return;

		try {
			const linter = getLinter();
			const newText = await linter.applySuggestion(content(), issue.lint, suggestion);
			setContent(newText);
		} catch (error) {
			console.error('Failed to apply suggestion:', error);
		}
	};

	const handleAddToDictionary = async (word: string) => {
		try {
			await addWordToDictionary(word);
			// Re-analyze to update issues
			const lints = await analyzeText(content());
			const harperIssues = transformLints(lints);
			setIssues(harperIssues);
		} catch (error) {
			console.error('Failed to add word to dictionary:', error);
		}
	};

	return (
		<div class="h-screen flex flex-col bg-[#1a1a1a]">
			<TopBar issueCount={issues().length} onCopy={handleCopy} isAnalyzing={isAnalyzing()} />

			{!isInitialized() ? (
				<div class="flex-1 flex items-center justify-center bg-[#1a1a1a]">
					<div class="text-center">
						<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4" />
						<p class="text-gray-400">Initializing Harper.js...</p>
					</div>
				</div>
			) : (
				<div class="flex-1 flex overflow-hidden">
					<div class="flex-1">
						<Editor
							content={content()}
							onContentChange={setContent}
							issues={issues()}
							selectedIssueId={selectedIssueId()}
							onIssueSelect={setSelectedIssueId}
							onApplySuggestion={handleApplySuggestion}
							onAddToDictionary={handleAddToDictionary}
							scrollToIssue={scrollToIssue()}
						/>
					</div>

					<Sidebar
						issues={issues()}
						selectedIssueId={selectedIssueId()}
						onIssueSelect={(issueId) => {
							setSelectedIssueId(issueId);
							setScrollToIssue(issueId);
							// Reset scroll trigger after a short delay
							setTimeout(() => setScrollToIssue(null), 100);
						}}
						onApplySuggestion={handleApplySuggestion}
						onAddToDictionary={handleAddToDictionary}
					/>
				</div>
			)}
		</div>
	);
};

export default App;
