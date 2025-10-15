import { Component } from 'solid-js';
import { FormattedMessage } from '../utils/message-formatter';

export interface RuleToggleItemProps {
	name: string;
	displayName: string;
	description: string;
	enabled: boolean;
	onToggle: (enabled: boolean) => void;
}

const RuleToggleItem: Component<RuleToggleItemProps> = (props) => {
	// TODO: many classes/visual styles are shared between the IssueItem and RuleToggleItem. 
	// however, ruleToggleItem doesen't have the concept of selected
	// it'd be better if there was one class for the common unselected styles that's shared between the two
	return (
		<div class="p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ease-out bg-[var(--flexoki-ui)]/20 border-[var(--flexoki-ui-2)] hover:border-[var(--flexoki-ui-3)] hover:bg-[var(--flexoki-ui)] hover:shadow-sm">
			<label class="flex items-start justify-between cursor-pointer gap-3">
				<div class="flex flex-col gap-1 flex-1 min-w-0">
					<span class="text-sm font-medium text-[var(--flexoki-tx)]">
						{props.name}
					</span>
					<p class="text-xs text-[var(--flexoki-tx-2)] leading-relaxed">
						<FormattedMessage message={props.description} />
					</p>
				</div>
				
				<div class="relative inline-block flex-shrink-0">
					<input
						type="checkbox"
						checked={props.enabled}
						onChange={(e) => props.onToggle(e.currentTarget.checked)}
						class="sr-only peer"
					/>
					<div class="w-11 h-6 bg-[var(--flexoki-ui-3)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--flexoki-cyan)] peer-focus:ring-offset-2 peer-focus:ring-offset-[var(--flexoki-bg-2)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--flexoki-cyan)]" />
				</div>
			</label>
		</div>
	);
};

export default RuleToggleItem;
