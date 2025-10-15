# GUI Rule Manager Implementation Plan

## Overview

Implement a comprehensive GUI rule manager that allows users to enable/disable Harper.js linting rules through a visual interface with live reload, fuzzy search, and import/export capabilities.

---

## Phase 1: Dependencies and Types

### 1.1 Install uFuzzy Package

```bash
pnpm add @leeoniya/ufuzzy valibot
pnpm add -D @iconify-json/lucide
```

### 1.2 Add TypeScript Types

**Task:** Define types for rule manager in `src/types/index.ts`

- Add `RuleManagerProps` interface
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onRuleToggle: (ruleName: string, enabled: boolean) => void`
  - `currentConfig: LintConfig`
- Add `RuleInfo` interface
  - `name: string` (original PascalCase name)
  - `displayName: string` (human-readable name)
  - `enabled: boolean`
- Update `TopBarProps` to include:
  - `isRuleManagerOpen: boolean`
  - `onToggleRuleManager: () => void`

---

## Phase 2: Utility Functions

### 2.2 Add Rule Config Utilities to Harper Service

**Task:** Extend `src/services/harper-service.ts`

- Add `initializeDefaultRuleConfig(): Promise<LintConfig>`
	- Get default config from Harper
	- unify: make an object/map/array of rules which are disabled by default (right now: `avoidCurses`)
		- this will get used for both initializing the harper instance (if no settings were overridden), and creating the settings if they don't exist right now. -> Save to localStorage if no config exists
	- Return the config
- Add `updateSingleRule(ruleName: string, enabled: boolean): Promise<void>`
	- Get current config
	- Update specific rule
	- Save to localStorage
	- Apply to linter via `setLintConfig`
- Add `exportRuleConfig(): string`
	- add a version field in the export
	- Get current config from localStorage
	- Return JSON string (pretty-printed with 2 spaces)
- Add `importRuleConfig(jsonString: string): Promise<void>`
	- add a version field in the import
	- Parse JSON string
	- Validate structure (object with boolean values)
		- use valibot, and surface import errors with v.summarize()
	- Save to localStorage
	- Apply to linter via `setLintConfig`
	- Throw error if invalid

---

## Phase 3: RuleManager Component

### 3.1 Create RuleManager Component Structure

**Task:** Create `src/components/RuleManager.tsx`

- Similar layout structure to `Sidebar.tsx`
- Three-section grid layout:
	1. Header (h2 + close button)
	2. Controls (filter search + import/export buttons)
	3. Scrollable rule list
- initially, use the same css grid layout as in the current sidebar, adapt as needed.
- Use same styling patterns as left sidebar (Flexoki theme)
- Make it conditionally rendered based on `isOpen` prop

### 3.2 Implement Component Header

**Task:** Add header section to RuleManager

- H2 heading: "Rule Manager"
- Style: Match `Sidebar.tsx` header styling

### 3.3 Implement Filter Search Bar

**Task:** Add search functionality

- Create controlled input component
- Placeholder: "filter rules..."
- Styling: Match Flexoki theme
- Clear button (X icon) when text is present

### 3.4 Implement Import/Export Buttons

**Task:** Add import/export controls below search bar

- Two buttons side by side (flex layout)
- Export Button:
  - Label: "Export Rules"
  - Icon: Download/arrow-down icon
  - onClick: Export current config as JSON file
  - Use `URL.createObjectURL` + download link trick
  - Filename: `harper-rules-${timestamp}.json`
- Import Button:
  - Label: "Import Rules"
  - Icon: Upload/arrow-up icon
  - Use hidden file input with `accept=".json"`
  - Parse and validate imported JSON
  - Show error message if invalid (toast/alert)
  - Apply imported config immediately
- Button styling:
  - Primary style (cyan background)
  - Hover effects (brightness increase)
  - Active state (scale down)
  - Match `TopBar.tsx` button styling

### 3.5 Implement Rule List with Fuzzy Search

**Task:** Create filtered and searchable rule list

- Convert `LintConfig` object to `RuleInfo[]` array
- Apply fuzzy search with uFuzzy when `filterText` is not empty
- Search in `displayName` (human-readable format)
- Sort by uFuzzy score (best matches first)
- Use `<For>` to render rules
- Empty state: "No rules match your filter" when filtered list is empty

### 3.6 Create Rule Toggle Items

**Task:** Individual rule list-item component (card) (separate tsx file)

- Each item displays:
  - Rule name (however it's called in harper verbatim)
  - Toggle switch (checkbox styled as switch)
  - Optional: Show rule name in smaller text below display name
- Layout:
  - Flex row with space-between
  - Toggle on the right
  - Padding and hover effects
- Toggle implementation:
  - Use native checkbox with custom styling
  - Or use a styled switch component
  - Call `onRuleToggle` when changed
- Styling:
	- flexoki
  	- Border radius: Match IssueItem style
  	- Smooth transitions
- Active/checked state visual feedback:
  - Enabled: Cyan/green indicator
  - Disabled: Gray/muted indicator

---

## Phase 4: Integration with App

### 4.1 Update TopBar Component

**Task:** Add rule manager toggle button to `TopBar.tsx`

- Add new button right of the "Copy Text" button. use lucide gear icon.
- Label: "Rules"
- Active state visual feedback when rule manager is open
  - Different background color or border
  - Or add a small indicator dot
- Pass `isRuleManagerOpen` and `onToggleRuleManager` props
- Update `TopBarProps` type

### 4.2 Update App.tsx State Management

**Task:** Add rule manager state to main App component

- Create signal: `isRuleManagerOpen` (boolean, default: false)
- Create handler: `toggleRuleManager`
- Load current lint config on mount (already initialized)
- Create handler: `handleRuleToggle(ruleName: string, enabled: boolean)`
  - Call `updateSingleRule` from harper-service
  - Trigger re-analysis of current text
  - Follow same pattern as `handleAddToDictionary`

### 4.3 Update App.tsx Layout Grid

**Task:** Modify layout to support conditional right sidebar

- Current: 3-column grid (left sidebar, editor, empty space)
- Change to: Dynamic grid based on `isRuleManagerOpen`
  - When closed: Same as current (left, editor, empty)
  - When open: (left, editor, rule-manager)
- Grid template columns:

  ```
  Closed: "minmax(300px, 1fr) minmax(72ch, 2fr) minmax(0, 1fr)"
  Open:   "minmax(300px, 1fr) minmax(72ch, 2fr) minmax(300px, 1fr)"
  ```

- Use dynamic `classList` or inline style with conditional

### 4.4 Pass Props to RuleManager

**Task:** Render and wire up RuleManager component

- Render in third column (conditional using `<Show>` based on `isRuleManagerOpen`)
- Pass props.
- Create signal: `currentLintConfig` (LintConfig | null)
- Load initial config in `onMount` after Harper initialization
- Update config after any rule toggle

---

## Phase 5: Live Reload Implementation

### 5.1 Implement Rule Change Effect

**Task:** Re-lint text when rules change

- In `handleRuleToggle`:
  1. Call `updateSingleRule(ruleName, enabled)`
  2. Update `currentLintConfig` signal
  3. Trigger harper's text re-analysis with new config
  4. Use same pattern as `handleAddToDictionary`:

- Should be seamless and fast (no full page reload)

### 5.2 Handle Import Config Reload

**Task:** Re-lint after importing config

- In import handler (RuleManager):
  1. Validate and import config
  2. Call `onRuleToggle` for each changed rule (or add `onConfigImport` callback)
  3. Or: Call parent's config reload function
  4. Re-analyze text with new ruleset
- Show success message/toast after import

---

## Phase 6: Polish and Edge Cases

### 6.2 Error Handling

**Task:** Handle errors in import/export and rule toggling

- Try-catch blocks around all async operations
- User-friendly error messages using v.summarize() from valibot.
- inline error messages instead of rule list, with a dismiss button.

### 6.3 Accessibility

**Task:** Ensure components are accessible
- Proper ARIA labels on toggle switches
- Keyboard navigation support
- Focus management (when opening/closing sidebar)
- Screen reader announcements for rule changes

### 6.4 Responsive Design

**Task:** Ensure rule manager works on different screen sizes
- Min-width for rule manager panel
- Ensure buttons don't overflow

### 6.5 Persistence Verification

**Task:** Verify localStorage persistence works correctly

- Initial load: Rules should match saved config
- After toggle: Config should persist across page reloads
- After import: New config should be saved
---

## Phase 7: Testing and Refinement

### 7.1 Manual Testing Checklist

- [ ] Open/close rule manager from TopBar button
- [ ] Toggle individual rules and verify text is re-linted
- [ ] Filter rules with various search terms (case-insensitive, fuzzy)
- [ ] Export rules to JSON file
- [ ] Import rules from JSON file (valid and invalid)
- [ ] Verify PascalCase to words conversion is correct
- [ ] Test with empty text
- [ ] Test with many issues (performance)
- [ ] Reload page and verify rules persist
- [ ] Toggle AvoidCurses and verify curses appear/disappear in text
- [ ] Test keyboard navigation (if implemented)

### 7.2 Edge Cases to Test

- [ ] Import malformed JSON
- [ ] Import JSON with unknown rule names
- [ ] Import JSON with non-boolean values
- [ ] Very long rule names (UI overflow)
- [ ] Many rules enabled/disabled at once
- [ ] Search with special characters
- [ ] Empty filter results
- [ ] Race conditions: Toggle rule while analysis is in progress

### 7.3 Performance Considerations

- [ ] Debounce search input (already planned)
- [ ] Memo/derive filtered rules list efficiently
- [ ] Avoid unnecessary re-renders
- [ ] Test with large text content (10k+ words)

---

## Technical Notes

### uFuzzy Configuration
search should be case-insensitive (probably is by default too).

```typescript
import uFuzzy from '@leeoniya/ufuzzy';

// you're free to use other values, by default, don't specify them to leave defaults.
// you can see a bunch of different setups in ufuzzy's readme
// https://github.com/leeoniya/uFuzzy/blob/main/README.md visit and read


const uf = new uFuzzy({
  intraMode: 1,    // How to handle term matches
  intraIns: 1,     // Cost of insertions within terms
  intraSub: 1,     // Cost of substitutions within terms
  intraTrn: 1,     // Cost of transpositions within terms
  intraDel: 1,     // Cost of deletions within terms
});

// Usage
const haystack = rules.map(r => r.displayName);
const idxs = uf.filter(haystack, filterText);
const info = uf.info(idxs, haystack, filterText);
const order = uf.sort(info, haystack, filterText);
const filteredRules = order.map(i => rules[info.idx[i]]);
```

### PascalCase Splitting Algorithm
might be useful for u-fuzzy if it has trouble matching otherwise.

```typescript
export function pascalCaseToWords(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // lowercase followed by uppercase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')  // handle acronyms
    .trim();
}

// Examples:
// "AvoidCurses" → "Avoid Curses"
// "LongSentence" → "Long Sentence"
// "URLChecker" → "URL Checker"
```

