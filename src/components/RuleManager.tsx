import { Component, createSignal, createMemo, For, Show, createResource } from 'solid-js';
import type { RuleManagerProps, RuleInfo } from '../types';
import { pascalCaseToWords } from '../utils/pascal-case';
import { exportRuleConfig, importRuleConfig, getLintDescriptions } from '../services/harper-service';
import RuleCard from './RuleCard';
import uFuzzy from '@leeoniya/ufuzzy';
import { createVirtualizedList } from '@doeixd/create-virtualized-list-solid';

const RuleManager: Component<RuleManagerProps> = (props) => {
	const [filterText, setFilterText] = createSignal('');
	const [importError, setImportError] = createSignal<string | null>(null);
	
	// Fetch rule descriptions
	const [descriptions] = createResource(getLintDescriptions);
	
	// Create fuzzy search instance with SingleError mode for typo tolerance
	// intraMode: 1 allows single errors (substitution, transposition, insertion, deletion)
	// This makes the search more forgiving of typos
	const fuzzy = new uFuzzy({
		intraMode: 1,
		intraIns: 1,
		intraSub: 1,
		intraTrn: 1,
		intraDel: 1
	});
	
	// Convert config to RuleInfo array
	const allRules = createMemo((): RuleInfo[] => {
		const descs = descriptions();
		if (!descs) return [];
		
		const rules: RuleInfo[] = [];
		for (const [name, enabled] of Object.entries(props.currentConfig)) {
			rules.push({
				name,
				displayName: pascalCaseToWords(name),
				description: descs[name] || 'No description available',
				enabled: enabled as boolean
			});
		}
		// Sort alphabetically by display name
		return rules.sort((a, b) => a.displayName.localeCompare(b.displayName));
	});
	
	// Apply fuzzy search filtering
	const filteredRules = createMemo(() => {
	const filter = filterText().trim();
	if (!filter) {
		return allRules();
	}

	const rules = allRules();

	// Search display names (high priority)
	const nameHaystack = rules.map(r => r.displayName);
	const [nameIdxs, nameInfo, nameOrder] = fuzzy.search(nameHaystack, filter);

	// Search descriptions (fallback)
	const descHaystack = rules.map(r => r.description);
	const [descIdxs, descInfo, descOrder] = fuzzy.search(descHaystack, filter);

	const matchedByName = new Set(nameIdxs || []);
	const results: RuleInfo[] = [];

	// Add name matches (already sorted)
	if (nameOrder && nameInfo) {
		for (let i = 0; i < nameOrder.length; i++) {
			const idx = nameInfo.idx[nameOrder[i]];
			results.push(rules[idx]);
		}
	}

	// Add description-only matches (already sorted)
	if (descOrder && descInfo) {
		for (let i = 0; i < descOrder.length; i++) {
			const idx = descInfo.idx[descOrder[i]];
			if (!matchedByName.has(idx)) {
				results.push(rules[idx]);
			}
		}
	}

	return results;
});

	// Create virtualized list
	const virtualList = createVirtualizedList({
		data: filteredRules,
		estimateSize: () => 80, // Approximate height of each RuleCard
	});
	
	const handleExport = () => {
		try {
			const jsonString = exportRuleConfig();
			const blob = new Blob([jsonString], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			link.href = url;
			link.download = `harper-rules-${timestamp}.json`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to export rules:', error);
			setImportError('Failed to export rules');
			setTimeout(() => setImportError(null), 3000);
		}
	};
	
	const handleImport = () => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			
			try {
				const text = await file.text();
				await importRuleConfig(text);
				setImportError(null);
				// Notify parent to refresh config and re-analyze
				await props.onConfigImported();
			} catch (error: any) {
				console.error('Failed to import rules:', error);
				setImportError(error.message || 'Failed to import rules');
			}
		};
		input.click();
	};
	
	return (
		<Show when={props.isOpen}>
			<div class="h-full bg-[var(--flexoki-bg)] grid" style={{
				"grid-template-rows": "min-content min-content 1fr",
			}}>
				{/* Header */}
				<div class="flex items-center justify-between px-4 py-3 border-x border-[var(--flexoki-ui-2)]">
					<h2 class="text-lg font-semibold text-[var(--flexoki-tx)]">Rule Manager</h2>
					<button
						onClick={props.onClose}
						class="p-1.5 hover:bg-[var(--flexoki-ui-3)] aspect-square rounded-md transition-colors duration-150 flex"
						aria-label="Close rule manager"
					>
						<span class="iconify lucide--x w-5 h-5 text-[var(--flexoki-tx-2)]" />
					</button>
				</div>
				
				{/* Controls */}
				<div class="px-4 py-3 space-y-3 border-x border-b border-[var(--flexoki-ui-2)]">
					{/* Search bar */}
					<div class="relative">
						<input
							type="text"
							value={filterText()}
							onInput={(e) => setFilterText(e.currentTarget.value)}
							placeholder="filter rules..."
							class="w-full px-3 py-2 bg-[var(--flexoki-bg)] border border-[var(--flexoki-ui-2)] rounded-md text-sm text-[var(--flexoki-tx)] placeholder-[var(--flexoki-tx-3)] focus:outline-none focus:ring-2 focus:ring-[var(--flexoki-cyan)] focus:border-transparent"
						/>
						<Show when={filterText()}>
							<button
								onClick={() => setFilterText('')}
								class="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-[var(--flexoki-ui-3)] rounded transition-colors flex items-center"
								aria-label="Clear filter"
							>
								<span class="iconify lucide--x text-lg text-[var(--flexoki-tx-3)]" />
							</button>
						</Show>
					</div>
					
				{/* Import/Export buttons */}
				<div class="flex gap-2">
					<Button onClick={handleExport} icon="lucide--download" text="Export" />
					<Button onClick={handleImport} icon="lucide--upload" text="Import" />
				</div>
					<Show when={importError()}>
						<div class="flex items-start gap-2 p-3 bg-[var(--flexoki-re)] bg-opacity-10 border border-[var(--flexoki-re)] rounded-md">
							<span class="iconify lucide--alert-circle w-5 h-5 text-[var(--flexoki-re)] flex-shrink-0 mt-0.5" />
							<div class="flex-1 min-w-0">
								<p class="text-sm text-[var(--flexoki-re)] break-words">{importError()}</p>
							</div>
							<button
								onClick={() => setImportError(null)}
								class="p-0.5 hover:bg-[var(--flexoki-ui-3)] rounded transition-colors flex-shrink-0"
								aria-label="Dismiss error"
							>
								<span class="iconify lucide--x w-4 h-4 text-[var(--flexoki-re)]" />
							</button>
						</div>
					</Show>
				</div>
				
				{/* Rule list */}
				<div class="overflow-y-auto p-2 border-x border-[var(--flexoki-ui-2)] min-h-0">
					<Show
							when={filteredRules().length > 0}
							fallback={
								<div class="text-center py-8 text-[var(--flexoki-tx-3)] text-sm">
									No rules match your filter
								</div>
							}
						>
							<div {...virtualList.root}>
								<div {...virtualList.container}>
									<For each={virtualList.item}>
										{virtualList.items((item) => (
											<div {...item.props}>
												<RuleCard
													name={item.data.name}
													displayName={item.data.displayName}
													description={item.data.description}
													enabled={item.data.enabled}
													onToggle={(enabled) => props.onRuleToggle(item.data.name, enabled)}
												/>
											</div>
										))}
									</For>
								</div>
							</div>
						</Show>
				</div>
			</div>
		</Show>
	);
};

function Button(props: { onClick: () => void; icon: string; text: string; }) {
	return (
		<button
			onClick={props.onClick}
			class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--flexoki-cyan)] hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--flexoki-cyan)] focus:ring-offset-2 focus:ring-offset-[var(--flexoki-bg-2)]"
		>
			<span class={`iconify ${props.icon} w-4 h-4`} />
			{props.text}
		</button>
	);
}

export default RuleManager;

