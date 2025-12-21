import { WorkerLinter, binary, Dialect } from 'harper.js';
import { store, actions } from '../store';

let linter: WorkerLinter | null = null;
let initPromise: Promise<void> | null = null;

export async function initHarper() {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      linter = new WorkerLinter({
        binary,
        dialect: Dialect.American,
      });
      await linter.setup();
      runLint();
    } catch (err) {
      console.error("Failed to initialize Harper:", err);
    }
  })();

  return initPromise;
}

export async function runLint() {
  if (!linter || !store.text) return;
  
  actions.setIsLinting(true);
  try {
    const rawLints = await linter.lint(store.text, store.config);
    
    // Sanitize raw worker data (which has no methods) into a clean shape
    const issues = rawLints.map((raw: any, idx) => {
      // Access properties directly. Fallback to snake_case if camelCase is missing.
      const span = raw.span?.() ?? raw.span; 
      // Note: If span is still an object/array, ensure it has start/end. 
      // Harper usually returns { start, end } or [start, end]. 
      // Let's normalize it:
      const safeSpan = {
        start: span.start ?? span[0],
        end: span.end ?? span[1]
      };

      const kind = raw.lint_kind ?? raw.kind; 
      const message = raw.message;
      const suggestions = raw.suggestions ?? [];

      return {
        id: `issue-${idx}`,
        // Create a simplified 'lint' object that components can use safely
        lint: {
          kind: () => kind, // Keep as function to match existing component logic if preferred, or cleaner to make it a property. 
          // Let's make it a property for our new simplified components, 
          // but if we want to support the simplified Editor I gave you:
          // The Editor used `.kind()`. I will change the Editor to use `.kind` property.
          kind: kind, 
          message: message,
          span: safeSpan, 
          suggestions
        }
      };
    });
    
    actions.setIssues(issues);
  } catch (err) {
    console.error("Linting failed:", err);
  } finally {
    actions.setIsLinting(false);
  }
}
