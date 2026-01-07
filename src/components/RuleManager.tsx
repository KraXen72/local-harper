import { Component, createSignal, createMemo, For, Show, createResource, onMount, onCleanup } from 'solid-js';
import type { RuleManagerProps, RuleInfo } from '../types';
import { pascalCaseToWords } from '../utils/pascal-case';
import { exportRuleConfig, importRuleConfig, getLintDescriptions } from '../services/harper-service';
import RuleCard from './RuleCard';
import uFuzzy from '@leeoniya/ufuzzy';
import { throttle } from '@github/mini-throttle';
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
	const q = filter.toLowerCase();

	// Exact substring name matches first
	const exactNameMatches: RuleInfo[] = [];
	const added = new Set<number>();
	for (let i = 0; i < rules.length; i++) {
		if (rules[i].displayName.toLowerCase().includes(q)) {
			exactNameMatches.push(rules[i]);
			added.add(i);
		}
	}

	// If everything matched by exact names, return early
	if (exactNameMatches.length === rules.length) return exactNameMatches;

	// Use fuzzy for remaining scoring
	const nameHaystack = rules.map(r => r.displayName);
	const [nameIdxs, nameInfo, nameOrder] = fuzzy.search(nameHaystack, filter);

	const descHaystack = rules.map(r => r.description);
	const [descIdxs, descInfo, descOrder] = fuzzy.search(descHaystack, filter);

	const results: RuleInfo[] = [...exactNameMatches];

	// Add name matches from fuzzy
	if (Array.isArray(nameIdxs) && nameIdxs.length) {
		for (const idx of nameIdxs) {
			if (!added.has(idx)) {
				results.push(rules[idx]);
				added.add(idx);
			}
		}
	} else if (nameOrder && nameInfo) {
		for (let i = 0; i < nameOrder.length; i++) {
			const idx = nameInfo.idx[nameOrder[i]];
			if (!added.has(idx)) {
				results.push(rules[idx]);
				added.add(idx);
			}
		}
	}

	// Add description matches
	if (Array.isArray(descIdxs) && descIdxs.length) {
		for (const idx of descIdxs) {
			if (!added.has(idx)) {
				results.push(rules[idx]);
				added.add(idx);
			}
		}
	} else if (descOrder && descInfo) {
		for (let i = 0; i < descOrder.length; i++) {
			const idx = descInfo.idx[descOrder[i]];
			if (!added.has(idx)) {
				results.push(rules[idx]);
				added.add(idx);
			}
		}
	}

	// Fallback to substring matches across both fields
	if (results.length === 0) {
		return rules.filter(r => r.displayName.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
	}

	return results;
});

	// Create virtualized list
	const virtualList = createVirtualizedList({
		data: () => filteredRules(),
		estimateSize: () => 80, // Approximate height of each RuleCard
	});

	// Reference to the scroll container for observing resizes
	const [containerEl, setContainerEl] = createSignal<HTMLDivElement | undefined>(undefined);

	onMount(() => {
		const el = containerEl();
		if (!el) return;

		const throttled = throttle(() => {
			const updater = (virtualList as any).refresh || (virtualList as any).update || (virtualList as any).recalculate;
			if (typeof updater === 'function') {
				try { updater.call(virtualList); } catch (e) { /* ignore */ }
			} else {
				el.dispatchEvent(new Event('scroll'));
				window.dispatchEvent(new Event('resize'));
			}
		}, 120);

		const ro = new ResizeObserver(throttled);
		ro.observe(el);

		onCleanup(() => ro.disconnect());
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
			<div class="h-full bg-(--flexoki-bg) grid" style={{
				"grid-template-rows": "min-content min-content 1fr",
			}}>
				{/* Header */}
				<div class="flex items-center justify-between px-4 py-3 border-x border-(--flexoki-ui-2)">
					<h2 class="text-lg font-semibold text-(--flexoki-tx)">Rule Manager</h2>
					<button
						onClick={props.onClose}
						class="p-1.5 hover:bg-(--flexoki-ui-3) aspect-square rounded-md transition-colors duration-150 flex"
						aria-label="Close rule manager"
					>
						<span class="iconify lucide--x w-5 h-5 text-(--flexoki-tx-2)" />
					</button>
				</div>
				
				{/* Controls */}
				<div class="px-4 py-3 space-y-3 border-x border-b border-(--flexoki-ui-2)">
					{/* Search bar */}
					<div class="relative">
						<input
							type="text"
							value={filterText()}
							onInput={(e) => setFilterText(e.currentTarget.value)}
							placeholder="filter rules..."
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
					
				{/* Import/Export buttons */}
				<div class="flex gap-2">
					<Button onClick={handleExport} icon="lucide--download" text="Export" />
					<Button onClick={handleImport} icon="lucide--upload" text="Import" />
				</div>
					<Show when={importError()}>
						<div class="flex items-start gap-2 p-3 bg-(--flexoki-re) bg-opacity-10 border border-(--flexoki-re) rounded-md">
							<span class="iconify lucide--alert-circle w-5 h-5 text-(--flexoki-re) shrink-0 mt-0.5" />
							<div class="flex-1 min-w-0">
								<p class="text-sm text-(--flexoki-re) wrap-break-word">{importError()}</p>
							</div>
							<button
								onClick={() => setImportError(null)}
								class="p-0.5 hover:bg-(--flexoki-ui-3) rounded transition-colors flex-shrink-0"
								aria-label="Dismiss error"
							>
								<span class="iconify lucide--x w-4 h-4 text-(--flexoki-re)" />
							</button>
						</div>
					</Show>
				</div>
				
				{/* Rule list */}
				<div class="overflow-y-auto p-2 border-x border-[var(--flexoki-ui-2)] min-h-0" {...(virtualList.root as any)} ref={(el) => { setContainerEl(el as HTMLDivElement | undefined); const rootRef = (virtualList.root as any).ref; if (typeof rootRef === 'function') try { rootRef(el); } catch {} }}>
					<Show
							when={filteredRules().length > 0}
							fallback={
								<div class="text-center py-8 text-[var(--flexoki-tx-3)] text-sm">
									No rules match your filter
								</div>
							}
						>
							<div {...virtualList.container} class="w-full">
								<For each={virtualList.item}>
									{virtualList.items((item) => (
										<div {...item.props} class="w-full">
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
			class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-(--flexoki-cyan) hover:brightness-110 active:scale-95 text-white text-sm font-medium rounded-md shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan) focus:ring-offset-2 focus:ring-offset-(--flexoki-bg-2)"
		>
			<span class={`iconify ${props.icon} w-4 h-4`} />
			{props.text}
		</button>
	);
}

export default RuleManager;

