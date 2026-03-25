import { Component, createSignal, createMemo, For, Show } from 'solid-js';
import SidebarPanel from './SidebarPanel';
import DictCard from './DictCard';

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

	const showClearAll = () => props.words.length > 0 && !filterText().trim();

	const handleAdd = () => {
		const word = filterText().trim().replaceAll(' ', '');
		if (!word || props.words.includes(word)) return;
		props.onAdd(word);
		setFilterText('');
	};

	const handleClearAll = () => {
		if (window.confirm(`Remove all ${props.words.length} word${props.words.length === 1 ? '' : 's'} from the dictionary?`)) {
			props.onClearAll?.();
		}
	};

	const startEdit = (word: string) => {
		setEditingWord(word);
		setEditValue(word);
	};

	const handleEditSave = (oldWord: string) => {
		const newWord = editValue().trim().replaceAll(' ', '');
		if (newWord && newWord !== oldWord && !props.words.includes(newWord)) {
			props.onEdit(oldWord, newWord);
		}
		setEditingWord(null);
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
							<DictCard
								word={word}
								isEditing={editingWord() === word}
								editValue={editValue()}
								onEditStart={() => startEdit(word)}
								onEditChange={setEditValue}
								onEditSave={() => handleEditSave(word)}
								onEditCancel={() => setEditingWord(null)}
								onRemove={() => props.onRemove(word)}
							/>
						)}
					</For>
				</div>
			</Show>
		</SidebarPanel>
	);
};

export default DictManager;
