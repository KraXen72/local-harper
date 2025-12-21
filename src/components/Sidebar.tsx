import { createSignal, For, Show } from 'solid-js';
import { actions, store } from '../store';
import { getLintColor, pascalToWords } from '../utils';
import Toggle from './Toggle'; // Keeping Toggle as it's a generic UI element

export default function Sidebar() {
	const [activeTab, setActiveTab] = createSignal<'issues' | 'rules'>('issues');

	// Helper to toggle rules in the store
	const toggleRule = (key: string, currentVal: boolean) => {
		actions.updateConfig(key as any, !currentVal);
	};

	return (
		<div class="flex flex-col h-full bg-[var(--flexoki-bg-2)] border-l border-[var(--flexoki-ui-2)]">
			{/* --- Tabs --- */}
			<div class="flex border-b border-[var(--flexoki-ui-2)]">
				<button
					onClick={() => setActiveTab('issues')}
					class={`flex-1 p-3 text-sm font-medium transition-colors ${activeTab() === 'issues'
							? 'bg-[var(--flexoki-bg)] text-[var(--flexoki-tx)] border-b-2 border-[var(--flexoki-cyan)]'
							: 'text-[var(--flexoki-tx-2)] hover:bg-[var(--flexoki-ui-2)]'
						}`}
				>
					Issues ({store.issues.length})
				</button>
				<button
					onClick={() => setActiveTab('rules')}
					class={`flex-1 p-3 text-sm font-medium transition-colors ${activeTab() === 'rules'
							? 'bg-[var(--flexoki-bg)] text-[var(--flexoki-tx)] border-b-2 border-[var(--flexoki-cyan)]'
							: 'text-[var(--flexoki-tx-2)] hover:bg-[var(--flexoki-ui-2)]'
						}`}
				>
					Rules
				</button>
			</div>

			{/* --- Content Area --- */}
			<div class="flex-1 overflow-y-auto p-4">

				{/* === ISSUES LIST (Inlined IssueItem) === */}
				<Show when={activeTab() === 'issues'}>
					<div class="flex flex-col gap-3">
						<Show when={store.issues.length === 0}>
							<div class="text-center text-[var(--flexoki-tx-3)] mt-10">
								No issues found. Great job!
							</div>
						</Show>

						<For each={store.issues}>
							{(issue) => (
								<div
									onClick={() => actions.setFocus(issue.id)}
									class={`
                    flex flex-col gap-1 p-3 rounded-md border cursor-pointer transition-all
                    ${store.focusedIssueId === issue.id
											? 'bg-[var(--flexoki-ui-2)] border-[var(--flexoki-cyan)] shadow-sm'
											: 'bg-[var(--flexoki-bg)] border-[var(--flexoki-ui-2)] hover:border-[var(--flexoki-tx-3)]'
										}
                  `}
								>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<div
												class="w-2.5 h-2.5 rounded-full"
												style={{ "background-color": getLintColor(issue.lint.kind) }}
											/>
											<span class="text-xs font-bold uppercase tracking-wide opacity-70">
												{pascalToWords(issue.lint.kind)}
											</span>
										</div>
									</div>
									<p class="text-sm leading-snug opacity-90">
										{issue.lint.message}
									</p>
								</div>
							)}
						</For>
					</div>
				</Show>

				{/* === RULES LIST (Inlined RuleCard) === */}
				<Show when={activeTab() === 'rules'}>
					<div class="flex flex-col gap-3">
						<p class="text-xs text-[var(--flexoki-tx-2)] mb-2 uppercase font-bold tracking-wider">
							Grammar Configuration
						</p>
						{/* 
               We filter the config to show boolean flags that control rules.
               You might want to maintain a specific list of keys to show 
               if the config object contains other non-rule data.
            */}
						<For each={Object.entries(store.config)}>
							{([key, value]) => (
								<Show when={typeof value === 'boolean'}>
									<div class="flex items-center justify-between p-3 rounded-md bg-[var(--flexoki-bg)] border border-[var(--flexoki-ui-2)]">
										<div class="flex flex-col">
											<span class="font-medium text-sm">{pascalToWords(key)}</span>
											<span class="text-xs text-[var(--flexoki-tx-3)]">
												{value ? 'Enabled' : 'Disabled'}
											</span>
										</div>
										<Toggle
											checked={value as boolean}
											onChange={() => toggleRule(key, value as boolean)}
										/>
									</div>
								</Show>
							)}
						</For>
					</div>
				</Show>

			</div>
		</div>
	);
}
