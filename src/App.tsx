// src/App.tsx (simplified)
import { Component, createSignal, onMount, createEffect, batch, Show } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import RuleManager from './components/RuleManager';
import { initHarper, analyzeText, setRuleEnabled, addWordToDictionary } from './services/harper-service';
import type { HarperIssue, Suggestion } from './types';

const App: Component = () => {
  // Simple state management
  const [content, setContent] = createSignal('');
  const [issues, setIssues] = createSignal<HarperIssue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
  const [isInitialized, setIsInitialized] = createSignal(false);
  const [isAnalyzing, setIsAnalyzing] = createSignal(false);
  const [showRuleManager, setShowRuleManager] = createSignal(false);
  const [ignoredIssues, setIgnoredIssues] = createSignal<Set<string>>(new Set());
  
  // Simple debouncing
  let debounceTimeout: number | undefined;
  
  onMount(async () => {
    try {
      await initHarper();
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize Harper:', error);
    }
  });
  
  // Unified analysis function
  const analyzeContent = async (text: string) => {
    if (!isInitialized()) return;
    
    setIsAnalyzing(true);
    try {
      const allIssues = await analyzeText(text);
      // Filter out ignored issues
      const filteredIssues = allIssues.filter(issue => !ignoredIssues().has(issue.id));
      setIssues(filteredIssues);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Simple content change handler with debouncing
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = window.setTimeout(() => {
      analyzeContent(newContent);
    }, 300);
  };
  
  // Simple issue selection
  const selectIssue = (issueId: string | null) => {
    setSelectedIssueId(issueId);
  };
  
  // Unified apply suggestion handler
  const applySuggestion = async (issueId: string, suggestion: Suggestion) => {
    const issue = issues().find(i => i.id === issueId);
    if (!issue || !isInitialized()) return;
    
    try {
      const linter = (await import('./services/harper-service')).getLinter();
      const newText = await linter.applySuggestion(content(), issue.lint, suggestion);
      
      batch(() => {
        setContent(newText);
        setSelectedIssueId(null);
      });
      
      // Re-analyze immediately
      analyzeContent(newText);
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };
  
  // Handle ignore
  const handleIgnore = (issueId: string) => {
    const newIgnored = new Set(ignoredIssues());
    newIgnored.add(issueId);
    setIgnoredIssues(newIgnored);
    
    setIssues(issues().filter(i => i.id !== issueId));
    setSelectedIssueId(null);
  };
  
  // Handle rule toggle
  const handleRuleToggle = async (ruleName: string, enabled: boolean) => {
    await setRuleEnabled(ruleName, enabled);
    analyzeContent(content());
  };
  
  return (
    <div class="h-screen flex flex-col bg-[var(--flexoki-bg)]">
      <TopBar 
        onCopy={() => navigator.clipboard.writeText(content())}
        isAnalyzing={isAnalyzing()}
        isRuleManagerOpen={showRuleManager()}
        onToggleRuleManager={() => setShowRuleManager(!showRuleManager())}
      />
      
      <Show when={isInitialized()} fallback={
        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--flexoki-cyan)] border-r-transparent mb-4" />
            <p class="text-[var(--flexoki-tx-2)]">Initializing Harper.js...</p>
          </div>
        </div>
      }>
        <div class="flex-1 grid overflow-hidden app-layout" classList={{ 'rule-manager-open': showRuleManager() }}>
          <div class="overflow-hidden sidebar-left" classList={{ 'hidden-on-mobile': showRuleManager() }}>
            <Sidebar
              issues={issues()}
              selectedIssueId={selectedIssueId()}
              onIssueSelect={selectIssue}
              onApplySuggestion={applySuggestion}
              onAddToDictionary={addWordToDictionary}
            />
          </div>
          
          <div class="overflow-hidden editor-wrapper">
            <Editor
              content={content()}
              onContentChange={handleContentChange}
              issues={issues()}
              selectedIssueId={selectedIssueId()}
              onIssueSelect={selectIssue}
              onApplySuggestion={applySuggestion}
              onAddToDictionary={addWordToDictionary}
              onIgnore={handleIgnore}
            />
          </div>
          
          <div class="overflow-hidden sidebar-right" classList={{ 'visible-on-mobile': showRuleManager() }}>
            <Show when={showRuleManager()}>
              <RuleManager
                onClose={() => setShowRuleManager(false)}
                onRuleToggle={handleRuleToggle}
              />
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default App;