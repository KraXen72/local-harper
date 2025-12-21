import { Component, createSignal, onMount, createEffect, Show } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import RuleManager from './components/RuleManager';
import { initHarper, analyzeText, transformLints, updateSingleRule, getLintConfig } from './services/harper-service';
import type { LintConfig } from './types';
import { content, setContent, issues, setIssues, selectedIssueId, setSelectedIssueId, scrollToIssue } from './state/app-store';
import editorManager from './services/editor-manager';

const App: Component = () => {
	const [isInitialized, setIsInitialized] = createSignal(false);
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
		// Best-effort: schedule analysis when initialized flag flips true
		scheduleAnalysis(text);
	});

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(content());
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	};

	// suggestion/dictionary actions are handled by editorManager now

	// ignore handled by editorManager.ignoreIssue now

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

	const handleConfigImported = async () => {
		try {
			// Refresh config from storage
			const newConfig = await getLintConfig();
			setCurrentLintConfig(newConfig);
			// Re-analyze current text with new config
			const lints = await analyzeText(content());
			const harperIssues = transformLints(lints);
			const filteredIssues = harperIssues.filter(issue => !ignoredIssues.has(issue.id));
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to refresh config after import:', error);
		}

	};

	return (
		<div class="h-screen flex flex-col bg-(--flexoki-bg)">
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
						<Sidebar />
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
							onApplySuggestion={(issueId, suggestion) => void editorManager.applySuggestion(issueId, suggestion)}
							onAddToDictionary={(word) => void editorManager.addWordToDictionary(word)}
							onIgnore={(issueId) => void editorManager.ignoreIssue(issueId)}
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
								onConfigImported={handleConfigImported}
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
		<div class="flex-1 flex items-center justify-center bg-(--flexoki-bg)">
			<div class="text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-(--flexoki-cyan) border-r-transparent mb-4" />
				<p class="text-(--flexoki-tx-2)">Initializing Harper.js...</p>
			</div>
		</div>
	);
}

export default App;
