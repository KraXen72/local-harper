import { createStore } from 'solid-js/store';
import { LintConfig } from 'harper.js';
import { HarperIssue } from '.';

export const [store, setStore] = createStore({
  text: "",
  issues: [] as HarperIssue[],
  focusedIssueId: null as string | null,
  isLinting: false,
  config: {
    // Default config defaults
    language: 'en',
    curseWords: true,
    // ... add other defaults as necessary
  } as LintConfig
});

export const actions = {
  setText: (text: string) => setStore('text', text),
  setIssues: (issues: HarperIssue[]) => setStore('issues', issues),
  setFocus: (id: string | null) => setStore('focusedIssueId', id),
  updateConfig: (key: keyof LintConfig, value: any) => 
    setStore('config', (c) => ({ ...c, [key]: value })),
  setIsLinting: (val: boolean) => setStore('isLinting', val)
};
