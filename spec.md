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
    harper-service.ts   - Harper.js integration
    dictionary-store.ts - Custom dictionary management
  utils/
    editor-extensions.ts - CodeMirror decorations/extensions
  types/
    index.ts           - TypeScript interfaces
```

### State Management
- `editorContent` - Current text content
- `issues` - Array of Harper.js issues
- `selectedIssueId` - Currently focused issue
- `customDictionary` - Set of custom words (localStorage)

## Implementation Plan

### Phase 1: Project Setup
- [x] Install CodeMirror dependencies
  - [x] `@codemirror/state`
  - [x] `@codemirror/view`
  - [x] `@codemirror/language`
  - [x] `@codemirror/commands`
- [x] Create directory structure (`components/`, `services/`, `utils/`, `types/`)
- [x] Set up TypeScript interfaces in `types/index.ts`

### Phase 2: Type Definitions
- [ ] Define `HarperIssue` interface
  - [ ] Position (start, end)
  - [ ] Severity (error, warning, suggestion)
  - [ ] Message
  - [ ] Suggestions array
  - [ ] Unique ID
- [ ] Define `IssueCategory` enum
- [ ] Define component prop types

### Phase 3: Basic Layout
- [ ] Create main layout in `App.tsx`
  - [ ] Grid/flex layout: TopBar, Editor, Sidebar
  - [ ] Responsive container with max-width for readability
- [ ] Implement `TopBar.tsx` component
  - [ ] Issue count display (left)
  - [ ] Copy button (right)
  - [ ] Basic styling with Tailwind

### Phase 4: CodeMirror Integration
- [ ] Create `Editor.tsx` component
  - [ ] Initialize CodeMirror instance
  - [ ] Set up basic extensions (lineWrapping, etc.)
  - [ ] Create ref for EditorView
  - [ ] Handle content changes → update signal
  - [ ] Limit line length with CSS (`max-width: 65ch`)
- [ ] Configure editor styling
  - [ ] Full-screen height
  - [ ] Centered content area
  - [ ] Custom theme/styling

### Phase 5: Harper.js Service
- [ ] Implement `harper-service.ts`
  - [ ] Initialize Harper.js WASM
  - [ ] Create `analyzeText()` function
  - [ ] Parse Harper.js output to `HarperIssue[]`
  - [ ] Map severity levels to colors
  - [ ] Add debouncing (300-500ms)
- [ ] Test Harper.js integration with sample text

### Phase 6: Issue Underlining
- [ ] Create `editor-extensions.ts`
  - [ ] Define decoration types for each severity
    - [ ] Error: red wavy underline
    - [ ] Warning: yellow wavy underline
    - [ ] Info: green wavy underline
  - [ ] Create StateField for decorations
  - [ ] Implement decoration builder from issues array
- [ ] Add click handler extension
  - [ ] Detect clicks on underlined text
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
  - [ ] Replace text at issue position
  - [ ] Update editor content
  - [ ] Re-run Harper.js analysis
- [ ] Handle multiple suggestions
  - [ ] Button for each suggestion
  - [ ] Preview on hover (optional)

### Phase 10: Dictionary Management
- [ ] Create `dictionary-store.ts`
  - [ ] Initialize from localStorage
  - [ ] `addWord(word: string)` function
  - [ ] `hasWord(word: string)` function
  - [ ] `getWords()` function
  - [ ] Auto-save to localStorage
- [ ] Integrate with Harper.js
  - [ ] Filter out dictionary words from issues
  - [ ] Or configure Harper.js with custom dictionary
- [ ] Implement "Add to Dictionary" action
  - [ ] Extract word from issue
  - [ ] Add to store
  - [ ] Re-analyze text
  - [ ] Update UI

### Phase 11: Copy Functionality
- [ ] Implement copy button in `TopBar.tsx`
  - [ ] Use Clipboard API
  - [ ] Copy current editor content
  - [ ] Show success feedback (toast/checkmark)
  - [ ] Handle copy errors gracefully

### Phase 12: Polish & UX
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

### Phase 13: Testing & Refinement
- [ ] Test with various text samples
- [ ] Test dictionary functionality
- [ ] Verify two-way interaction works smoothly
- [ ] Test edge cases (empty text, very long text)
- [ ] Browser compatibility check
- [ ] Performance profiling

## Key Implementation Notes

### Issue Color Mapping
```typescript
error: 'red'        // Grammar/spelling errors
warning: 'yellow'   // Style suggestions
info: 'green'       // Optional improvements
```

### CodeMirror Decorations
Use `Decoration.mark()` with custom CSS classes for underlines. Create a `StateField` that rebuilds decorations when issues change.

### Debouncing Strategy
Debounce text changes before running Harper.js to avoid excessive WASM calls. Use `setTimeout` or a reactive utility.

### Scroll Synchronization
Use CodeMirror's `EditorView.scrollIntoView()` and DOM `scrollIntoView()` for the sidebar to keep both in sync.

### localStorage Schema
```typescript
{
  "harper-custom-dictionary": ["word1", "word2", "word3"]
}
```

## Success Criteria
- ✅ Editor loads and accepts input
- ✅ Harper.js analyzes text in real-time
- ✅ Issues appear as colored underlines
- ✅ Sidebar lists all issues
- ✅ Clicking underline focuses sidebar item
- ✅ Clicking sidebar item scrolls editor
- ✅ Quick fixes apply correctly
- ✅ Custom dictionary persists
- ✅ Copy button works
- ✅ Issue count updates accurately
