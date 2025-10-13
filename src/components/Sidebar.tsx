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
			<div class="p-2">
				<h2 class="text-base font-semibold text-gray-900 mb-2 px-1">Issues</h2>

				<Show
					when={props.issues.length > 0}
					fallback={<p class="text-sm text-gray-500 text-center py-4">No issues found</p>}
				>
					<div class="space-y-1">
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
			</div>
		</div>
	);
};

export default Sidebar;
