import { Component, Show } from 'solid-js';

export interface DictCardProps {
	word: string;
	isEditing: boolean;
	editValue: string;
	onEditStart: () => void;
	onEditChange: (value: string) => void;
	onEditSave: () => void;
	onEditCancel: () => void;
	onRemove: () => void;
}

const DictCard: Component<DictCardProps> = (props) => {
	return (
		<div
			class="flex items-center gap-x-0.5 rounded-lg bg-(--flexoki-ui)/20 border border-(--flexoki-ui-2) group"
			classList={{
				'py-1 ps-1 pe-3': props.isEditing,
				'py-1 px-3': !props.isEditing,
			}}
			onDblClick={props.onEditStart}
		>
			<Show
				when={props.isEditing}
				fallback={
					<>
						<span class="flex-1 ps-px text-sm text-(--flexoki-tx) truncate">{props.word}</span>
						<button
							onClick={props.onEditStart}
							class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 px-1.5 py-0.5 hover:bg-(--flexoki-ui-2) rounded"
							aria-label="Edit word"
						>
							<span class="iconify lucide--pencil w-3.5 h-3.5 text-(--flexoki-tx)" />
						</button>
						<button
							onClick={props.onRemove}
							class="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 px-1.5 py-0.5 hover:bg-(--flexoki-ui-2) rounded"
							aria-label="Delete word"
						>
							<span class="iconify lucide--trash-2 w-3.5 h-3.5 text-(--flexoki-red)" />
						</button>
					</>
				}
			>
				<input
					type="text"
					value={props.editValue}
					onInput={(e) => props.onEditChange(e.currentTarget.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') props.onEditSave();
						if (e.key === 'Escape') props.onEditCancel();
					}}
					class="w-full text-sm bg-(--flexoki-bg) border border-(--flexoki-ui-3) outline-none text-(--flexoki-tx) focus:ring-1 focus:ring-(--flexoki-cyan) rounded px-2 py-0.5"
					autofocus
				/>
				<button
					onClick={props.onEditSave}
					class="hover:bg-(--flexoki-ui-3) rounded px-1.5 py-0.5"
					aria-label="Save"
				>
					<span class="iconify lucide--check w-3.5 h-3.5 text-(--flexoki-green)" />
				</button>
				<button
					onClick={props.onEditCancel}
					class="hover:bg-(--flexoki-ui-3) rounded px-1.5 py-0.5"
					aria-label="Cancel"
				>
					<span class="iconify lucide--x w-3.5 h-3.5 text-(--flexoki-tx-2)" />
				</button>
			</Show>
		</div>
	);
};

export default DictCard;
