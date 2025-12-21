import { onMount, createEffect } from 'solid-js';
import { store, actions } from './store';
import { initHarper, runLint } from './services/harper';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar'; // Assumed unchanged or trivial

export default function App() {
  onMount(() => {
    initHarper();
    // Set initial text if empty
    if (!store.text) actions.setText("# Hello World\nType here...");
  });

  // Auto-lint when text or config changes
  // Debounce could be added here
  createEffect(() => {
    // track deps
    store.text;
    store.config;
    runLint();
  });

  return (
    <div class="flex h-screen w-screen flex-col bg-[var(--flexoki-bg)] text-[var(--flexoki-tx)]">
      <TopBar />
      <div class="flex flex-1 overflow-hidden">
        <main class="flex-1 relative">
          <Editor />
        </main>
        <aside class="w-80 border-l border-[var(--flexoki-ui-2)] bg-[var(--flexoki-bg-2)]">
          <Sidebar />
        </aside>
      </div>
    </div>
  );
}
