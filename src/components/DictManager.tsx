import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import SidebarPanel from './SidebarPanel';

export interface DictManagerProps {
	onClose: () => void;
	words: string[];
	onAdd: (word: string) => void;
	onRemove: (word: string) => void;
	onEdit: (oldWord: string, newWord: string) => void;
	onClearAll?: () => void;
}

const DictManager: Component<DictManagerProps> = (props) => {
	const [filterText, setFilterText] = createSignal('');
	const [editingWord, setEditingWord] = createSignal<string | null>(null);
	const [editValue, setEditValue] = createSignal('');

	const filteredWords = createMemo(() => {
		const f = filterText().trim().toLowerCase();
		return f ? props.words.filter(w => w.toLowerCase().includes(f)) : props.words;
	});

	const canAdd = () => {
		const f = filterText().trim();
		return f.length > 0 && !props.words.includes(f);
	};

	// Show "Clear all" only when input is empty and there are words to clear
	const showClearAll = () => props.words.length > 0 && !filterText().trim();

	const handleAdd = () => {
		const word = filterText().trim();
		if (!word || props.words.includes(word)) return;
		props.onAdd(word);
		setFilterText('');
	};

	const handleClearAll = () => {
		if (window.confirm(`Remove all ${props.words.length} word${props.words.length === 1 ? '' : 's'} from the dictionary?`)) {
			props.onClearAll?.();
		}
	};

	const handleEditSave = (oldWord: string) => {
		const newWord = editValue().trim();
		if (newWord && newWord !== oldWord) props.onEdit(oldWord, newWord);
		setEditingWord(null);
	};

	const startEdit = (word: string) => {
		setEditingWord(word);
		setEditValue(word);
	};

	return (
		<SidebarPanel
			title="Dictionary"
			onClose={props.onClose}
			filterText={filterText()}
			onFilterChange={setFilterText}
			filterPlaceholder="Search or add word..."
			onFilterKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
			filterAddon={
				<>
					<Show when={showClearAll()}>
						<button
							onClick={handleClearAll}
							class="px-3 py-2 bg-(--flexoki-red)/15 text-(--flexoki-red) text-sm font-medium rounded-md hover:bg-(--flexoki-red)/25 active:scale-95 transition-all shrink-0"
						>
							Clear all
						</button>
					</Show>
					<Show when={canAdd()}>
						<button
							onClick={handleAdd}
							class="px-3 py-2 bg-(--flexoki-cyan) text-white text-sm font-medium rounded-md hover:brightness-110 active:scale-95 transition-all shrink-0"
						>
							Add
						</button>
					</Show>
				</>
			}
		>
			<Show
				when={filteredWords().length > 0}
				fallback={
					<div class="text-center py-8 text-(--flexoki-tx-3) text-sm">
						{props.words.length === 0 ? 'No words added yet' : 'No words match your search'}
					</div>
				}
			>
				<div class="space-y-1.5">
					<For each={filteredWords()}>
						{(word) => (
							<div 
								class="flex items-center gap-x-0.5 rounded-lg bg-(--flexoki-ui)/20 border border-(--flexoki-ui-2) group"
								classList={{
									'py-1 ps-1 pe-3': editingWord() === word,
									'py-1 px-3': editingWord() !== word
								}}
							>
								<Show
									when={editingWord() === word}
									fallback={
										<>
											<span class="flex-1 ps-px text-sm text-(--flexoki-tx) truncate">{word}</span>
											<button
												onClick={() => startEdit(word)}
												class="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 hover:bg-(--flexoki-ui-2) rounded"
												aria-label="Edit word"
											>
												<span class="iconify lucide--pencil w-3.5 h-3.5 text-(--flexoki-tx)" />
											</button>
											<button
												onClick={() => props.onRemove(word)}
												class="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 hover:bg-(--flexoki-ui-2) rounded"
												aria-label="Delete word"
											>
												<span class="iconify lucide--trash-2 w-3.5 h-3.5 text-(--flexoki-red)" />
											</button>
										</>
									}
								>
									<input
										type="text"
										value={editValue()}
										onInput={(e) => setEditValue(e.currentTarget.value)}
										onKeyDown={(e) => {
											if (e.key === 'Enter') handleEditSave(word);
											if (e.key === 'Escape') setEditingWord(null);
										}}
										class="w-full text-sm bg-(--flexoki-bg) border border-(--flexoki-ui-3) outline-none text-(--flexoki-tx) focus:ring-1 focus:ring-(--flexoki-cyan) rounded px-2 py-0.5"
										autofocus
									/>
									<button
										onClick={() => handleEditSave(word)}
										class="hover:bg-(--flexoki-ui-3) rounded px-1.5 py-0.5"
										aria-label="Save"
									>
										<span class="iconify lucide--check w-3.5 h-3.5 text-(--flexoki-green)" />
									</button>
									<button
										onClick={() => setEditingWord(null)}
										class="hover:bg-(--flexoki-ui-3) rounded px-1.5 py-0.5"
										aria-label="Cancel"
									>
										<span class="iconify lucide--x w-3.5 h-3.5 text-(--flexoki-tx-2)" />
									</button>
								</Show>
							</div>
						)}
					</For>
				</div>
			</Show>
		</SidebarPanel>
	);
};

export default DictManager;
