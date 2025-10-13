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

	// Initialize Harper.js on mount
	onMount(async () => {
		try {
			await initHarper();
			setIsInitialized(true);
		} catch (error) {
			console.error('Failed to initialize Harper:', error);
		}
	});

	// Debounced text analysis
	createEffect(() => {
		const text = content();

		if (!isInitialized() || !text.trim()) {
			setIssues([]);
			return;
		}

		setIsAnalyzing(true);
		const timeoutId = setTimeout(async () => {
			try {
				const lints = await analyzeText(text);
				const harperIssues = transformLints(lints);
				setIssues(harperIssues);
			} catch (error) {
				console.error('Failed to analyze text:', error);
			} finally {
				setIsAnalyzing(false);
			}
		}, 200);

		return () => clearTimeout(timeoutId);
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

	// Keyboard shortcuts
	// onMount(() => {
	// 	const handleKeyDown = (e: KeyboardEvent) => {
	// 		// Only handle shortcuts when not in input/textarea (editor handles its own)
	// 		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
	// 			return;
	// 		}

	// 		const currentIssues = issues();
	// 		const currentSelectedId = selectedIssueId();

	// 		// Navigate to next issue (n key)
	// 		if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
	// 			e.preventDefault();
	// 			if (currentIssues.length === 0) return;

	// 			const currentIndex = currentSelectedId
	// 				? currentIssues.findIndex(i => i.id === currentSelectedId)
	// 				: -1;
	// 			const nextIndex = (currentIndex + 1) % currentIssues.length;
	// 			setSelectedIssueId(currentIssues[nextIndex].id);
	// 		}

	// 		// Navigate to previous issue (p key)
	// 		if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
	// 			e.preventDefault();
	// 			if (currentIssues.length === 0) return;

	// 			const currentIndex = currentSelectedId
	// 				? currentIssues.findIndex(i => i.id === currentSelectedId)
	// 				: 0;
	// 			const prevIndex = currentIndex === 0 ? currentIssues.length - 1 : currentIndex - 1;
	// 			setSelectedIssueId(currentIssues[prevIndex].id);
	// 		}

	// 		// Apply first suggestion (Enter key)
	// 		if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && currentSelectedId) {
	// 			e.preventDefault();
	// 			const issue = currentIssues.find(i => i.id === currentSelectedId);
	// 			if (issue) {
	// 				const suggestions = issue.lint.suggestions();
	// 				if (suggestions.length > 0) {
	// 					handleApplySuggestion(currentSelectedId, suggestions[0]);
	// 				}
	// 			}
	// 		}
	// 	};

	// 	document.addEventListener('keydown', handleKeyDown);
	// 	onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
	// });

	return (
		<div class="h-screen flex flex-col">
			<TopBar issueCount={issues().length} onCopy={handleCopy} isAnalyzing={isAnalyzing()} />

			{!isInitialized() ? (
				<div class="flex-1 flex items-center justify-center bg-gray-50">
					<div class="text-center">
						<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4" />
						<p class="text-gray-600">Initializing Harper.js...</p>
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
