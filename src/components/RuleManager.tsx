import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import RuleCard from './RuleCard';

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
		if (!filter) {
			return props.rules;
		}
		return props.rules.filter(rule =>
			rule.displayName.toLowerCase().includes(filter) ||
			rule.description.toLowerCase().includes(filter)
		);
	});

	return (
		<div class="h-full bg-(--flexoki-bg) grid" style={{
			"grid-template-rows": "min-content min-content 1fr",
		}}>
			<div class="flex items-center justify-between px-4 py-3 border-b border-(--flexoki-ui-2)">
				<h2 class="text-lg font-semibold text-(--flexoki-tx)">Rule Manager</h2>
				<button
					onClick={props.onClose}
					class="p-1.5 hover:bg-(--flexoki-ui-3) aspect-square rounded-md transition-colors duration-150 flex"
					aria-label="Close rule manager"
				>
					<span class="iconify lucide--x w-5 h-5 text-(--flexoki-tx-2)" />
				</button>
			</div>

			<div class="px-4 py-3 border-b border-(--flexoki-ui-2)">
				<div class="relative">
					<input
						type="text"
						value={filterText()}
						onInput={(e) => setFilterText(e.currentTarget.value)}
						placeholder="Filter rules..."
						class="w-full px-3 py-2 bg-(--flexoki-bg) border border-(--flexoki-ui-2) rounded-md text-sm text-(--flexoki-tx) placeholder-(--flexoki-tx-3) focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan) focus:border-transparent"
					/>
					<Show when={filterText()}>
						<button
							onClick={() => setFilterText('')}
							class="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-(--flexoki-ui-3) rounded transition-colors flex items-center"
							aria-label="Clear filter"
						>
							<span class="iconify lucide--x text-lg text-(--flexoki-tx-3)" />
						</button>
					</Show>
				</div>
			</div>

			<div class="overflow-y-auto p-2 min-h-0">
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
			</div>
		</div>
	);
};

export default RuleManager;
