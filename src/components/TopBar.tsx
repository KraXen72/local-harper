import { Component } from 'solid-js';
import type { TopBarProps } from '../types';

const TopBar: Component<TopBarProps> = (props) => {
	return (
		<div class="flex items-center justify-between px-4 py-2.5 border-b border-(--flexoki-ui-2) bg-(--flexoki-bg-2) backdrop-blur-sm h-14">
			<div class="flex items-center gap-3">
				<div
					class="w-2 h-2 rounded-full transition-all duration-500"
					classList={{
						'bg-(--flexoki-green) shadow-[0_0_8px_rgba(135,154,57,0.6)] animate-pulse': props.isAnalyzing,
						'bg-(--flexoki-tx-3)': !props.isAnalyzing
					}}
				/>
				<span class="text-sm font-medium text-(--flexoki-tx-2)">
					local-harper
				</span>
			</div>

			<div class="flex items-center gap-2">
				<button
					onClick={props.onCopy}
					class="px-4 py-1.5 bg-(--flexoki-cyan) cursor-pointer hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan) focus:ring-offset-2 focus:ring-offset-(--flexoki-bg-2)"
				>
					Copy Text
				</button>
				
				<button
					onClick={props.onToggleRuleManager}
					class="px-4 py-1.5 cursor-pointer hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-(--flexoki-bg-2)"
					classList={{
						'bg-(--flexoki-cyan) focus:ring-(--flexoki-cyan)': props.isRuleManagerOpen,
						'bg-(--flexoki-ui-3) text-(--flexoki-tx-2) focus:ring-(--flexoki-ui-3)': !props.isRuleManagerOpen
					}}
					aria-label="Toggle rule manager"
				>
					<div class="flex items-center gap-2">
						<span class="iconify lucide--settings w-4 h-4" />
						Rules
					</div>
				</button>
			</div>
		</div>
	);
};

export default TopBar;
