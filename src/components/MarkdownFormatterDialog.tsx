import { Component, createSignal, onMount } from 'solid-js';
import { getFormatterConfig, saveFormatterConfig } from '../utils/markdown-formatter';

interface MarkdownFormatterDialogProps {
	onClose: () => void;
}

const MarkdownFormatterDialog: Component<MarkdownFormatterDialogProps> = (props) => {
	const [config, setConfig] = createSignal(getFormatterConfig());
	// oxlint-disable-next-line no-unassigned-vars
	let dialogRef!: HTMLDialogElement;

	onMount(() => {
		dialogRef.showModal();
	});

	const handleSave = () => {
		saveFormatterConfig(config());
		props.onClose();
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === dialogRef) props.onClose();
	};

	return (
		<dialog
			ref={dialogRef}
			onClose={props.onClose}
			onClick={handleBackdropClick}
			class="bg-(--flexoki-bg-2) border border-(--flexoki-ui-2) rounded-xl shadow-2xl w-full max-w-lg p-0 text-(--flexoki-tx) backdrop:bg-black/60 backdrop:backdrop-blur-sm"
		>
			<div class="flex items-center justify-between px-5 py-4 border-b border-(--flexoki-ui-2)">
				<div>
					<h2 class="text-base font-semibold text-(--flexoki-tx)">Markdown Formatter</h2>
					<p class="text-xs text-(--flexoki-tx-3) mt-0.5">
						Configure <span class="font-mono">hongdown</span> options as JSON
					</p>
				</div>
				<button
					onClick={props.onClose}
					class="p-1.5 hover:bg-(--flexoki-ui-3) rounded-md transition-colors"
					aria-label="Close"
				>
					<span class="iconify lucide--x w-4 h-4 text-(--flexoki-tx-2)" />
				</button>
			</div>

			<div class="px-5 py-4">
				<textarea
					value={config()}
					onInput={(e) => setConfig(e.currentTarget.value)}
					spellcheck={false}
					class="w-full h-80 bg-(--flexoki-bg) border border-(--flexoki-ui-2) rounded-lg px-3 py-2.5 text-sm font-mono text-(--flexoki-tx) placeholder-(--flexoki-tx-3) focus:outline-none focus:ring-2 focus:ring-(--flexoki-cyan) focus:border-transparent resize-none"
				/>
			</div>

			<div class="flex justify-end gap-2 px-5 py-4 border-t border-(--flexoki-ui-2)">
				<button
					onClick={props.onClose}
					class="px-4 py-2 text-sm font-medium text-(--flexoki-tx-2) bg-(--flexoki-ui) border border-(--flexoki-ui-3) rounded-lg hover:bg-(--flexoki-ui-2) transition-colors"
				>
					Cancel
				</button>
				<button
					onClick={handleSave}
					class="px-4 py-2 text-sm font-medium text-white bg-(--flexoki-cyan) rounded-lg hover:brightness-110 active:scale-95 transition-all"
				>
					Save
				</button>
			</div>
		</dialog>
	);
};

export default MarkdownFormatterDialog;
