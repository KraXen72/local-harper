import { FormattedMessage } from '../utils/message-formatter';
import Toggle from './Toggle';

export interface RuleToggleItemProps {
	name: string;
	displayName: string;
	description: string;
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
}

export default function RuleCard(props: RuleToggleItemProps) {
	return (
		<div class="card card-compact bg-base-200 border border-base-300 mb-2 p-3 hover:bg-base-300/50 transition-colors cursor-pointer">
			<div class="flex items-start justify-between gap-3">
				<div class="flex flex-col gap-1 flex-1 min-w-0">
					<span class="text-sm font-medium text-base-content">
						{props.name}
					</span>
					<p class="text-xs text-base-content/70 leading-relaxed">
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
