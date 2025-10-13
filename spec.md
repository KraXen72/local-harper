# Harper.js Grammar Checker - Implementation Spec

## Overview
A local web app for grammar checking using Harper.js (WebAssembly), CodeMirror editor, and SolidJS.

## Core Features
- Full-screen CodeMirror editor with readable line length
- Real-time grammar checking with Harper.js
- Visual issue highlighting with color-coded underlines
- Interactive sidebar listing all issues
- Two-way interaction: click underline ↔ sidebar issue
- Custom dictionary management via localStorage
- Top bar with issue count and copy button

## Technical Stack
- **Framework**: SolidJS
- **Editor**: CodeMirror 6
- **Grammar Checker**: Harper.js (WASM)
- **Styling**: Tailwind CSS
- **Storage**: localStorage (custom dictionary)

## Harper.js Integration Details

### Environment
We're building a **browser-based web app** (Vite + SolidJS) that will:
- Run locally with `pnpm dev`
- Build to static files with `pnpm build`  
- Deploy to GitHub Pages

### Linter Types
Harper.js provides two linter implementations:
- **`WorkerLinter`**: Runs in a Web Worker, non-blocking (RECOMMENDED - use this)
- **`LocalLinter`**: Runs in main event loop, blocking (for Node.js or fallback)

### Core API
```typescript
import { WorkerLinter, binary, Dialect } from 'harper.js';

// Initialize with binary and optional dialect
const linter = new WorkerLinter({
  binary,                    // Import from harper.js
  dialect: Dialect.American, // Optional, defaults to American
});

// Optionally setup early (downloads/compiles WASM)
await linter.setup();

// Main linting method - returns Lint class instances
const lints = await linter.lint(text, {
  language: 'plaintext' // or 'markdown'
});

// Configure lint rules (Record<string, boolean | null>)
await linter.setLintConfig({
  SpellCheck: true,
  SentenceCapitalization: false,
  LongSentences: true,
  // ... other rules
});

// Custom dictionary management
await linter.importWords(['customword', 'anotherword']);
const words = await linter.exportWords();
```

### Harper Lint Class
Lints are **class instances with methods**, not plain objects:

```typescript
class Lint {
  span(): Span;                      // Returns { start: number, end: number }
  message(): string;                 // Get description
  lint_kind(): string;               // e.g., "Spelling", "Grammar"
  suggestions(): Suggestion[];       // Get Suggestion instances
  suggestion_count(): number;        // Number of suggestions
  get_problem_text(): string;        // The problematic text
}

class Suggestion {
  get_replacement_text(): string;    // Text to replace with
  kind(): SuggestionKind;            // Replace (0) or Remove (1)
}
```

### Available Lint Rules
Get all available rules dynamically:
```typescript
const config = await linter.getDefaultLintConfig();
// Returns Record<string, boolean | null> with all rules
```

Common rules include:
- `SpellCheck`, `SpelledNumbers`, `AnA`, `SentenceCapitalization`
- `UnclosedQuotes`, `WrongQuotes`, `LongSentences`, `RepeatedWords`
- `Spaces`, `Matcher`, `CorrectNumberSuffix`

## Architecture

### Component Structure
```
src/
  components/
    Editor.tsx          - CodeMirror wrapper
    Sidebar.tsx         - Issues list
    IssueItem.tsx       - Individual issue display
    TopBar.tsx          - Stats + copy button
  services/
    harper-service.ts   - Harper.js WorkerLinter integration
    dictionary-store.ts - Custom dictionary management
    harper-config.ts    - Lint rule configuration
  utils/
    editor-extensions.ts - CodeMirror decorations/extensions
  types/
    index.ts           - TypeScript interfaces
```

### State Management
- `editorContent` - Current text content
- `issues` - Array of HarperIssue (wraps Lint with id and severity)
- `selectedIssueId` - Currently focused issue
- `linter` - Singleton WorkerLinter instance
- `lintConfig` - Current lint rules configuration (LintConfig type)
- `dialect` - English dialect (Dialect enum)

All persistence done via localStorage:
- `harper-custom-words` - Array of custom dictionary words
- `harper-lint-config` - LintConfig object
- `harper-dialect` - Dialect enum value

## Implementation Plan

### Phase 1: Project Setup
- [x] Install CodeMirror dependencies
  - [x] `@codemirror/state`
  - [x] `@codemirror/view`
  - [x] `@codemirror/language`
  - [x] `@codemirror/commands`
- [x] Install Harper.js: `harper.js@^0.67.0`
- [x] Create directory structure (`components/`, `services/`, `utils/`, `types/`)
- [x] Set up TypeScript interfaces in `types/index.ts`

### Phase 2: Type Definitions
- [x] Define `HarperIssue` interface
  - [x] Position (start, end)
  - [x] Severity (error, warning, suggestion)
  - [x] Message
  - [x] Suggestions array
  - [x] Unique ID
- [x] Define `IssueCategory` enum
- [x] Define component prop types

### Phase 3: Basic Layout
- [x] Create main layout in `App.tsx`
  - [x] Grid/flex layout: TopBar, Editor, Sidebar
  - [x] Responsive container with max-width for readability
- [x] Implement `TopBar.tsx` component
  - [x] Issue count display (left)
  - [x] Copy button (right)
  - [x] Basic styling with Tailwind

### Phase 4: CodeMirror Integration
- [x] Create `Editor.tsx` component
  - [x] Initialize CodeMirror instance
  - [x] Set up basic extensions (lineWrapping, etc.)
  - [x] Create ref for EditorView
  - [x] Handle content changes → update signal
  - [x] Limit line length with CSS (`max-width: 65ch`)
- [x] Configure editor styling
  - [x] Full-screen height
  - [x] Centered content area
  - [x] Custom theme/styling

### Phase 5: Harper.js Service
- [x] Implement `harper-service.ts`
  - [x] Import `WorkerLinter`, `binary`, `Dialect` from 'harper.js'
  - [x] Create `initHarper()` async function
    - [x] Initialize `WorkerLinter` with binary and dialect
    - [x] Call `await linter.setup()` 
    - [x] Load custom words from localStorage and import via `importWords()`
    - [x] Load lint config from localStorage and set via `setLintConfig()`
  - [x] Create `getLinter()` function to access singleton
  - [x] Create `analyzeText(text: string)` function → returns `Promise<Lint[]>`
    - [x] Call `linter.lint(text)` with appropriate options
    - [x] Add debouncing (300-500ms) [Note: debouncing done in App.tsx]
  - [x] Create `transformLints(lints: Lint[])` function → returns `HarperIssue[]`
    - [x] Generate unique IDs for each issue
    - [x] Map `lint.lint_kind()` to `IssueSeverity`
    - [x] Wrap Lint instances with metadata: `{ id, lint, severity }`
  - [x] Export helper functions for config and dictionary management
- [x] Implement dictionary management functions in `harper-service.ts`
  - [x] `loadWords()` - load from localStorage (internal function)
  - [x] `saveCustomWords(words)` - save to localStorage  
  - [x] `addWordToDictionary(word)` - add to storage and call `linter.importWords([word])`
  - [x] `getCustomWords()` - returns array of custom words
- [x] Test Harper.js integration with sample text

### Phase 6: Issue Underlining
- [ ] Create `editor-extensions.ts`
  - [ ] Define decoration types based on severity:
    - [ ] Error: red wavy underline (for Spelling, Grammar)
    - [ ] Warning: yellow/orange wavy underline (for Punctuation)
    - [ ] Info: blue wavy underline (for Style, Readability)
  - [ ] Create StateField for decorations
  - [ ] Implement decoration builder from HarperIssue array
    - [ ] Get span from `issue.lint.span()`
    - [ ] Use `span.start` and `span.end` directly (character positions)
    - [ ] Apply decoration based on `issue.severity`
  - [ ] CodeMirror handles overlapping issues automatically
- [ ] Add click handler extension
  - [ ] Detect clicks on underlined text
  - [ ] Match click position to issue span (iterate issues)
  - [ ] Emit selected issue ID
  - [ ] Update `selectedIssueId` signal

### Phase 7: Sidebar Implementation
- [ ] Create `Sidebar.tsx` component
  - [ ] Scrollable list of issues
  - [ ] Group by severity (optional)
  - [ ] Fixed width, full height
- [ ] Create `IssueItem.tsx` component
  - [ ] Collapsible/expandable
  - [ ] Display message and context
  - [ ] Show suggestions as buttons
  - [ ] "Add to Dictionary" button
  - [ ] Click to scroll editor
  - [ ] Highlight when selected
- [ ] Handle empty state (no issues)

### Phase 8: Two-Way Interaction
- [ ] Editor → Sidebar
  - [ ] Click underline sets `selectedIssueId`
  - [ ] Sidebar scrolls to and expands selected issue
- [ ] Sidebar → Editor
  - [ ] Click issue sets `selectedIssueId`
  - [ ] Editor scrolls issue into view
  - [ ] Add temporary highlight/focus effect
- [ ] Sync selection state between both

### Phase 9: Quick Fixes
- [ ] Implement suggestion application
  - [ ] Use Harper's built-in `linter.applySuggestion(text, lint, suggestion)`
  - [ ] Get current editor content
  - [ ] Call applySuggestion with the Lint and Suggestion instances
  - [ ] Update editor with returned text
  - [ ] Re-run Harper.js analysis on new text
- [ ] Handle multiple suggestions
  - [ ] Display each suggestion with `suggestion.get_replacement_text()`
  - [ ] Check `suggestion.kind()` - Replace (0) or Remove (1)
  - [ ] Button for each suggestion
  - [ ] Preview on hover (optional)

### Phase 10: Dictionary Management
- [ ] Create `dictionary-store.ts`
  - [ ] `loadWords()` - load array from localStorage key 'harper-custom-words'
  - [ ] `saveWords(words: string[])` - save array to localStorage
  - [ ] `addWord(word: string)` function
    - [ ] Add to localStorage
    - [ ] Call `linter.importWords([word])` to add to Harper
  - [ ] `removeWord(word: string)` function (optional)
  - [ ] `getWords()` function → returns string[]
- [ ] Integrate with Harper.js initialization
  - [ ] Load custom words on app start
  - [ ] Import them with `linter.importWords(words)`
  - [ ] Harper will not report these words as issues
- [ ] Implement "Add to Dictionary" action
  - [ ] Extract word from spelling issue via `issue.lint.get_problem_text()`
  - [ ] Add to dictionary store (saves + imports to linter)
  - [ ] Re-run analysis - Harper won't report this word anymore
  - [ ] Update UI with new issues

### Phase 11: Copy Functionality
- [ ] Implement copy button in `TopBar.tsx`
  - [ ] Use Clipboard API
  - [ ] Copy current editor content
  - [ ] Show success feedback (toast/checkmark)
  - [ ] Handle copy errors gracefully

### Phase 12: Configuration UI
- [ ] Add settings panel/modal
  - [ ] Fetch current config with `linter.getLintConfig()`
  - [ ] Fetch default config with `linter.getDefaultLintConfig()`
  - [ ] Toggle checkboxes for each lint rule
  - [ ] Dialect selector dropdown (use Dialect enum)
  - [ ] View/manage custom dictionary
    - [ ] List words from `exportWords()`
    - [ ] Remove words with `clearWords()` or selective re-import
  - [ ] Reset to defaults option
- [ ] Integrate config changes
  - [ ] Apply with `linter.setLintConfig(newConfig)`
  - [ ] Apply dialect with `linter.setDialect(newDialect)`
  - [ ] Save to localStorage ('harper-lint-config', 'harper-dialect')
  - [ ] Re-analyze text when config/dialect changes
- [ ] Add settings button to TopBar
  - [ ] Icon button to open settings
  - [ ] Visual indicator for non-default configs

### Phase 13: Polish & UX
- [ ] Add loading states
  - [ ] Harper.js initialization
  - [ ] Analysis in progress
- [ ] Optimize performance
  - [ ] Debounce text changes
  - [ ] Virtualize sidebar for many issues
  - [ ] Memoize expensive computations
- [ ] Improve visual design
  - [ ] Consistent spacing
  - [ ] Color scheme for issue types
  - [ ] Smooth animations/transitions
  - [ ] Focus states and accessibility
- [ ] Add keyboard shortcuts
  - [ ] Navigate between issues (n/p)
  - [ ] Apply first suggestion (Enter)
  - [ ] Copy content (Ctrl+C override)

### Phase 14: Testing & Refinement
- [ ] Test with various text samples
- [ ] Test dictionary functionality
- [ ] Test all lint rule configurations
- [ ] Verify two-way interaction works smoothly
- [ ] Test edge cases (empty text, very long text)
- [ ] Test WorkerLinter performance and non-blocking behavior
- [ ] Verify character position mapping (span) is accurate
- [ ] Browser compatibility check
- [ ] Performance profiling with large documents

## Key Implementation Notes

### Issue Color Mapping (based on lint_kind)
```typescript
Spelling:     'red'     // Spelling errors → Error severity
Grammar:      'red'     // Grammar mistakes → Error severity  
Punctuation:  'yellow'  // Punctuation issues → Warning severity
Style:        'blue'    // Style suggestions → Info severity
Readability:  'blue'    // Readability tips → Info severity
```

### Harper.js Integration Pattern
```typescript
import { WorkerLinter, binary, Dialect } from 'harper.js';
import type { Lint } from 'harper.js';

// Initialize once at app startup
const linter = new WorkerLinter({
  binary,
  dialect: Dialect.American,
});
await linter.setup();

// Lint text (debounced)
const lints: Lint[] = await linter.lint(text);

// Lints are CLASS INSTANCES with methods (not plain objects):
for (const lint of lints) {
  const span = lint.span();           // Method call, returns Span
  const message = lint.message();     // Method call, returns string
  const kind = lint.lint_kind();      // Method call, returns string
  const suggestions = lint.suggestions(); // Method call, returns Suggestion[]
  
  // Character positions from span
  const start = span.start;
  const end = span.end;
}

// Transform to app format (wrap with metadata)
const issues: HarperIssue[] = lints.map(lint => ({
  id: generateId(),
  lint: lint,                              // Keep the Lint instance
  severity: mapLintKindToSeverity(lint),   // Map using lint.lint_kind()
}));

// Helper function
function mapLintKindToSeverity(lint: Lint): IssueSeverity {
  const kind = lint.lint_kind().toLowerCase();
  if (kind.includes('spelling') || kind.includes('grammar')) {
    return IssueSeverity.Error;
  }
  if (kind.includes('punctuation')) {
    return IssueSeverity.Warning;
  }
  return IssueSeverity.Info;
}
```

### CodeMirror Decorations
Use `Decoration.mark()` with custom CSS classes for underlines. Create a `StateField` that rebuilds decorations when issues change. Harper provides character-based `span` positions which directly map to CodeMirror positions.

### Debouncing Strategy
Debounce text changes before calling `linter.lint()` to avoid excessive WASM/Worker calls. Since `WorkerLinter` is already non-blocking, a 300-500ms debounce is sufficient. Use `setTimeout` or a reactive utility.

### Scroll Synchronization
Use CodeMirror's `EditorView.scrollIntoView()` with character positions from `span.start` and DOM `scrollIntoView()` for the sidebar to keep both in sync.

### localStorage Schema
```typescript
{
  "harper-custom-words": ["word1", "word2", "word3"],
  "harper-lint-config": {
    "SpellCheck": true,
    "SentenceCapitalization": false,
    // ... other rules (Record<string, boolean | null>)
  },
  "harper-dialect": 0  // Dialect enum value (0=American, 1=British, etc.)
}
```

### Working with Suggestions
```typescript
import type { Suggestion } from 'harper.js';
import { SuggestionKind } from 'harper.js';

// Get suggestions from a lint
const suggestions = lint.suggestions();

for (const sug of suggestions) {
  const text = sug.get_replacement_text();
  const kind = sug.kind();
  
  if (kind === SuggestionKind.Replace) {
    console.log('Replace with:', text);
  } else if (kind === SuggestionKind.Remove) {
    console.log('Remove the text');
  }
}

// Apply a suggestion
const newText = await linter.applySuggestion(
  currentText,
  lint,
  suggestion
);
// Update editor with newText
```

## Success Criteria
- ✅ Editor loads and accepts input
- ✅ Harper.js WorkerLinter initializes without blocking
- ✅ Harper.js analyzes text in real-time (debounced)
- ✅ Issues appear as colored underlines (based on lint_kind)
- ✅ Sidebar lists all issues with correct messages and suggestions
- ✅ Clicking underline focuses sidebar item
- ✅ Clicking sidebar item scrolls editor to correct span position
- ✅ Quick fixes (suggestions) apply correctly and re-analyze
- ✅ Custom dictionary persists and filters spelling issues
- ✅ Copy button works
- ✅ Issue count updates accurately
- ✅ Lint rules can be configured and persist
- ✅ Dialect selection works and persists
- ✅ Character position mapping (span) is accurate in all cases
- ✅ Multiple issues at same position handled gracefully (priority-based)
