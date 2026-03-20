import { Component, createSignal, onMount, createEffect, batch, Show } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import RuleManager from './components/RuleManager';
import { initHarper, analyzeText, transformLints, getLinter, addWordToDictionary, getRules, toggleRule } from './services/harper-service';
import type { HarperIssue, Suggestion, RuleInfo } from './types';

const App: Component = () => {
	const [content, setContent] = createSignal('');
	const [issues, setIssues] = createSignal<HarperIssue[]>([]);
	const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
	const [isInitialized, setIsInitialized] = createSignal(false);
	const [isInitializing, setIsInitializing] = createSignal(false);

	const [scrollToIssue, setScrollToIssue] = createSignal<string | null>(null);
	const [isAnalyzing, setIsAnalyzing] = createSignal(false);
	const [isRuleManagerOpen, setIsRuleManagerOpen] = createSignal(false);
	const [rules, setRules] = createSignal<RuleInfo[]>([]);

	let debounceTimeout: number | undefined;
	let analysisGeneration = 0;

	const ignoredIssues = new Set<string>();
	let lastClickedIssueFromSidebar: string | null = null;

	function getIssueSignature(issue: HarperIssue, text: string): string {
		const span = issue.lint.span();
		const problemText = issue.lint.get_problem_text();
		const lintKind = issue.lint.lint_kind();
		const message = issue.lint.message();
		
		const contextSize = 50;
		const contextBefore = text.slice(Math.max(0, span.start - contextSize), span.start);
		const contextAfter = text.slice(span.end, Math.min(text.length, span.end + contextSize));
		
		return `${lintKind}|${message}|${problemText}|${contextBefore}|||${contextAfter}`;
	}

	onMount(async () => {
		setIsInitializing(true);
		try {
			await initHarper();
			const rulesList = await getRules();
			setRules(rulesList);
			setIsInitialized(true);
		} catch (error) {
			console.error('Failed to initialize Harper:', error);
		} finally {
			setIsInitializing(false);
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

		debounceTimeout = window.setTimeout(async () => {
			setIsAnalyzing(true);
			try {
				const lints = await analyzeText(text);

				if (currentGeneration === analysisGeneration) {
					const harperIssues = transformLints(lints);
					const filteredIssues = harperIssues.filter(issue => {
						const sig = getIssueSignature(issue, text);
						return !ignoredIssues.has(sig);
					});
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
			const currentText = content();
			const lints = await analyzeText(currentText);
			const harperIssues = transformLints(lints);
			const filteredIssues = harperIssues.filter(issue => {
				const sig = getIssueSignature(issue, currentText);
				return !ignoredIssues.has(sig);
			});
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to add word to dictionary:', error);
		}
	};

	const handleIgnore = (issueId: string) => {
		const issue = issues().find(i => i.id === issueId);
		if (issue) {
			const currentText = content();
			const sig = getIssueSignature(issue, currentText);
			ignoredIssues.add(sig);
			setIssues(issues().filter(i => i.id !== issueId));
			setSelectedIssueId(null);
		}
	};

	const handleRuleToggle = async (ruleName: string, enabled: boolean) => {
		try {
			await toggleRule(ruleName, enabled);
			const rulesList = await getRules();
			setRules(rulesList);
			const currentText = content();
			const lints = await analyzeText(currentText);
			const harperIssues = transformLints(lints);
			const filteredIssues = harperIssues.filter(issue => {
				const sig = getIssueSignature(issue, currentText);
				return !ignoredIssues.has(sig);
			});
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to toggle rule:', error);
		}
	};

	return (
		<div class="h-screen flex flex-col bg-(--flexoki-bg)">
			<TopBar 
				onCopy={handleCopy} 
				isAnalyzing={isAnalyzing()} 
				isRuleManagerOpen={isRuleManagerOpen()}
				onToggleRuleManager={() => setIsRuleManagerOpen(!isRuleManagerOpen())}
				isInitializing={isInitializing()}
			/>

			<div class="flex-1 grid overflow-hidden app-layout">
				<div class="overflow-hidden sidebar-left">
					<Sidebar
						issues={issues()}
						selectedIssueId={selectedIssueId()}
						onIssueSelect={(issueId) => {
							const shouldTrigger = issueId !== lastClickedIssueFromSidebar;
							lastClickedIssueFromSidebar = issueId;
							
							setSelectedIssueId(issueId);
							
							if (shouldTrigger) {
								setScrollToIssue(issueId);
								setTimeout(() => setScrollToIssue(null), 100);
							}
						}}
						onApplySuggestion={handleApplySuggestion}
						onAddToDictionary={handleAddToDictionary}
						onClose={() => setIsRuleManagerOpen(false)}
					/>
				</div>
				
				<div class="overflow-hidden editor-wrapper">
					<Editor
						content={content()}
						onContentChange={setContent}
						issues={issues()}
						selectedIssueId={selectedIssueId()}
						onIssueSelect={(issueId) => {
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
				
				<div class="overflow-hidden sidebar-right">
					<Show when={isRuleManagerOpen()}>
						<RuleManager
							onClose={() => setIsRuleManagerOpen(false)}
							onRuleToggle={handleRuleToggle}
							rules={rules()}
						/>
					</Show>
				</div>
			</div>
		</div>
	);
};

export default App;
