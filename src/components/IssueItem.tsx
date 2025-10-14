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
			class="p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ease-out"
			classList={{
				'bg-[var(--flexoki-cyan)]/20 border-[var(--flexoki-cyan)]/60 shadow-md shadow-[var(--flexoki-cyan)]/10 translate-x-0.5': props.isSelected,
				'bg-[var(--flexoki-ui)]/20 border-[var(--flexoki-ui-2)] hover:border-[var(--flexoki-ui-3)] hover:bg-[var(--flexoki-ui)] hover:shadow-sm hover:translate-x-0.5': !props.isSelected,
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
