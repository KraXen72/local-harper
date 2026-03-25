import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import RuleCard from './RuleCard';
import SidebarPanel from './SidebarPanel';
import MarkdownFormatterDialog from './MarkdownFormatterDialog';

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
	const [showFormatterDialog, setShowFormatterDialog] = createSignal(false);

	const filteredRules = createMemo(() => {
		const filter = filterText().trim().toLowerCase();
		if (!filter) return props.rules;
		return props.rules.filter(rule =>
			rule.displayName.toLowerCase().includes(filter) ||
			rule.description.toLowerCase().includes(filter)
		);
	});

	return (
		<>
			<SidebarPanel
				title="Rule Manager"
				onClose={props.onClose}
				filterText={filterText()}
				onFilterChange={setFilterText}
				filterPlaceholder="Filter rules..."
				filterAddon={
					<button
						onClick={() => setShowFormatterDialog(true)}
						class="shrink-0 px-2.5 py-2 text-(--flexoki-tx-2) bg-(--flexoki-ui)/50 border border-(--flexoki-ui-2) rounded-md hover:bg-(--flexoki-ui-2) hover:text-(--flexoki-tx) transition-colors flex items-center gap-1.5"
						title="Configure Markdown Formatter (Ctrl+M)"
						aria-label="Configure Markdown Formatter"
					>
						<span class="iconify lucide--wand-sparkles w-4 h-4" />
						<span class="text-xs font-medium hidden sm:inline">Format</span>
					</button>
				}
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

			<Show when={showFormatterDialog()}>
				<MarkdownFormatterDialog onClose={() => setShowFormatterDialog(false)} />
			</Show>
		</>
	);
};

export default RuleManager;
