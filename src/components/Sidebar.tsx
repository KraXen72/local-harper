import { Component, For, Show, createEffect } from 'solid-js';
import type { HarperIssue } from '../types';
import { lintKindColor } from '../utils/lint-kind-colors';

interface SidebarProps {
	issues: HarperIssue[];
	selectedIssueId: string | null;
	onIssueSelect: (id: string) => void;
}

const Sidebar: Component<SidebarProps> = (props) => {
	const itemRefs = new Map<string, HTMLDivElement>();

	// Auto-scroll to selected issue
	createEffect(() => {
		if (props.selectedIssueId) {
			const el = itemRefs.get(props.selectedIssueId);
			if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
		}
	});

	return (
		<div class="h-full flex flex-col border-r border-(--flexoki-ui-2) bg-(--flexoki-bg-2)/50 backdrop-blur">
		{/* Header */}
		<div class="p-4 border-b border-(--flexoki-ui-2) flex justify-between items-center bg-(--flexoki-bg)">
		<h2 class="font-semibold text-(--flexoki-tx)">Issues</h2>
		<Show when={props.issues.length > 0}>
		<span class="px-2 py-0.5 rounded text-xs font-bold bg-(--flexoki-red)/20 text-(--flexoki-red) border border-(--flexoki-red)/30">
		{props.issues.length}
		</span>
		</Show>
		</div>

		{/* Issue List */}
		<div class="flex-1 overflow-y-auto p-3 space-y-2">
		<Show
		when={props.issues.length > 0}
		fallback={
			<div class="text-center p-8 mt-10">
			<div class="w-10 h-10 mx-auto rounded-full bg-(--flexoki-ui)/50 flex items-center justify-center mb-3 text-lg">✓</div>
			<p class="text-sm text-(--flexoki-tx-2) font-medium">No issues found</p>
			<p class="text-xs text-(--flexoki-tx-3) mt-1">Start typing to see suggestions</p>
			</div>
		}
		>
		<For each={props.issues}>{(issue) => (
			<div
			ref={(el) => itemRefs.set(issue.id, el)}
			onClick={() => props.onIssueSelect(issue.id)}
			class={`p-3 rounded-md cursor-pointer transition-all border ${
				props.selectedIssueId === issue.id
				? 'bg-(--flexoki-cyan)/10 border-(--flexoki-cyan)/30 shadow-sm translate-x-0.5'
				: 'bg-(--flexoki-ui)/30 border-transparent hover:bg-(--flexoki-ui)'
			}`}
			>
			<div class="flex items-center gap-2 mb-1.5">
			<div class="w-2 h-2 rounded-full shrink-0" style={{ "background-color": lintKindColor(issue.lint.lint_kind()) }} />
			<span class="text-[11px] uppercase tracking-wider text-(--flexoki-tx-2) font-medium truncate">
			{issue.rule}
			</span>
			</div>
			<div class="text-sm text-(--flexoki-tx) leading-snug">
			{issue.lint.message()}
			</div>
			</div>
		)}</For>
		</Show>
		</div>

		{/* Footer / Shortcuts */}
		<Show when={props.issues.length > 0}>
		<div class="p-3 border-t border-(--flexoki-ui-2) text-xs text-(--flexoki-tx-3) text-center bg-(--flexoki-bg)">
		<kbd class="px-1.5 py-0.5 bg-(--flexoki-ui) rounded text-[10px] font-mono border border-(--flexoki-ui-2)">Ctrl+J/K</kbd> to navigate
		<span class="mx-2">&middot;</span>
		<kbd class="px-1.5 py-0.5 bg-(--flexoki-ui) rounded text-[10px] font-mono border border-(--flexoki-ui-2)">Tab</kbd> to fix
		</div>
		</Show>
		</div>
	);
};

export default Sidebar;
