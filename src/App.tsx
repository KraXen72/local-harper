import { Component, createSignal, onMount, createEffect, batch, Show } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import RuleManager from './components/RuleManager';
import { initHarper, analyzeText, transformLints, getLinter, addWordToDictionary, updateSingleRule, getLintConfig } from './services/harper-service';
import type { HarperIssue, Suggestion, LintConfig } from './types';

const App: Component = () => {
	const [content, setContent] = createSignal('');
	const [issues, setIssues] = createSignal<HarperIssue[]>([]);
	const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
	const [isInitialized, setIsInitialized] = createSignal(false);
	const [scrollToIssue, setScrollToIssue] = createSignal<string | null>(null);
	const [isAnalyzing, setIsAnalyzing] = createSignal(false);
	const [isRuleManagerOpen, setIsRuleManagerOpen] = createSignal(false);
	const [currentLintConfig, setCurrentLintConfig] = createSignal<LintConfig | null>(null);

	// Debounce state - not reactive, just regular variables
	let debounceTimeout: number | undefined;
	let analysisGeneration = 0;

	// Set to store ignored issue IDs (persists until page refresh)
	const ignoredIssues = new Set<string>();

	// Track the last clicked issue from sidebar to avoid re-triggering autocomplete
	let lastClickedIssueFromSidebar: string | null = null;

	// Initialize Harper.js on mount
	onMount(async () => {
		try {
			await initHarper();
			const config = await getLintConfig();
			setCurrentLintConfig(config);
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

		// Handle empty text
		if (!text.trim()) {
			setIssues([]);
			setIsAnalyzing(false);
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
					// Filter out ignored issues
					const filteredIssues = harperIssues.filter(issue => !ignoredIssues.has(issue.id));
					setIssues(filteredIssues);
				}
			} catch (error) {
				if (currentGeneration === analysisGeneration) {
					console.error('Failed to analyze text:', error);
				}
			} finally {
				if (currentGeneration === analysisGeneration) {
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

			// Immediately analyze the new text
			const lints = await analyzeText(newText);
			const harperIssues = transformLints(lints);

			// Batch both updates together so they happen atomically
			batch(() => {
				setSelectedIssueId(null);
				setContent(newText);
				setIssues(harperIssues);
			});
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
			const filteredIssues = harperIssues.filter(issue => !ignoredIssues.has(issue.id));
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to add word to dictionary:', error);
		}
	};

	const handleIgnore = (issueId: string) => {
		// Add to ignored set
		ignoredIssues.add(issueId);
		// Remove from current issues
		setIssues(issues().filter(i => i.id !== issueId));
		setSelectedIssueId(null);
	};

	const toggleRuleManager = () => {
		setIsRuleManagerOpen(!isRuleManagerOpen());
	};

	const handleRuleToggle = async (ruleName: string, enabled: boolean) => {
		try {
			await updateSingleRule(ruleName, enabled);
			// Update current config
			const newConfig = await getLintConfig();
			setCurrentLintConfig(newConfig);
			// Re-analyze current text
			const lints = await analyzeText(content());
			const harperIssues = transformLints(lints);
			const filteredIssues = harperIssues.filter(issue => !ignoredIssues.has(issue.id));
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to toggle rule:', error);
		}
	};

	return (
		<div class="h-screen flex flex-col bg-[var(--flexoki-bg)]">
			<TopBar 
				onCopy={handleCopy} 
				isAnalyzing={isAnalyzing()} 
				isRuleManagerOpen={isRuleManagerOpen()}
				onToggleRuleManager={toggleRuleManager}
			/>

			<Show when={isInitialized()} fallback={<LoadingFallback />}>
				<div 
					class="flex-1 grid overflow-hidden app-layout"
					classList={{
						'rule-manager-open': isRuleManagerOpen()
					}}
				>
					{/* Left - Issue Sidebar/Rule manager on small screens */}
					<div class="overflow-hidden sidebar-left"
						classList={{
							'hidden-on-mobile': isRuleManagerOpen()
						}}
					>
						<Sidebar
							issues={issues()}
							selectedIssueId={selectedIssueId()}
							onIssueSelect={(issueId) => {
								// Only trigger scroll/autocomplete if it's a different issue than last clicked
								const shouldTrigger = issueId !== lastClickedIssueFromSidebar;
								lastClickedIssueFromSidebar = issueId;
								
								setSelectedIssueId(issueId);
								
								if (shouldTrigger) {
									setScrollToIssue(issueId);
									// Reset scroll trigger after a short delay
									setTimeout(() => setScrollToIssue(null), 100);
								}
							}}
							onApplySuggestion={handleApplySuggestion}
							onAddToDictionary={handleAddToDictionary}
						/>
					</div>
					
					{/* Editor - centered area */}
					<div class="overflow-hidden editor-wrapper">
						<Editor
							content={content()}
							onContentChange={setContent}
							issues={issues()}
							selectedIssueId={selectedIssueId()}
							onIssueSelect={(issueId) => {
								// When selecting an issue from editor (cursor movement), clear the last clicked sidebar issue
								// This allows clicking the same issue again from sidebar to trigger autocomplete
								if (issueId !== lastClickedIssueFromSidebar) {
									lastClickedIssueFromSidebar = null;
								}
								setSelectedIssueId(issueId);
							}}
							onApplySuggestion={handleApplySuggestion}
							onAddToDictionary={handleAddToDictionary}
							onIgnore={handleIgnore}
							scrollToIssue={scrollToIssue()}
						/>
					</div>

					{/* Right - Rule manager/nothing */}
					<div 
						class="overflow-hidden sidebar-right"
						classList={{
							'visible-on-mobile': isRuleManagerOpen()
						}}
					>
						<Show when={currentLintConfig()}>
							<RuleManager
								isOpen={isRuleManagerOpen()}
								onClose={() => setIsRuleManagerOpen(false)}
								onRuleToggle={handleRuleToggle}
								currentConfig={currentLintConfig()!}
							/>
						</Show>
					</div>
				</div>
			</Show>
		</div>
	);
};

function LoadingFallback() {
	return (
		<div class="flex-1 flex items-center justify-center bg-[var(--flexoki-bg)]">
			<div class="text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--flexoki-cyan)] border-r-transparent mb-4" />
				<p class="text-[var(--flexoki-tx-2)]">Initializing Harper.js...</p>
			</div>
		</div>
	);
}

export default App;
