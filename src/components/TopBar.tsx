import { Component } from 'solid-js';
import type { TopBarProps } from '../types';

const TopBar: Component<TopBarProps> = (props) => {
	return (
		<div class="flex items-center justify-between px-3 py-2 border-b border-[var(--flexoki-ui)] bg-[var(--flexoki-ui)]">
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-[var(--flexoki-tx)]">
						Issues:
					</span>
					<span class="inline-flex items-center justify-center min-w-[2rem] h-5 px-1.5 rounded border border-[var(--flexoki-red)] bg-[var(--flexoki-red)]/20 text-[var(--flexoki-red)] text-xs font-semibold">
						{props.issueCount}
					</span>
				</div>

				{props.isAnalyzing && (
					<div class="flex items-center gap-2 text-sm text-[var(--flexoki-tx-2)]">
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-solid border-[var(--flexoki-cyan)] border-r-transparent" />
						<span>Analyzing...</span>
					</div>
				)}
			</div>

			<button
				onClick={props.onCopy}
				class="px-3 py-1 bg-[var(--flexoki-cyan)] hover:brightness-90 text-white text-sm font-medium rounded border border-[var(--flexoki-cyan)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--flexoki-cyan)] focus:ring-offset-1 focus:ring-offset-[var(--flexoki-ui)]"
			>
				Copy Text
			</button>
		</div>
	);
};

export default TopBar;
