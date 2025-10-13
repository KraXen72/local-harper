import { Component } from 'solid-js';
import type { HarperIssue } from '../types';

interface IssueTooltipProps {
	issue: HarperIssue;
	severityClass: string;
}

const IssueTooltip: Component<IssueTooltipProps> = (props) => {
	return (
		<div class="cm-issue-tooltip-content">
			<div class="cm-issue-tooltip-header">
				<span class={`cm-issue-tooltip-severity cm-issue-tooltip-severity-${props.severityClass}`}>
					{props.issue.severity}
				</span>
				<span class="cm-issue-tooltip-message">{props.issue.lint.message()}</span>
			</div>
			<div class="cm-issue-tooltip-rule">{props.issue.lint.lint_kind()}</div>
		</div>
	);
};

export default IssueTooltip;
