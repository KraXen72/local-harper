import { Component } from 'solid-js';
import Toggle from './Toggle';
import { FormattedMessage } from '../utils/message-formatter';

export interface RuleCardProps {
	name: string;
	displayName: string;
	description: string;
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
}

const RuleCard: Component<RuleCardProps> = (props) => {
	return (
		<div class="shared-card">
			<div class="flex items-start justify-between gap-3">
				<div class="flex flex-col gap-1 flex-1 min-w-0">
					<span class="text-sm font-medium text-(--flexoki-tx)">
						{props.displayName}
					</span>
					<p class="text-xs text-(--flexoki-tx-2) leading-relaxed">
						<FormattedMessage message={props.description} />
					</p>
				</div>
				<div class="shrink-0">
					<Toggle
						checked={props.enabled}
						onChange={props.onToggle}
					/>
				</div>
			</div>
		</div>
	);
};

export default RuleCard;
