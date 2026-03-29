import { Component, createSignal, onMount, onCleanup, createEffect, batch, Show } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import RuleManager from './components/RuleManager';
import DictManager from './components/DictManager';
import { initHarper, analyzeText, transformLints, getLinter, addWordToDictionary, removeWordFromDictionary, editWordInDictionary, clearAllCustomWords, getCustomWords, getRules, toggleRule, getIssueSignature, setHarperDialect, importDictionary, Dialect } from './services/harper-service';
import type { HarperIssue, Suggestion, RuleInfo } from './types';
import { clearTooltip } from './utils/editor-extensions';
import { sidebarStore, setSidebarStore, toggleRightPanel } from './stores/sidebar';

const App: Component = () => {
	const [content, setContent] = createSignal('');
	const [issues, setIssues] = createSignal<HarperIssue[]>([]);
	const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
	const [isInitialized, setIsInitialized] = createSignal(false);
	const [isInitializing, setIsInitializing] = createSignal(false);

	const [scrollToIssue, setScrollToIssue] = createSignal<string | null>(null);
	const [isAnalyzing, setIsAnalyzing] = createSignal(false);
	const [rules, setRules] = createSignal<RuleInfo[]>([]);
	const [words, setWords] = createSignal<string[]>([]);
	const [currentDialect, setCurrentDialect] = createSignal<Dialect>(Dialect.American);
	const [isReloading, setIsReloading] = createSignal(false);

	let debounceTimeout: number | undefined;
	let analysisGeneration = 0;
	let currentAbortController: AbortController | null = null;

	const ignoredIssues = new Set<string>();
	let lastClickedIssueFromSidebar: string | null = null;

	onMount(async () => {
		setIsInitializing(true);
		try {
			const savedDialect = localStorage.getItem('harper-dialect');
			const parsedDialect = savedDialect ? Number(savedDialect) : NaN;
			const dialect = Object.values(Dialect).includes(parsedDialect)
				? parsedDialect as Dialect
				: Dialect.American;
			setCurrentDialect(dialect);
			await initHarper(dialect);
			const rulesList = await getRules();
			setRules(rulesList);
			setWords(getCustomWords());
			setIsInitialized(true);
		} catch (error) {
			console.error('Failed to initialize Harper:', error);
		} finally {
			setIsInitializing(false);
		}
	});

	onCleanup(() => {
		// Abort any ongoing analysis when component unmounts
		if (currentAbortController) {
			currentAbortController.abort();
		}
		if (debounceTimeout !== undefined) {
			clearTimeout(debounceTimeout);
		}
	});

	// Manual debounced analysis function with proper cancellation
	const scheduleAnalysis = (text: string) => {
		// Abort any ongoing analysis request
		if (currentAbortController) {
			currentAbortController.abort();
		}

		// Clear any pending debounce timeout
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

		// Create new abort controller for this analysis
		currentAbortController = new AbortController();

		debounceTimeout = window.setTimeout(async () => {
			setIsAnalyzing(true);
			try {
				const lints = await analyzeText(text, currentAbortController!.signal);

				// Only update if this is still the current generation and not aborted
				if (currentGeneration === analysisGeneration && !currentAbortController!.signal.aborted) {
					const harperIssues = transformLints(lints);
					const filteredIssues = harperIssues.filter(issue => {
						const sig = getIssueSignature(issue);
						return !ignoredIssues.has(sig);
					});
					setIssues(filteredIssues);
				}
			} catch (error) {
				// Ignore abort errors, they're expected when text changes rapidly
				if (error instanceof DOMException && error.name === 'AbortError') {
					return;
				}

				if (currentGeneration === analysisGeneration && !currentAbortController!.signal.aborted) {
					console.error('Failed to analyze text:', error);
				}
			} finally {
				if (currentGeneration === analysisGeneration && !currentAbortController!.signal.aborted) {
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
			const filteredIssues = harperIssues.filter(issue => {
				const sig = getIssueSignature(issue);
				return !ignoredIssues.has(sig);
			});

			// Batch both updates together so they happen atomically
			batch(() => {
				setSelectedIssueId(null);
				setContent(newText);
				setIssues(filteredIssues);
			});
		} catch (error) {
			console.error('Failed to apply suggestion:', error);
		}
	};

	const handleAddToDictionary = async (word: string) => {
		try {
			setIsReloading(true);
			await addWordToDictionary(word);
			setWords(getCustomWords());
			const currentText = content();
			const lints = await analyzeText(currentText);
			const harperIssues = transformLints(lints);
			const filteredIssues = harperIssues.filter(issue => {
				const sig = getIssueSignature(issue);
				return !ignoredIssues.has(sig);
			});
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to add word to dictionary:', error);
		} finally {
			setIsReloading(false);
		}
	};

	const handleRemoveFromDictionary = async (word: string) => {
		try {
			setIsReloading(true);
			await removeWordFromDictionary(word);
			setWords(getCustomWords());
			scheduleAnalysis(content());
		} catch (error) {
			console.error('Failed to remove word from dictionary:', error);
		} finally {
			setIsReloading(false);
		}
	};

	const handleEditInDictionary = async (oldWord: string, newWord: string) => {
		try {
			setIsReloading(true);
			await editWordInDictionary(oldWord, newWord);
			setWords(getCustomWords());
			scheduleAnalysis(content());
		} catch (error) {
			console.error('Failed to edit word in dictionary:', error);
		} finally {
			setIsReloading(false);
		}
	};

	const handleClearAllDictionary = async () => {
		try {
			setIsReloading(true);
			await clearAllCustomWords();
			setWords(getCustomWords());
			scheduleAnalysis(content());
		} catch (error) {
			console.error('Failed to clear dictionary:', error);
		} finally {
			setIsReloading(false);
		}
	};

	const handleImportDictionary = async (words: string[]) => {
		try {
			setIsReloading(true);
			await importDictionary(words);
			setWords(getCustomWords());
			scheduleAnalysis(content());
		} catch (error) {
			console.error('Failed to import dictionary:', error);
		} finally {
			setIsReloading(false);
		}
	};

	const handleIgnore = (issueId: string) => {
		const issue = issues().find(i => i.id === issueId);
		if (issue) {
			const sig = getIssueSignature(issue);
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
				const sig = getIssueSignature(issue);
				return !ignoredIssues.has(sig);
			});
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to toggle rule:', error);
		}
	};

	const handleDialectChange = async (dialect: Dialect) => {
		try {
			setIsReloading(true);
			await setHarperDialect(dialect);
			setCurrentDialect(dialect);
			localStorage.setItem('harper-dialect', String(dialect));
			const currentText = content();
			const lints = await analyzeText(currentText);
			const harperIssues = transformLints(lints);
			const filteredIssues = harperIssues.filter(issue => {
				const sig = getIssueSignature(issue);
				return !ignoredIssues.has(sig);
			});
			setIssues(filteredIssues);
		} catch (error) {
			console.error('Failed to change dialect:', error);
		} finally {
			setIsReloading(false);
		}
	};

	const handleToggleRightPanel = (panel: 'rules' | 'dictionary') => {
		setSidebarStore('isIssueSidebarOpen', false)
		if (sidebarStore.rightPanel !== panel) {
			setSelectedIssueId(null);
			clearTooltip();
		}
		toggleRightPanel(panel);
	};

	return (
		<div class="h-screen flex flex-col bg-(--flexoki-bg)">
			<TopBar
				onCopy={handleCopy}
				isAnalyzing={isAnalyzing()}
				isRuleManagerOpen={sidebarStore.rightPanel === 'rules'}
				onToggleRuleManager={() => handleToggleRightPanel('rules')}
				isDictManagerOpen={sidebarStore.rightPanel === 'dictionary'}
				onToggleDictManager={() => handleToggleRightPanel('dictionary')}
				isInitializing={isInitializing()}
				isReloading={isReloading()}
				isSidebarOpen={sidebarStore.isIssueSidebarOpen}
				onToggleSidebar={() => {
					if (sidebarStore.rightPanel !== null) {
						// When a right panel is open, always close it and open issues —
						// don't toggle, so we never need a double-click to get here.
						setSidebarStore('rightPanel', null);
						setSidebarStore('isIssueSidebarOpen', true);
					} else {
						setSidebarStore('isIssueSidebarOpen', open => !open);
					}
				}}
			/>

			<div class="flex-1 grid overflow-hidden app-layout">
				<div class="overflow-hidden sidebar-left" classList={{ 'sidebar-open': sidebarStore.isIssueSidebarOpen }}>
					<Sidebar
						issues={issues()}
						selectedIssueId={selectedIssueId()}
						onIssueSelect={(issueId) => {
							const shouldTrigger = issueId !== lastClickedIssueFromSidebar;
							lastClickedIssueFromSidebar = issueId;

							setSidebarStore('isIssueSidebarOpen', false);
							setSelectedIssueId(issueId);

							if (shouldTrigger) {
								setScrollToIssue(issueId);
								setTimeout(() => setScrollToIssue(null), 100);
							}
						}}
						onApplySuggestion={handleApplySuggestion}
						onAddToDictionary={handleAddToDictionary}
						onClose={() => setSidebarStore('isIssueSidebarOpen', false)}
						isOpen={sidebarStore.isIssueSidebarOpen}
						onToggle={() => setSidebarStore('isIssueSidebarOpen', open => !open)}
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

				<div
					class="overflow-hidden sidebar-right"
					classList={{
						'show-rule-manager border-l border-l-(--flexoki-ui-2)/20': sidebarStore.rightPanel !== null
					}}
					style={{
						"pointer-events": sidebarStore.rightPanel !== null ? "auto" : "none",
						"box-shadow": sidebarStore.rightPanel !== null ? "-4px 0 15px rgba(0, 0, 0, 0.1)" : "none"
					}}
				>
					<Show when={sidebarStore.rightPanel === 'rules'}>
						<RuleManager
							onClose={() => setSidebarStore('rightPanel', null)}
							onRuleToggle={handleRuleToggle}
							onDialectChange={handleDialectChange}
							rules={rules()}
							currentDialect={currentDialect()}
						/>
					</Show>
					<Show when={sidebarStore.rightPanel === 'dictionary'}>
						<DictManager
							onClose={() => setSidebarStore('rightPanel', null)}
							words={words()}
							onAdd={handleAddToDictionary}
							onRemove={handleRemoveFromDictionary}
							onEdit={handleEditInDictionary}
							onClearAll={handleClearAllDictionary}
							onImport={handleImportDictionary}
						/>
					</Show>
				</div>
			</div>
		</div>
	);
};

export default App;
