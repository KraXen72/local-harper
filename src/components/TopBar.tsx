import { Component, Show } from 'solid-js';

interface TopBarProps {
	onCopy: () => void;
	isAnalyzing: boolean;
	isInitializing?: boolean;
}

const TopBar: Component<TopBarProps> = (props) => {
	return (
		<div class="relative flex items-center justify-between px-4 h-12 border-b border-(--flexoki-ui-2) bg-(--flexoki-bg-2)">
		<div class="flex items-center gap-3">
		<div
		class="w-2 h-2 rounded-full transition-all duration-300"
		classList={{
			'bg-[var(--flexoki-green)] shadow-[0_0_8px_rgba(135,154,57,0.6)] animate-pulse': props.isAnalyzing,
					'bg-[var(--flexoki-tx-3)]': !props.isAnalyzing
		}}
		/>
		<span class="text-sm font-medium text-(--flexoki-tx-2)">local-harper</span>
		</div>

		<Show when={props.isInitializing}>
		<progress class="matter-progress-linear absolute left-0 right-0 top-0" aria-hidden="true" />
		</Show>

		<button
		onClick={props.onCopy}
		class="px-3 py-1 bg-(--flexoki-cyan) hover:brightness-110 active:scale-95 text-white text-xs font-medium rounded shadow transition-all focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan) focus:ring-offset-2 focus:ring-offset-(--flexoki-bg-2)"
		>
		Copy Text
		</button>
		</div>
	);
};

export default TopBar;
