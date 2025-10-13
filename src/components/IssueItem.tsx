import { Component } from 'solid-js';
import type { IssueItemProps } from '../types';

const IssueItem: Component<IssueItemProps> = (props) => {
	const getSeverityColor = () => {
		switch (props.issue.severity) {
			case 'error': return 'bg-red-500';
			case 'warning': return 'bg-yellow-500';
			default: return 'bg-blue-500';
		}
	};

	const handleClick = () => {
		props.onSelect(props.issue.id);
	};

	return (
		<div
			class="p-3 rounded-md border cursor-pointer transition-all duration-150 ease-in-out focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 focus-within:ring-offset-[#1a1a1a]"
			classList={{
				'bg-blue-900/30 border-blue-600 shadow-sm': props.isSelected,
				'bg-[#262626] border-gray-700 hover:border-gray-600 hover:shadow-sm': !props.isSelected,
			}}
			onClick={handleClick}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick();
				}
			}}
		>
			<div class="flex items-start gap-2">
				<span 
					class={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getSeverityColor()} transition-all duration-200`}
					classList={{ 'scale-125': props.isSelected }}
				/>
				<div class="flex-1 min-w-0">
					<p class="text-sm text-gray-200 leading-relaxed">{props.issue.lint.message()}</p>
					<p class="text-xs text-gray-400 mt-1 font-mono bg-[#1a1a1a] px-1.5 py-0.5 rounded inline-block">
						"{props.issue.lint.get_problem_text()}"
					</p>
				</div>
			</div>
		</div>
	);
};

export default IssueItem;
