import { Component, For, Show, createEffect } from 'solid-js';
import type { ParentComponent } from 'solid-js';
import type { SidebarProps } from '../types';
import IssueItem from './IssueItem';


const Kbd: ParentComponent = (props) => (
	<kbd class="inline-flex items-center whitespace-nowrap px-2 py-1 bg-(--flexoki-ui) border border-(--flexoki-ui-2) rounded text-[10px] font-mono leading-none text-(--flexoki-tx)">
		{props.children}
	</kbd>
);

interface SidebarExtendedProps extends SidebarProps {
	onClose?: () => void;
	isOpen?: boolean;
	onToggle?: () => void;
}

const Sidebar: Component<SidebarExtendedProps> = (props) => {
	// oxlint-disable-next-line no-unassigned-vars
	let containerRef!: HTMLDivElement;
	const issueRefs = new Map<string, HTMLDivElement>();

	createEffect(() => {
		const selectedId = props.selectedIssueId;
		if (selectedId) {
			const element = issueRefs.get(selectedId);
			if (element) {
				element.scrollIntoView({ behavior: 'instant', block: 'nearest' });
			}
		}
	});

	return (
		<div ref={containerRef} class="grid h-full bg-(--flexoki-bg) backdrop-blur-md" style={{
			"grid-template-rows": "min-content 1fr min-content",
		}}>
			<div class="flex items-center justify-between px-4 py-3 bg-(--flexoki-bg)">
				<div class="flex items-center gap-3">
					<h2 class="text-lg font-semibold text-(--flexoki-tx) tracking-tight">Issues</h2>
					<Show when={props.issues.length > 0}>
						<span class="inline-flex items-center justify-center min-w-8 h-6 px-2 rounded-md border border-(--flexoki-red)/40 bg-(--flexoki-red)/15 text-(--flexoki-red) text-xs font-bold tracking-wide">
							{props.issues.length}
						</span>
					</Show>
				</div>
				<Show when={props.onClose}>
					<button
						onClick={props.onClose}
						class="sm:hidden p-1 hover:bg-(--flexoki-ui-3) aspect-square rounded-md transition-colors duration-150 flex"
						aria-label="Close sidebar"
					>
						<span class="iconify lucide--x w-5 h-5 text-(--flexoki-tx-2)" />
					</button>
				</Show>
			</div>
			<div class="w-full h-full overflow-auto">
				<Show
					when={props.issues.length > 0}
					fallback={
						<div class="text-center py-12 px-4 mx-3">
							<div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-(--flexoki-ui)/50 mb-3">
								<span class="iconify lucide--check w-6 h-6 text-(--flexoki-green)" aria-hidden="true" />
							</div>
							<p class="text-sm text-(--flexoki-tx-2) font-medium">No issues found</p>
							<p class="text-xs text-(--flexoki-tx-3) mt-1.5">Start typing to see suggestions</p>
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
				<div class="sidebar-footer py-3 sticky bottom-0 bg-(--flexoki-bg) z-10 hidden sm:block">
					<div class="sidebar-shortcuts text-xs text-(--flexoki-tx-3) text-center leading-6">
						<div class="sidebar-shortcut-row">
							<Kbd>Ctrl+J</Kbd>
							<span>/</span>
							<Kbd>Ctrl+K</Kbd>
							<span>to navigate</span>
						</div>
						<div class="sidebar-shortcut-row">
							<Kbd>Ctrl+Space</Kbd>
							<span>/</span>
							<Kbd>Tab</Kbd>
							<span>/</span>
							<Kbd>Click</Kbd>
							<span>to fix</span>
						</div>
					</div>
				</div>
			</Show>
		</div>
	);
};

export default Sidebar;
