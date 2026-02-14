import { Component, For, Show, createEffect } from 'solid-js';
import type { ParentComponent } from 'solid-js';
import type { SidebarProps } from '../types';
import IssueItem from './IssueItem';


const Kbd: ParentComponent = (props) => (
	<kbd class="kbd kbd-sm">
		{props.children}
	</kbd>
);

const Sidebar: Component<SidebarProps> = (props) => {
	// oxlint-disable-next-line no-unassigned-vars
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
		<div ref={containerRef} class="grid h-full border-l border-base-300 bg-base-100/95 backdrop-blur-md max-w-100" style={{
			"grid-template-rows": "min-content 1fr min-content",
		}}>
			<div class="flex items-center justify-between px-4 py-3 bg-base-100">
				<div class="flex items-center gap-3">
					<h2 class="text-base font-semibold text-base-content tracking-tight">Issues</h2>
					<Show when={props.issues.length > 0}>
						<span class="badge badge-soft badge-outline badge-error gap-1">
							{props.issues.length}
						</span>
					</Show>
				</div>
			</div>
			<div class="w-full h-full overflow-auto">
				<Show
					when={props.issues.length > 0}
					fallback={
						<div class="text-center py-12 px-4 mx-3">
							<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-base-300/50 mb-3">
								<span class="text-2xl">✓</span>
							</div>
							<p class="text-sm text-base-content/70 font-medium">No issues found</p>
							<p class="text-xs text-base-content/50 mt-1.5">Start typing to see suggestions</p>
						</div>
					}
				>
					<div class="space-y-1.5 mx-3 mb-3">
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
			<Show when={props.issues.length > 0}>
				<div class="py-3 border-t border-base-300 sticky bottom-0 bg-base-100 z-10">
					<p class="text-xs text-base-content/50 text-center leading-6">
						<Kbd>Ctrl+J</Kbd>
						&nbsp;&nbsp;/&nbsp;&nbsp;
						<Kbd>Ctrl+K</Kbd>
						&nbsp;to navigate
						<br />
						<Kbd>Ctrl+Space</Kbd>
						&nbsp;&nbsp;/&nbsp;&nbsp;
						<Kbd>Tab</Kbd>
						&nbsp;&nbsp;/&nbsp;&nbsp;
						<Kbd>Click</Kbd>
						&nbsp;on issue to fix
					</p>
				</div>
			</Show>
		</div>
	);
};

export default Sidebar;
