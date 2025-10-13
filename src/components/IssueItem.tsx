import { Component } from 'solid-js';
import type { IssueItemProps } from '../types';
import { FormattedMessage } from '../utils/message-formatter';

const IssueItem: Component<IssueItemProps> = (props) => {
	const getSeverityColor = () => {
		switch (props.issue.severity) {
			case 'error': return 'bg-[var(--flexoki-red)]';
			case 'warning': return 'bg-[var(--flexoki-yellow)]';
			default: return 'bg-[var(--flexoki-cyan)]';
		}
	};

	const handleClick = () => {
		props.onSelect(props.issue.id);
	};

	return (
		<div
			class="p-3 rounded-md border cursor-pointer transition-all duration-150 ease-in-out focus-within:ring-2 focus-within:ring-[var(--flexoki-cyan)] focus-within:ring-offset-1 focus-within:ring-offset-[var(--flexoki-bg)]"
			classList={{
				'bg-[var(--flexoki-cyan)]/20 border-[var(--flexoki-cyan)] shadow-sm': props.isSelected,
				'bg-[var(--flexoki-ui)] border-[var(--flexoki-ui-2)] hover:border-[var(--flexoki-ui-3)] hover:shadow-sm': !props.isSelected,
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
			<div class="flex items-center gap-2">
				<span
					class={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${getSeverityColor()} transition-all duration-200`}
					classList={{ 'scale-125': props.isSelected }}
				/>
				<div class="flex-1 min-w-0">
					<p class="text-sm text-[var(--flexoki-tx)] leading-relaxed">
						<FormattedMessage message={props.issue.lint.message()} />
					</p>
				</div>
			</div>
		</div>
	);
};

export default IssueItem;
