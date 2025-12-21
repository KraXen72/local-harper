// src/services/harper-service.ts (simplified)
import { WorkerLinter, binary, Dialect } from 'harper.js';
import type { Lint, LintConfig } from 'harper.js';
import type { HarperIssue } from '../types';
import { IssueSeverity } from '../types';

let linter: WorkerLinter | null = null;

// Simple initialization
export async function initHarper() {
  if (linter) return linter;
  
  const savedDialect = parseInt(localStorage.getItem('harper-dialect') || '0', 10);
  const dialect = [Dialect.American, Dialect.British, Dialect.Australian, Dialect.Canadian].includes(savedDialect) 
    ? savedDialect 
    : Dialect.American;
  
  linter = new WorkerLinter({ binary, dialect });
  await linter.setup();
  
  // Load custom dictionary
  const customWords = JSON.parse(localStorage.getItem('harper-custom-words') || '[]');
  if (customWords.length > 0) {
    await linter.importWords(customWords);
  }
  
  // Load config
  const savedConfig = localStorage.getItem('harper-lint-config');
  if (savedConfig) {
    try {
      await linter.setLintConfig(JSON.parse(savedConfig));
    } catch (e) {
      console.error('Failed to load config', e);
    }
  }
  
  return linter;
}

// Direct analysis function
export async function analyzeText(text: string): Promise<HarperIssue[]> {
  if (!linter) {
    throw new Error('Harper not initialized');
  }
  
  if (!text.trim()) return [];
  
  const organizedLints = await linter.organizedLints(text);
  return transformLints(organizedLints);
}

// Simple transform function
function transformLints(organizedLints: Record<string, Lint[]>): HarperIssue[] {
  const issues: HarperIssue[] = [];
  
  for (const [rule, lints] of Object.entries(organizedLints)) {
    for (const lint of lints) {
      issues.push({
        id: crypto.randomUUID(),
        lint,
        severity: mapLintKindToSeverity(lint),
        rule
      });
    }
  }
  
  // Sort by position
  issues.sort((a, b) => a.lint.span().start - b.lint.span().start);
  return issues;
}

// Simple mapping function
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

// Configuration management
export async function setRuleEnabled(ruleName: string, enabled: boolean) {
  if (!linter) return;
  
  const config = await linter.getLintConfig();
  config[ruleName] = enabled;
  await linter.setLintConfig(config);
  localStorage.setItem('harper-lint-config', JSON.stringify(config));
}

export async function setDialect(dialect: Dialect) {
  if (!linter) return;
  await linter.setDialect(dialect);
  localStorage.setItem('harper-dialect', dialect.toString());
}

export async function addWordToDictionary(word: string) {
  if (!linter) return;
  
  const words = JSON.parse(localStorage.getItem('harper-custom-words') || '[]');
  if (!words.includes(word)) {
    words.push(word);
    localStorage.setItem('harper-custom-words', JSON.stringify(words));
    await linter.importWords(words);
  }
}

// Export helpers
export { getLinter };

function getLinter() {
  if (!linter) throw new Error('Harper not initialized');
  return linter;
}