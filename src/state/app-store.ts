import { createSignal } from 'solid-js';
import type { HarperIssue } from '../types';

const [content, setContent] = createSignal<string>('');
const [issues, setIssues] = createSignal<HarperIssue[]>([]);
const [selectedIssueId, setSelectedIssueId] = createSignal<string | null>(null);
const [scrollToIssue, setScrollToIssue] = createSignal<string | null>(null);

export { content, setContent, issues, setIssues, selectedIssueId, setSelectedIssueId, scrollToIssue, setScrollToIssue };
