import { Component, createSignal, onMount, createEffect, batch, Show } from 'solid-js';
import { useEditorJSON } from 'solid-tiptap';
import StarterKit from '@tiptap/starter-kit';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import RuleManager from './components/RuleManager';
import { initHarper, analyzeText, transformLints, getLinter, addWordToDictionary, updateSingleRule, getLintConfig } from './services/harper-service';
import { HarperDecoration } from './extensions/harper-decoration';
import { HarperSuggestion, HarperBubbleMenu } from './extensions/harper-suggestion';
import type { HarperIssue, Suggestion, LintConfig } from './types';

const App: Component = () => {
	const [issues, setIssues] = createSignal<HarperIssue[]>([]);
	const [isInitialized, setIsInitialized] = createSignal(false);
	const [isAnalyzing, setIsAnalyzing] = createSignal(false);
	const [isRuleManagerOpen, setIsRuleManagerOpen] = createSignal(false);
	const [currentLintConfig, setCurrentLintConfig] = createSignal<LintConfig | null>(null);
	const [editor, setEditor] = createSignal<any>(null);

	// Debounce state - not reactive, just regular variables
	let debounceTimeout: number | undefined;
	let analysisGeneration = 0;

	// Set to store ignored issue IDs (persists until page refresh)
	const ignoredIssues = new Set<string>();

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

					// Update Tiptap storage
					const ed = editor();
					if (ed) {
						ed.commands.setHarperIssues(filteredIssues);
					}
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
	const json = useEditorJSON(() => editor());
	createEffect(() => {
		const currentJson = json();
		if (currentJson && isInitialized()) {
			const text = editor()?.getText() || '';
			scheduleAnalysis(text);
		}
	});

	const handleApplySuggestion = async (issueId: string, suggestion: Suggestion) => {
		const issue = issues().find(i => i.id === issueId);
		if (!issue) return;

		try {
			const linter = getLinter();
			const ed = editor();
			if (!ed) return;

			const oldText = ed.getText();
			const newText = await linter.applySuggestion(oldText, issue.lint, suggestion);

			// Apply the change via Tiptap
			const span = issue.lint.span();
			ed.chain()
				.setTextSelection({ from: span.start, to: span.end })
				.insertContent(newText.slice(span.start, span.end - span.start))
				.run();

			// Re-analyze will happen automatically via content change effect
		} catch (error) {
			console.error('Failed to apply suggestion:', error);
		}
	};

	const handleAddToDictionary = async (word: string) => {
		try {
			await addWordToDictionary(word);
			// Re-analyze will happen automatically via content change effect
		} catch (error) {
			console.error('Failed to add word to dictionary:', error);
		}
	};

	const handleIgnore = (issueId: string) => {
		// Add to ignored set
		ignoredIssues.add(issueId);
		// Remove from current issues
		const updatedIssues = issues().filter(i => i.id !== issueId);
		setIssues(updatedIssues);

		// Update Tiptap storage
		const ed = editor();
		if (ed) {
			ed.commands.setHarperIssues(updatedIssues);
		}
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
			const text = editor()?.getText() || '';
			const lints = await analyzeText(text);
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
			const text = editor()?.getText() || '';
			const lints = await analyzeText(text);
			const harperIssues = transformLints(lints);
			const filteredIssues = harperIssues.filter(issue => !ignoredIssues.has(issue.id));
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to refresh config after import:', error);
		}
	};

	return (
		<div class="h-screen flex flex-col bg-[var(--flexoki-bg)]">
			<Show when={editor()}>
				<TopBar 
					editor={editor()!}
					isAnalyzing={isAnalyzing()} 
					isRuleManagerOpen={isRuleManagerOpen()}
					onToggleRuleManager={toggleRuleManager}
				/>
			</Show>

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
						<Show when={editor()}>
							<Sidebar
								editor={editor()!}
								onApplySuggestion={handleApplySuggestion}
								onAddToDictionary={handleAddToDictionary}
							/>
						</Show>
					</div>
					
					{/* Editor - centered area */}
					<div class="editor-wrapper">
						<Editor onEditorReady={setEditor} />
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
		<div class="flex-1 flex items-center justify-center bg-[var(--flexoki-bg)]">
			<div class="text-center">
				<div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--flexoki-cyan)] border-r-transparent mb-4" />
				<p class="text-[var(--flexoki-tx-2)]">Initializing Harper.js...</p>
			</div>
		</div>
	);
}

export default App;
