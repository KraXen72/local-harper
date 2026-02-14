import { Component } from 'solid-js';
import type { HarperIssue } from '../types';
import IssueTooltip from './IssueTooltip';

interface IssueTooltipWrapperProps {
	issue: HarperIssue;
	lintKind: string;
	showIgnoreButton?: boolean;
	onIgnore?: () => void;
}

const IssueTooltipWrapper: Component<IssueTooltipWrapperProps> = (props) => {
	return (
		<div class="p-2 rounded bg-base-200 border border-base-300 text-base-content text-sm max-w-80 shadow-lg">
			<IssueTooltip
				issue={props.issue}
				lintKind={props.lintKind}
				rule={props.issue.rule}
				showIgnoreButton={props.showIgnoreButton}
				onIgnore={props.onIgnore}
			/>
		</div>
	);
};

export default IssueTooltipWrapper;
