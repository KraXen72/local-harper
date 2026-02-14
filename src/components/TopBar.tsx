import { Component, Show } from 'solid-js';
import type { TopBarProps } from '../types';

const TopBar: Component<TopBarProps> = (props) => {
	return (
		<div class="relative flex items-center justify-between px-4 py-2.5 border-b border-base-300 bg-base-200 backdrop-blur-sm h-14">
			<div class="flex items-center gap-3">
				<div
					class="w-2 h-2 rounded-full transition-all duration-500"
					classList={{
						'bg-success shadow-[0_0_8px_rgba(135,154,57,0.6)] animate-pulse': props.isAnalyzing,
						'bg-neutral': !props.isAnalyzing
					}}
				/>
				<div class="flex items-center">
					<span class="text-sm font-medium text-base-content/70">local-harper</span>
				</div>
			</div>

			<Show when={props.isInitializing}>
				<progress class="matter-progress-linear absolute left-0 right-0 top-0" aria-hidden="true" />
			</Show>

			<div class="flex items-center gap-2">
				<button
					onClick={props.onCopy}
					class="btn btn-accent btn-sm"
				>
					Copy Text
				</button>

				<button
					onClick={props.onToggleRuleManager}
					classList={{
						'btn btn-accent btn-sm': props.isRuleManagerOpen,
						'btn btn-ghost btn-sm': !props.isRuleManagerOpen
					}}
					aria-label="Toggle rule manager"
				>
					<span class="iconify lucide--settings w-4 h-4" />
					Rules
				</button>
			</div>
		</div>
	);
};

export default TopBar;
