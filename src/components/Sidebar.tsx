import { Component, For, Show, createEffect } from 'solid-js';
import type { SidebarProps } from '../types';
import IssueItem from './IssueItem';

const Sidebar: Component<SidebarProps> = (props) => {
	let containerRef!: HTMLDivElement;
	const issueRefs = new Map<string, HTMLDivElement>();

	// Scroll to selected issue in sidebar
	createEffect(() => {
		const selectedId = props.selectedIssueId;
		if (selectedId) {
			const element = issueRefs.get(selectedId);
			if (element) {
				element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
			}
		}
	});

	return (
		<div ref={containerRef} class="w-80 h-full border-l border-gray-300 bg-gray-50 overflow-auto">
			<div class="p-3">
				<h2 class="text-base font-semibold text-gray-900 mb-3 px-1">Issues</h2>

				<Show
					when={props.issues.length > 0}
					fallback={
						<div class="text-center py-8">
							<p class="text-sm text-gray-500">No issues found</p>
							<p class="text-xs text-gray-400 mt-1">Start typing to see suggestions</p>
						</div>
					}
				>
					<div class="space-y-2">
						<For each={props.issues}>
							{(issue) => (
								<div ref={(el) => issueRefs.set(issue.id, el)}>
									<IssueItem
										issue={issue}
										isSelected={props.selectedIssueId === issue.id}
										onSelect={props.onIssueSelect}
										onApplySuggestion={(suggestion) => props.onApplySuggestion(issue.id, suggestion)}
										onAddToDictionary={props.onAddToDictionary}
									/>
								</div>
							)}
						</For>
					</div>
				</Show>

				<Show when={props.issues.length > 0}>
					<div class="mt-4 pt-3 border-t border-gray-300">
						<p class="text-xs text-gray-500 text-center">
							Press <kbd class="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono">n</kbd> /
							<kbd class="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono ml-1">p</kbd> to navigate
							<br />
							<kbd class="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs font-mono mt-1 inline-block">Enter</kbd> to apply first suggestion
						</p>
					</div>
				</Show>
			</div>
		</div>
	);
};

export default Sidebar;
