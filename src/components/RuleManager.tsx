import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import RuleCard from './RuleCard';
import SidebarPanel from './SidebarPanel';
import { Dialect } from '../services/harper-service';
import type { RuleInfo, HeaderControl } from '../types';

export interface RuleManagerProps {
	onClose: () => void;
	onRuleToggle: (ruleName: string, enabled: boolean) => void;
	onDialectChange?: (dialect: Dialect) => void;
	rules: RuleInfo[];
	currentDialect: Dialect;
}

const DIALECT_OPTIONS: { value: string; label: string }[] = [
	{ value: String(Dialect.American), label: 'American English' },
	{ value: String(Dialect.British), label: 'British English' },
	{ value: String(Dialect.Australian), label: 'Australian English' },
	{ value: String(Dialect.Canadian), label: 'Canadian English' },
	{ value: String(Dialect.Indian), label: 'Indian English' },
];

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

	const headerControl: HeaderControl = [
		{
			type: 'select',
			options: DIALECT_OPTIONS,
			defaultOption: String(props.currentDialect),
			onChange: (value) => props.onDialectChange?.(Number(value) as Dialect),
			label: 'Select dialect',
		},
	];

	return (
		<SidebarPanel
			title="Rule Manager"
			onClose={props.onClose}
			filterText={filterText()}
			onFilterChange={setFilterText}
			filterPlaceholder="Filter rules..."
			headerControl={headerControl}
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
