import { Component, Show } from 'solid-js';
import type { HarperIssue } from '../types';
import { FormattedMessage } from '../utils/message-formatter';

interface IssueTooltipProps {
	issue: HarperIssue;
	severityClass: string;
	showIgnoreButton?: boolean;
	onIgnore?: () => void;
}

const IssueTooltip: Component<IssueTooltipProps> = (props) => {
	return (
		<div>
			<div class="flex gap-2 items-center mb-1">
				<span class={`cm-issue-tooltip-severity cm-issue-tooltip-severity-${props.severityClass}`}>
					{props.issue.severity}
				</span>
				<span class="flex-1">
					<FormattedMessage message={props.issue.lint.message()} />
				</span>
			</div>
			<div class="cm-issue-tooltip-rule">{props.issue.lint.lint_kind()}</div>
			<Show when={props.showIgnoreButton && props.onIgnore}>
				<button 
					class="mt-2 px-3 py-1 bg-[var(--flexoki-ui)] text-[var(--flexoki-tx)] border border-[var(--flexoki-ui-3)] rounded text-xs font-medium cursor-pointer transition-all duration-[120ms] w-full hover:bg-[var(--flexoki-ui-2)] hover:border-[var(--flexoki-tx-3)] active:scale-[0.98]"
					onClick={props.onIgnore}
					type="button"
				>
					Ignore
				</button>
			</Show>
		</div>
	);
};

export default IssueTooltip;
