/**
 * App.tsx — root orchestrator
 *
 * Owns all application state:
 *   text, issues, ignoredKeys, selectedIssueIndex, dictionary, harperReady, analyzing
 *
 * The only place where analysis runs. All child components are pure display.
 */

import {
  createMemo,
  createSignal,
  onMount,
  Show,
  type Component,
} from "solid-js";
import { initHarper, type HarperAPI, type Issue } from "./harper";
import { loadDictionary, saveDictionary } from "./dictionary";
import Editor from "./Editor";
import Sidebar from "./Sidebar";
import WordCounter from "./WordCounter";

// ── Debounce ───────────────────────────────────────────────────────────────

function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  ms: number
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ── App ────────────────────────────────────────────────────────────────────

const App: Component = () => {
  // ── State ──
  const [text, setText] = createSignal("");
  const [rawIssues, setRawIssues] = createSignal<Issue[]>([]);
  const [ignoredKeys, setIgnoredKeys] = createSignal<Set<string>>(new Set());
  const [selectedIssueIndex, setSelectedIssueIndex] = createSignal<number | null>(null);
  const [harperReady, setHarperReady] = createSignal(false);
  const [analyzing, setAnalyzing] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [selectedText, setSelectedText] = createSignal<string | null>(null);
  /** Incrementing triggers autocomplete in Editor (from sidebar click). */
  const [autocompleteTrigger, setAutocompleteTrigger] = createSignal(0);

  let harper: HarperAPI | undefined;
  let dictionary = loadDictionary();

  // issues after filtering ignored ones
  const visibleIssues = createMemo(() => {
    const ignored = ignoredKeys();
    return rawIssues().filter((i) => !ignored.has(i.key));
  });

  // ── Analysis ──

  let generation = 0;

  async function runAnalysis(currentText: string) {
    if (!harper) return;
    const gen = ++generation;
    setAnalyzing(true);
    try {
      const issues = harper.analyze(currentText);
      if (gen !== generation) return; // stale result
      setRawIssues(issues);
      // Recalibrate selectedIndex if it's now out of range
      setSelectedIssueIndex((idx) => {
        const visible = issues.filter((i) => !ignoredKeys().has(i.key));
        if (idx === null || idx >= visible.length) return null;
        return idx;
      });
    } finally {
      if (gen === generation) setAnalyzing(false);
    }
  }

  const debouncedAnalysis = debounce(runAnalysis, 200);

  // ── Init ──

  onMount(async () => {
    harper = await initHarper(dictionary);
    setHarperReady(true);
    // Analyze initial text (empty, but starts the reactive loop cleanly)
    await runAnalysis(text());
  });

  // ── Handlers ──

  function handleTextChange(newText: string) {
    setText(newText);
    if (harperReady()) debouncedAnalysis(newText);
  }

  function handleCursorIssueChange(index: number | null) {
    setSelectedIssueIndex(index);
  }

  function handleSidebarSelect(index: number) {
    setSelectedIssueIndex(index);
    setAutocompleteTrigger((c) => c + 1);
  }

  function handleNavigate(dir: "next" | "prev") {
    const issues = visibleIssues();
    if (issues.length === 0) return;
    setSelectedIssueIndex((current) => {
      if (current === null) return dir === "next" ? 0 : issues.length - 1;
      if (dir === "next") return (current + 1) % issues.length;
      return (current - 1 + issues.length) % issues.length;
    });
    setAutocompleteTrigger((c) => c + 1);
  }

  function handleIgnore(key: string) {
    setIgnoredKeys((prev) => new Set([...prev, key]));
    setSelectedIssueIndex(null);
  }

  function handleAddWord(word: string) {
    if (!harper) return;
    dictionary = [...dictionary, word];
    saveDictionary(dictionary);
    harper.addWord(word);
    // Re-analyze to clear spelling issues for this word
    runAnalysis(text());
  }

  function handleApplySuggestion(_issue: Issue, _suggestion: string) {
    // The CM dispatch in Editor fires onTextChange → handleTextChange → debouncedAnalysis.
    // Nothing extra needed here except clearing the cursor selection state.
    setSelectedIssueIndex(null);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(text());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ── Render ──

  return (
    <div
      class="grid h-screen overflow-hidden"
      style={{
        "grid-template-columns": "280px 1fr",
        "grid-template-rows": "auto 1fr auto",
        background: "var(--color-base-black)",
      }}
    >
      {/* ── Header ── */}
      <header
        class="col-span-2 flex items-center justify-between px-5 py-3 shrink-0"
        style={{
          background: "var(--color-base-950)",
          "border-bottom": "1px solid var(--color-base-850)",
        }}
      >
        <div class="flex items-center gap-2.5">
          <span
            class="font-semibold tracking-tight"
            style={{ color: "var(--color-base-100)" }}
          >
            Harper
          </span>
          <Show when={!harperReady()}>
            <span class="text-xs" style={{ color: "var(--color-base-600)" }}>
              loading…
            </span>
          </Show>
          <Show when={harperReady() && analyzing()}>
            <span class="analyzing-dot" aria-hidden="true" />
          </Show>
        </div>

        <button
          class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
          style={{
            color: copied() ? "var(--color-green)" : "var(--color-base-400, var(--color-base-500))",
            background: "transparent",
            border: "1px solid var(--color-base-700)",
          }}
          onClick={handleCopy}
          title="Copy text"
        >
          <Show
            when={!copied()}
            fallback={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </Show>
          {copied() ? "Copied!" : "Copy"}
        </button>
      </header>

      {/* ── Loading bar ── */}
      <Show when={!harperReady()}>
        <div class="progress-bar col-span-2" style={{ "grid-row": "1", "align-self": "end" }} />
      </Show>

      {/* ── Sidebar ── */}
      <div class="overflow-hidden" style={{ "grid-row": "2", "grid-column": "1" }}>
        <Sidebar
          issues={visibleIssues()}
          selectedIndex={selectedIssueIndex()}
          onSelect={handleSidebarSelect}
          onIgnore={handleIgnore}
        />
      </div>

      {/* ── Editor ── */}
      <div
        class="overflow-hidden"
        style={{
          "grid-row": "2",
          "grid-column": "2",
          background: "var(--color-base-900)",
        }}
      >
        <Show when={harperReady()} fallback={<div class="h-full" />}>
          <Editor
            issues={visibleIssues()}
            selectedIssueIndex={selectedIssueIndex()}
            autocompleteTrigger={autocompleteTrigger()}
            placeholder="Start writing…"
            onTextChange={handleTextChange}
            onCursorIssueChange={handleCursorIssueChange}
            onNavigate={handleNavigate}
            onIgnore={handleIgnore}
            onAddWord={handleAddWord}
            onApplySuggestion={handleApplySuggestion}
            onSelectionChange={setSelectedText}
          />
        </Show>
      </div>

      {/* ── Word counter ── */}
      <div class="col-span-2" style={{ "grid-row": "3" }}>
        <WordCounter text={text()} selectedText={selectedText()} />
      </div>
    </div>
  );
};

export default App;
