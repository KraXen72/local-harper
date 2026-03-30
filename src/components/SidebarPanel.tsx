import { Component, For, Show } from 'solid-js';
import type { JSX } from 'solid-js'; 
import type { HeaderControls, HeaderButton, HeaderSelect } from '../types';

const HeaderButtonItem: Component<HeaderButton> = (props) => (
	<button
		onClick={props.action}
		class="p-1 hover:bg-(--flexoki-ui-3) aspect-square rounded-md transition-colors duration-150 flex"
		aria-label={props.label}
		title={props.label}
	>
		<span class={`iconify ${props.icon} w-5 h-5 text-(--flexoki-tx-2)`} />
	</button>
);

const HeaderSelectItem: Component<HeaderSelect> = (props) => (
	<div class="relative">
		<select
			value={props.defaultOption ?? props.options[0]?.value}
			onChange={(e) => props.onChange(e.currentTarget.value)}
			aria-label={props.label}
			title={props.label}
			class="px-2 py-1 pr-7 bg-(--flexoki-bg) h-7 text-(--flexoki-tx) text-sm rounded-md hover:bg-(--flexoki-ui-3) focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan) cursor-pointer appearance-none"
		// style={{ "height": "28px" }}
		>
			<For each={props.options}>
				{(opt) => (
					<option value={opt.value}>{opt.label}</option>
				)}
			</For>
		</select>
		<span class="iconify lucide--chevron-down w-4 h-4 text-(--flexoki-tx-2) absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
	</div>
);

interface SidebarPanelProps {
	title: string;
	onClose: () => void;
	filterText: string;
	onFilterChange: (text: string) => void;
	filterPlaceholder?: string;
	filterAddon?: JSX.Element;
	onFilterKeyDown?: JSX.EventHandler<HTMLInputElement, KeyboardEvent>;
	headerControl?: HeaderControls;
	children: JSX.Element;
}

const SidebarPanel: Component<SidebarPanelProps> = (props) => {
	return (
		<div class="h-full bg-(--flexoki-bg) grid" style={{ "grid-template-rows": "min-content min-content 1fr" }}>
			<div class="flex items-center justify-between px-4 py-3 border-b border-(--flexoki-ui-2)">
				<h2 class="text-lg font-semibold text-(--flexoki-tx)">{props.title}</h2>
				<div class="flex items-center gap-1">
					<For each={props.headerControl}>
						{(control) => (
							<Show
								when={control.type === 'button'}
								fallback={<HeaderSelectItem {...(control as HeaderSelect)} />}
							>
								<HeaderButtonItem {...(control as HeaderButton)} />
							</Show>
						)}
					</For>
					<button
						onClick={props.onClose}
						class="p-1 hover:bg-(--flexoki-ui-3) aspect-square rounded-md transition-colors duration-150 flex"
						aria-label={`Close ${props.title}`}
					>
						<span class="iconify lucide--x w-5 h-5 text-(--flexoki-tx-2)" />
					</button>
				</div>
			</div>

			<div class="px-3 py-3 border-b border-(--flexoki-ui-2) flex gap-2">
				<div class="relative flex-1">
					<input
						type="text"
						value={props.filterText}
						onInput={(e) => props.onFilterChange(e.currentTarget.value)}
						onKeyDown={props.onFilterKeyDown}
						placeholder={props.filterPlaceholder ?? 'Filter...'}
						aria-label={props.filterPlaceholder ?? 'Filter...'}
						class="w-full px-3 py-2 bg-(--flexoki-bg) border border-(--flexoki-ui-2) rounded-md text-sm text-(--flexoki-tx) placeholder-(--flexoki-tx-3) focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan) focus:border-transparent"
					/>
					<Show when={props.filterText}>
						<button
							onClick={() => props.onFilterChange('')}
							class="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-(--flexoki-ui-3) rounded transition-colors flex items-center"
							aria-label="Clear filter"
						>
							<span class="iconify lucide--x text-lg text-(--flexoki-tx-3)" />
						</button>
					</Show>
				</div>
				{props.filterAddon}
			</div>

			<div class="overflow-y-auto py-3 ps-3 pe-1 min-h-0 sidebar-panel-scroller">
				{props.children}
			</div>
		</div>
	);
};

export default SidebarPanel;
