import { Component } from 'solid-js';
import type { TopBarProps } from '../types';

const TopBar: Component<TopBarProps> = (props) => {
	return (
		<div class="flex items-center justify-between px-3 py-2 border-b border-gray-300 bg-white">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium text-gray-700">
					Issues:
				</span>
				<span class="inline-flex items-center justify-center min-w-[2rem] h-5 px-1.5 rounded border border-red-300 bg-red-100 text-red-800 text-xs font-semibold">
					{props.issueCount}
				</span>
			</div>

			<button
				onClick={props.onCopy}
				class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded border border-blue-700 transition-colors"
			>
				Copy Text
			</button>
		</div>
	);
};

export default TopBar;
