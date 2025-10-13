# Harper.js Integration Notes

## Research Summary

After reviewing the official Harper.js documentation (via context7) and GitHub repository, here are the key findings that have been incorporated into our type definitions and spec:

## Key API Details

### Environment Considerations

We're building a **Vite + SolidJS web app** that will be:
- Developed locally with `pnpm dev` (Vite dev server)
- Built with `pnpm build` 
- Deployed to GitHub Pages (static hosting)

This means we're in a **browser environment**, not Node.js.

### Linter Implementations

Harper.js provides two linter classes:

1. **`WorkerLinter`** (RECOMMENDED for browser)
   - Runs in a Web Worker
   - Non-blocking, doesn't impact UI performance
   - Best for interactive web applications
   - **This is what we'll use**
   - Only works in browser (uses Web Worker APIs)

2. **`LocalLinter`** 
   - Runs in main event loop
   - Blocking operation during linting
   - Can cause high LCP (Largest Contentful Paint)
   - Works in both Node.js and browser
   - Only use if WorkerLinter causes issues

### Core API

```typescript
import { WorkerLinter, binary, Dialect } from 'harper.js';

// Initialize once (for browser/web app)
const linter = new WorkerLinter({
  binary,  // Import from harper.js
  dialect: Dialect.American,  // Optional, defaults to American
});

// Optionally call setup early (e.g., during app load)
await linter.setup();

// Lint text (returns Promise<Lint[]>)
const lints = await linter.lint(text, {
  language: 'plaintext' // or 'markdown'
});

// Configure rules
await linter.setLintConfig({
  SpellCheck: true,
  SentenceCapitalization: false,
  LongSentences: true,
  // ... other rules (all boolean or null)
});
```

### Harper Lint Class API

Harper returns `Lint` class instances (not plain objects). Each has these methods:

```typescript
class Lint {
  span(): Span;                      // Get { start: number, end: number }
  message(): string;                 // Get description
  message_html(): string;            // Get description as HTML
  lint_kind(): string;               // e.g., "Spelling", "Grammar"
  lint_kind_pretty(): string;        // Pretty version
  suggestion_count(): number;        // Number of suggestions
  suggestions(): Suggestion[];       // Get array of Suggestion objects
  get_problem_text(): string;        // Get the problematic text
}

class Span {
  start: number;  // Character position (0-indexed)
  end: number;    // Character position (0-indexed)
}

class Suggestion {
  get_replacement_text(): string;  // Text to replace with (or empty for Remove)
  kind(): SuggestionKind;          // Replace (0) or Remove (1)
}
```

**Important Notes:**
- Lints are **class instances with methods**, not plain objects
- Use `lint.span()` to get positions (it's a method, not a property)
- Use `lint.message()` to get the description (method call)
- Use `lint.suggestions()` to get array of Suggestion instances
- Spans use **character positions**, not line/column numbers
- These positions map directly to CodeMirror's position system

## Available Lint Rules

The `LintConfig` type is `Record<string, boolean | null>`. You can get the default config:

```typescript
const defaultConfig = await linter.getDefaultLintConfig();
// Returns object with all available rules
```

Common rules include:
- `SpellCheck` - Detects spelling errors
- `SpelledNumbers` - Numbers that should be spelled out  
- `AnA` - Incorrect use of a/an articles
- `SentenceCapitalization` - Sentence capitalization issues
- `UnclosedQuotes` - Missing closing quotes
- `WrongQuotes` - Incorrect quote types
- `LongSentences` - Overly long sentences
- `RepeatedWords` - Duplicate words
- `Spaces` - Spacing issues
- `Matcher` - Pattern matching rules
- `CorrectNumberSuffix` - Number suffix errors (1st, 2nd, 3rd, etc.)

Each rule can be:
- `true` - enabled
- `false` - disabled  
- `null` - use default behavior

## Dialect Support

Harper supports multiple English dialects via the `Dialect` enum:

```typescript
import { Dialect } from 'harper.js';

Dialect.American   // 0
Dialect.British    // 1
Dialect.Australian // 2
Dialect.Canadian   // 3
```

Set dialect during initialization:
```typescript
const linter = new WorkerLinter({
  binary,
  dialect: Dialect.British,
});
```

Or change it later:
```typescript
await linter.setDialect(Dialect.Canadian);
```

## Custom Dictionary Support

**Good news!** Harper.js DOES support custom dictionaries via the Linter interface:

```typescript
// Import words into the dictionary
await linter.importWords(['myword', 'anotherword', 'somename']);

// Export all added words
const words = await linter.exportWords();

// Clear custom words (doesn't affect curated dictionary)
await linter.clearWords();
```

**Implementation approach:**
1. Load custom words from localStorage on app init
2. Import them into the linter with `importWords()`
3. When user adds a word, both:
   - Add to localStorage
   - Import into linter with `importWords([word])`
4. Periodically sync: `exportWords()` → save to localStorage

This is better than client-side filtering because Harper won't even report these words as issues.

## Updated Type Definitions

### Using Harper's Native Types

We import types directly from harper.js instead of redefining them:

```typescript
// src/types/index.ts
import type {
  Lint,           // The lint class
  Span,           // Position span class
  Suggestion,     // Suggestion class
  LintConfig,     // Record<string, boolean | null>
  Linter,         // Linter interface
  LinterInit,     // Init options
  LintOptions,    // Lint call options
} from 'harper.js';

export type { Lint, Span, Suggestion, LintConfig, Linter, LinterInit, LintOptions };
export { Dialect, SuggestionKind } from 'harper.js';
```

### Application Types

We wrap Harper's Lint with our own metadata:

```typescript
export enum IssueSeverity {
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

export interface HarperIssue {
  id: string;              // Generated unique ID for UI tracking
  lint: Lint;              // The actual Harper Lint instance
  severity: IssueSeverity; // Mapped from lint.lint_kind()
}
```

This approach:
- Avoids duplication and type mismatches
- Keeps the full Lint object with all its methods
- Allows us to call `issue.lint.message()`, `issue.lint.span()`, etc.
- Simplifies applying suggestions via `linter.applySuggestion()`

## Severity Mapping Strategy

We need to map Harper's `lint_kind()` to our UI severity levels:

### Recommended Approach: Use lint_kind()

```typescript
import type { Lint } from 'harper.js';
import { IssueSeverity } from './types';

function mapToSeverity(lint: Lint): IssueSeverity {
  const kind = lint.lint_kind().toLowerCase();
  
  // Spelling and Grammar are critical
  if (kind.includes('spelling') || kind.includes('grammar')) {
    return IssueSeverity.Error;    // Red underline
  }
  
  // Punctuation is important
  if (kind.includes('punctuation')) {
    return IssueSeverity.Warning;  // Yellow/orange underline
  }
  
  // Style and readability are suggestions
  return IssueSeverity.Info;       // Blue underline
}
```

This gives us:
- **Error (Red)**: Spelling, Grammar - things that are objectively wrong
- **Warning (Yellow/Orange)**: Punctuation - things that should be fixed
- **Info (Blue)**: Style, Readability - suggestions for improvement

## Implementation Recommendations

1. **Initialization**: Create singleton `WorkerLinter` instance in `harper-service.ts`
   ```typescript
   import { WorkerLinter, binary, Dialect } from 'harper.js';
   
   let linter: WorkerLinter | null = null;
   
   export async function initHarper() {
     if (!linter) {
       linter = new WorkerLinter({ binary, dialect: Dialect.American });
       await linter.setup();
       
       // Load custom dictionary from localStorage
       const customWords = loadDictionaryFromStorage();
       if (customWords.length > 0) {
         await linter.importWords(customWords);
       }
       
       // Load lint config from localStorage
       const config = loadConfigFromStorage();
       if (config) {
         await linter.setLintConfig(config);
       }
     }
     return linter;
   }
   
   export function getLinter() {
     if (!linter) throw new Error('Harper not initialized');
     return linter;
   }
   ```

2. **Debouncing**: 300-500ms debounce on text changes is sufficient since WorkerLinter is non-blocking

3. **Position Mapping**: Harper's `Span` positions are character-based and directly compatible with CodeMirror
   ```typescript
   const span = lint.span();
   // span.start and span.end are direct character offsets
   ```

4. **Overlapping Issues**: When multiple issues overlap, CodeMirror will handle layering automatically

5. **Custom Dictionary**: Use Harper's built-in `importWords()` / `exportWords()` API

6. **Configuration Persistence**: 
   - Store `LintConfig` in localStorage
   - Store `Dialect` in localStorage
   - Store custom words in localStorage
   - Load and apply all on startup

7. **Applying Suggestions**: Use the built-in method
   ```typescript
   const newText = await linter.applySuggestion(text, lint, suggestion);
   // Update editor with newText
   ```

## Testing Considerations

- Test with long documents to ensure WorkerLinter performance
- Test overlapping issues (e.g., spelling error in long sentence)
- Verify character position accuracy with multi-byte Unicode characters
- Test all lint rule combinations
- Verify dictionary filtering works correctly

## Resources

- Harper.js Documentation: https://writewithharper.com/docs/harperjs/node
- GitHub Repository: https://github.com/automattic/harper
- Context7 Library ID: `/automattic/harper`
