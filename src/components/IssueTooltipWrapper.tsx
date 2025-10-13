import { Component } from 'solid-js';
import type { HarperIssue } from '../types';
import IssueTooltip from './IssueTooltip';

interface IssueTooltipWrapperProps {
	issue: HarperIssue;
	severityClass: string;
}

const IssueTooltipWrapper: Component<IssueTooltipWrapperProps> = (props) => {
	return (
		<div class="cm-issue-tooltip">
			<IssueTooltip issue={props.issue} severityClass={props.severityClass} />
		</div>
	);
};

export default IssueTooltipWrapper;
