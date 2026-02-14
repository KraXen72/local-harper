import { Component, createSignal, createMemo, For, Show, createResource } from 'solid-js';
import type { RuleManagerProps, RuleInfo } from '../types';
import { pascalCaseToWords } from '../utils/pascal-case';
import { exportRuleConfig, importRuleConfig, getLintDescriptions } from '../services/harper-service';
import RuleCard from './RuleCard';
import uFuzzy from '@leeoniya/ufuzzy';

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

		return results.slice(0, 20);
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
			<div class="h-full bg-base-100 grid" style={{
				"grid-template-rows": "min-content min-content 1fr",
			}}>
				{/* Header */}
				<div class="flex items-center justify-between px-4 py-3 border-x border-base-300">
					<h2 class="text-lg font-semibold text-base-content">Rule Manager</h2>
					<button
						onClick={props.onClose}
						class="btn btn-ghost btn-sm btn-square"
						aria-label="Close rule manager"
					>
						<span class="iconify lucide--x w-5 h-5" />
					</button>
				</div>

				{/* Controls */}
				<div class="px-4 py-3 space-y-3 border-x border-b border-base-300">
					{/* Search bar */}
					<div class="relative">
						<input
							type="text"
							value={filterText()}
							onInput={(e) => setFilterText(e.currentTarget.value)}
							placeholder="filter rules..."
							class="input input-sm w-full pr-8"
						/>
						<Show when={filterText()}>
							<button
								onClick={() => setFilterText('')}
								class="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square"
								aria-label="Clear filter"
							>
								<span class="iconify lucide--x text-lg" />
							</button>
						</Show>
					</div>

					{/* Import/Export buttons */}
					<div class="flex gap-2">
						<Button onClick={handleExport} icon="lucide--download" text="Export" />
						<Button onClick={handleImport} icon="lucide--upload" text="Import" />
					</div>
					<Show when={importError()}>
						<div class="alert alert-error">
							<span class="iconify lucide--alert-circle w-5 h-5" />
							<div class="flex-1 min-w-0">
								<p class="text-sm wrap-break-word">{importError()}</p>
							</div>
							<button
								onClick={() => setImportError(null)}
								class="btn btn-ghost btn-xs btn-square"
								aria-label="Dismiss error"
							>
								<span class="iconify lucide--x w-4 h-4" />
							</button>
						</div>
					</Show>
				</div>

				{/* Rule list */}
				<div class="overflow-y-auto p-2 border-x border-base-300 min-h-0">
					<Show
						when={filteredRules().length > 0}
						fallback={
							<div class="text-center py-8 text-base-content/50 text-sm">
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
		</Show>
	);
};

function Button(props: { onClick: () => void; icon: string; text: string; }) {
	return (
		<button
			onClick={props.onClick}
			class="btn btn-accent btn-sm flex-1"
		>
			<span class={`iconify ${props.icon} w-4 h-4`} />
			{props.text}
		</button>
	);
}

export default RuleManager;

