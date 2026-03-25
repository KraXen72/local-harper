import { Component, Show } from 'solid-js';
import type { TopBarProps } from '../types';

const TopBar: Component<TopBarProps> = (props) => {
	return (
		<div class="relative flex items-center justify-between px-4 py-2.5 border-b border-(--flexoki-ui-2) bg-(--flexoki-bg-2) backdrop-blur-sm h-14">
			<div class="flex items-center gap-3">
				<div
					class="w-2 h-2 rounded-full transition-all duration-500"
					classList={{
						'bg-[var(--flexoki-green)] shadow-[0_0_8px_rgba(135,154,57,0.6)] animate-pulse': props.isAnalyzing,
						'bg-[var(--flexoki-tx-3)]': !props.isAnalyzing
					}}
				/>
				<div class="flex items-center">
					<span class="text-sm font-medium text-(--flexoki-tx-2)">local-harper</span>
				</div>
			</div>

			<Show when={props.isInitializing}>
				<progress class="matter-progress-linear absolute left-0 right-0 top-0" aria-hidden="true" />
			</Show>

			<div class="flex items-center gap-2">
				<button
					onClick={props.onCopy}
					class="aspect-square w-8 flex justify-center items-center cursor-pointer hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-(--flexoki-bg-2)"
					classList={{
						'bg-[var(--flexoki-cyan)] focus:ring-[var(--flexoki-cyan)]': true,
					}}
					aria-label="Copy text"
				>
					<span class="iconify lucide--copy w-4 h-4" />
				</button>

				<Show when={props.onToggleSidebar}>
					<button
						onClick={props.onToggleSidebar}
						class="md:hidden top-icon-button flex"
						classList={{
							'bg-[var(--flexoki-cyan)] focus:ring-[var(--flexoki-cyan)]': props.isSidebarOpen,
							'bg-[var(--flexoki-ui-3)] text-[var(--flexoki-tx-2)] focus:ring-[var(--flexoki-ui-3)]': !props.isSidebarOpen
						}}
						aria-label="Toggle sidebar"
					>
						<span class="iconify lucide--list w-4 h-4" />
						<span class="text-sm">Issues</span>
					</button>
				</Show>

				<button
					onClick={props.onToggleDictManager}
					class="top-icon-button top-icon-button-ltsm-square flex"
					classList={{
						'bg-[var(--flexoki-cyan)] focus:ring-[var(--flexoki-cyan)]': props.isDictManagerOpen,
						'bg-[var(--flexoki-ui-3)] text-[var(--flexoki-tx-2)] focus:ring-[var(--flexoki-ui-3)]': !props.isDictManagerOpen
					}}
					aria-label="Toggle dictionary manager"
				>
					<span class="iconify lucide--book w-4 h-4" />
					<span class="text-sm top-icon-button-title">Dict</span>
				</button>

				<button
					onClick={props.onToggleRuleManager}
					class="top-icon-button top-icon-button-ltsm-square flex"
					classList={{
						'bg-[var(--flexoki-cyan)] focus:ring-[var(--flexoki-cyan)]': props.isRuleManagerOpen,
						'bg-[var(--flexoki-ui-3)] text-[var(--flexoki-tx-2)] focus:ring-[var(--flexoki-ui-3)]': !props.isRuleManagerOpen
					}}
					aria-label="Toggle rule manager"
				>
					<span class="iconify lucide--settings w-4 h-4" />
					<span class="text-sm top-icon-button-title">Rules</span>
				</button>
			</div>
		</div>
	);
};

export default TopBar;
