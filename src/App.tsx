import { Component, createSignal, onMount, createEffect } from 'solid-js';
import TopBar from './components/TopBar';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import { initHarper, analyzeText, transformLints } from './services/harper-service';
import type { HarperIssue } from './types';

const App: Component = () => {
  const [content, setContent] = createSignal('');
  const [issues, setIssues] = createSignal<HarperIssue[]>([]);
  const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
  const [isInitialized, setIsInitialized] = createSignal(false);

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

    const timeoutId = setTimeout(async () => {
      try {
        const lints = await analyzeText(text);
        const harperIssues = transformLints(lints);
        setIssues(harperIssues);
      } catch (error) {
        console.error('Failed to analyze text:', error);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content());
      // TODO: Add success feedback
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div class="h-screen flex flex-col">
      <TopBar issueCount={issues().length} onCopy={handleCopy} />
      
      <div class="flex-1 flex overflow-hidden">
        <div class="flex-1">
          <Editor
            content={content()}
            onContentChange={setContent}
            issues={issues()}
            selectedIssueId={selectedIssueId()}
            onIssueSelect={setSelectedIssueId}
          />
        </div>
        
        <Sidebar
          issues={issues()}
          selectedIssueId={selectedIssueId()}
          onIssueSelect={setSelectedIssueId}
          onApplySuggestion={(issueId, suggestion) => {
            // TODO: Implement in next phase
            console.log('Apply suggestion:', issueId, suggestion);
          }}
          onAddToDictionary={(word) => {
            // TODO: Implement in next phase
            console.log('Add to dictionary:', word);
          }}
        />
      </div>
    </div>
  );
};

export default App;
