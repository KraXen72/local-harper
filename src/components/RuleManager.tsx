import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import RuleCard from './RuleCard';
import SidebarPanel from './SidebarPanel';

export interface RuleManagerProps {
	onClose: () => void;
	onRuleToggle: (ruleName: string, enabled: boolean) => void;
	rules: RuleInfo[];
}

export interface RuleInfo {
	name: string;
	displayName: string;
	description: string;
	enabled: boolean;
}

const RuleManager: Component<RuleManagerProps> = (props) => {
	const [filterText, setFilterText] = createSignal('');

	const filteredRules = createMemo(() => {
		const filter = filterText().trim().toLowerCase();
		if (!filter) return props.rules;
		return props.rules.filter(rule =>
			rule.displayName.toLowerCase().includes(filter) ||
			rule.description.toLowerCase().includes(filter)
		);
	});

	return (
		<SidebarPanel
			title="Rule Manager"
			onClose={props.onClose}
			filterText={filterText()}
			onFilterChange={setFilterText}
			filterPlaceholder="Filter rules..."
		>
			<Show
				when={filteredRules().length > 0}
				fallback={
					<div class="text-center py-8 text-(--flexoki-tx-3) text-sm">
						No rules match your filter
					</div>
				}
			>
				<For each={filteredRules()}>
					{(rule) => (
						<RuleCard
							name={rule.name}
							displayName={rule.displayName}
							description={rule.description}
							enabled={rule.enabled}
							onToggle={(enabled) => props.onRuleToggle(rule.name, enabled)}
						/>
					)}
				</For>
			</Show>
		</SidebarPanel>
	);
};

export default RuleManager;
