import { Component } from 'solid-js';
import type { TopBarProps } from '../types';

const TopBar: Component<TopBarProps> = (props) => {
	return (
		<div class="flex items-center justify-between px-4 py-2.5 border-b border-[var(--flexoki-ui-2)] bg-[var(--flexoki-bg-2)] backdrop-blur-sm">
			<div class="flex items-center gap-3">
				<div
					class="w-2 h-2 rounded-full transition-all duration-500"
					classList={{
						'bg-[var(--flexoki-green)] shadow-[0_0_8px_rgba(135,154,57,0.6)] animate-pulse': props.isAnalyzing,
						'bg-[var(--flexoki-tx-3)]': !props.isAnalyzing
					}}
				/>
				<span class="text-sm font-medium text-[var(--flexoki-tx-2)]">
					Issues
				</span>
				<span class="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-md border border-[var(--flexoki-red)]/40 bg-[var(--flexoki-red)]/15 text-[var(--flexoki-red)] text-xs font-bold tracking-wide shadow-sm">
					{props.issueCount}
				</span>
			</div>

			<button
				onClick={props.onCopy}
				class="px-4 py-1.5 bg-gradient-to-br from-[var(--flexoki-cyan)] to-[var(--flexoki-blue)] hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--flexoki-cyan)] focus:ring-offset-2 focus:ring-offset-[var(--flexoki-bg-2)]"
			>
				Copy Text
			</button>
		</div>
	);
};

export default TopBar;
