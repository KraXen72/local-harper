import { Component } from 'solid-js';
import type { IssueItemProps } from '../types';
import { FormattedMessage } from '../utils/message-formatter';
import { lintKindColor } from '../utils/lint-kind-colors';

const IssueItem: Component<IssueItemProps> = (props) => {
	const lintColor = () => lintKindColor(props.issue.lint.lint_kind());

	const handleClick = () => {
		props.onSelect(props.issue.id);
	};

	return (
		<div
			class="shared-card cursor-pointer hover:translate-x-0.5"
			classList={{ 'shared-card-selected translate-x-0.5': props.isSelected }}
			onClick={handleClick}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					handleClick();
				}
			}}
		>
			<div class="flex items-center gap-2.5">
				<span
					class="inline-block w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200"
					style={{ "background-color": lintColor() }}
				/>
				<div class="flex-1 min-w-0">
					<p class="text-sm text-[var(--flexoki-tx)] leading-snug">
						<FormattedMessage message={props.issue.lint.message()} />
					</p>
				</div>
			</div>
		</div>
	);
};

export default IssueItem;
