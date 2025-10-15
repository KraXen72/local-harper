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
		<div class="p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ease-out bg-[var(--flexoki-ui)]/20 border-[var(--flexoki-ui-2)] hover:border-[var(--flexoki-ui-3)] hover:bg-[var(--flexoki-ui)] hover:shadow-sm">
			<div class="flex items-start justify-between gap-3">
				<div class="flex flex-col gap-1 flex-1 min-w-0">
					<span class="text-sm font-medium text-[var(--flexoki-tx)]">
						{props.name}
					</span>
					<p class="text-xs text-[var(--flexoki-tx-2)] leading-relaxed">
						<FormattedMessage message={props.description} />
					</p>
				</div>
				
				<div class="flex-shrink-0">
					<Toggle
						checked={props.enabled}
						onChange={props.onToggle}
					/>
				</div>
			</div>
		</div>
	);
};
