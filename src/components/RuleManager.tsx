import { Component, createSignal, createMemo, For, Show, createResource } from 'solid-js';
import type { RuleManagerProps, RuleInfo } from '../types';
import { pascalCaseToWords } from '../utils/pascal-case';
import { exportRuleConfig, importRuleConfig, getLintDescriptions } from '../services/harper-service';
import RuleToggleItem from './RuleToggleItem';
import Icon from './Icon';
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
			// No search - return all rules
			return allRules();
		}
		
		const rules = allRules();
		
		// Search in display names (higher priority)
		const nameHaystack = rules.map(r => r.displayName);
		const nameIdxs = fuzzy.filter(nameHaystack, filter);
		
		// Search in descriptions (lower priority, fallback)
		const descHaystack = rules.map(r => r.description);
		const descIdxs = fuzzy.filter(descHaystack, filter);
		
		// Combine results, prioritizing name matches
		const matchedByName = new Set(nameIdxs || []);
		const matchedByDesc = new Set(descIdxs || []);
		
		// If nothing matched, return empty
		if (matchedByName.size === 0 && matchedByDesc.size === 0) {
			return [];
		}
		
		// Get matches that are ONLY in name (highest priority)
		const nameOnlyMatches: RuleInfo[] = [];
		if (nameIdxs && nameIdxs.length > 0) {
			const info = fuzzy.info(nameIdxs, nameHaystack, filter);
			const order = fuzzy.sort(info, nameHaystack, filter);
			nameOnlyMatches.push(...order.map(i => rules[info.idx[order[i]]]));
		}
		
		// Get matches that are ONLY in description (lower priority)
		const descOnlyMatches: RuleInfo[] = [];
		if (descIdxs && descIdxs.length > 0) {
			// Filter out items that were already matched by name
			const descOnlyIdxs = descIdxs.filter(idx => !matchedByName.has(idx));
			if (descOnlyIdxs.length > 0) {
				const info = fuzzy.info(descOnlyIdxs, descHaystack, filter);
				const order = fuzzy.sort(info, descHaystack, filter);
				descOnlyMatches.push(...order.map(i => rules[info.idx[order[i]]]));
			}
		}
		
		// Combine and limit to 20 results when searching
		const combined = [...nameOnlyMatches, ...descOnlyMatches];
		return combined.slice(0, 20);
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
				// The parent will be notified via re-render due to config change
			} catch (error: any) {
				console.error('Failed to import rules:', error);
				setImportError(error.message || 'Failed to import rules');
			}
		};
		input.click();
	};
	
	return (
		<Show when={props.isOpen}>
			<div class="h-full flex flex-col bg-[var(--flexoki-bg-2)] border-l border-[var(--flexoki-ui-2)]">
				{/* Header */}
				<div class="flex items-center justify-between px-4 py-3 border-b border-[var(--flexoki-ui-2)]">
					<h2 class="text-lg font-semibold text-[var(--flexoki-tx)]">Rule Manager</h2>
					<button
						onClick={props.onClose}
						class="p-1.5 hover:bg-[var(--flexoki-ui-3)] rounded-md transition-colors duration-150"
						aria-label="Close rule manager"
					>
						<Icon icon="lucide:x" class="w-5 h-5 text-[var(--flexoki-tx-2)]" />
					</button>
				</div>
				
				{/* Controls */}
				<div class="px-4 py-3 border-b border-[var(--flexoki-ui-2)] space-y-3">
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
								class="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--flexoki-ui-3)] rounded transition-colors"
								aria-label="Clear filter"
							>
								<Icon icon="lucide:x" class="w-4 h-4 text-[var(--flexoki-tx-3)]" />
							</button>
						</Show>
					</div>
					
					{/* Import/Export buttons */}
					<div class="flex gap-2">
						<button
							onClick={handleExport}
							class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--flexoki-cyan)] hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--flexoki-cyan)] focus:ring-offset-2 focus:ring-offset-[var(--flexoki-bg-2)]"
						>
							<Icon icon="lucide:download" class="w-4 h-4" />
							Export
						</button>
						<button
							onClick={handleImport}
							class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[var(--flexoki-cyan)] hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--flexoki-cyan)] focus:ring-offset-2 focus:ring-offset-[var(--flexoki-bg-2)]"
						>
							<Icon icon="lucide:upload" class="w-4 h-4" />
							Import
						</button>
					</div>
					
					{/* Error message */}
					<Show when={importError()}>
						<div class="flex items-start gap-2 p-3 bg-[var(--flexoki-re)] bg-opacity-10 border border-[var(--flexoki-re)] rounded-md">
							<svg class="w-5 h-5 text-[var(--flexoki-re)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div class="flex-1 min-w-0">
								<p class="text-sm text-[var(--flexoki-re)] break-words">{importError()}</p>
							</div>
							<button
								onClick={() => setImportError(null)}
								class="p-0.5 hover:bg-[var(--flexoki-ui-3)] rounded transition-colors flex-shrink-0"
								aria-label="Dismiss error"
							>
								<svg class="w-4 h-4 text-[var(--flexoki-re)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					</Show>
				</div>
				
				{/* Rule list */}
				<div class="flex-1 overflow-y-auto px-4 py-3">
					<div class="space-y-2">
						<Show
							when={filteredRules().length > 0}
							fallback={
								<div class="text-center py-8 text-[var(--flexoki-tx-3)] text-sm">
									No rules match your filter
								</div>
							}
						>
							<For each={filteredRules()}>
								{(rule) => (
									<RuleToggleItem
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
			</div>
		</Show>
	);
};

export default RuleManager;
