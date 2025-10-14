import { Component } from 'solid-js';
import type { HarperIssue } from '../types';
import IssueTooltip from './IssueTooltip';

interface IssueTooltipWrapperProps {
	issue: HarperIssue;
	severityClass: string;
	showIgnoreButton?: boolean;
	onIgnore?: () => void;
}

const IssueTooltipWrapper: Component<IssueTooltipWrapperProps> = (props) => {
	return (
		<div class="cm-issue-tooltip">
			<IssueTooltip 
				issue={props.issue} 
				severityClass={props.severityClass}
				showIgnoreButton={props.showIgnoreButton}
				onIgnore={props.onIgnore}
			/>
		</div>
	);
};

export default IssueTooltipWrapper;
