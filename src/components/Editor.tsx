import { Component, createEffect, onMount, onCleanup } from 'solid-js';
import { createTiptapEditor } from 'solid-tiptap';
import StarterKit from '@tiptap/starter-kit';
import type { EditorProps } from '../types';
import { HarperDecoration } from '../extensions/harper-decoration';
import { HarperSuggestion, HarperBubbleMenu } from '../extensions/harper-suggestion';

const Editor: Component<EditorProps> = (props) => {
	let editorRef!: HTMLDivElement;

	const editor = createTiptapEditor(() => ({
		extensions: [
			StarterKit,
			HarperDecoration,
			HarperSuggestion,
			HarperBubbleMenu,
		],
		content: `There are some cases where the the standard grammar
checkers don't cut it. That;s where Harper comes in handy.

Harper is an language checker for developers. It can detect
improper capitalization and misspellled words,
as well as a number of other issues.
Like if you break up words you shoul dn't.
Harper can be an lifesaver when writing technical documents, 
emails or other formal forms of communication.

Harper works everywhere, even when you're not online. Since your data
never leaves your device, you don't ned too worry aout us
selling it or using it to train large language models.

The best part: Harper can give you feedback instantly.
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly.

The best part: Harper can give you feedback instantly,
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly,
The best part: Harper can give you feedback instantly,
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly,
The best part: Harper can give you feedback instantly,
For most documents, Harper can serve up suggestions in
under 10 ms, faster that Grammarly.`,
		editable: true,
		element: editorRef,
	}));

	createEffect(() => {
		if (editor() && props.onEditorReady) {
			props.onEditorReady(editor());
		}
	});

	onCleanup(() => {
		const ed = editor();
		if (ed) {
			ed.destroy();
		}
	});

	return (
		<div class="h-full overflow-auto bg-[var(--flexoki-bg)]">
			{/* Top margin: 20vh (1/5 of screen) */}
			<div class="pt-12 px-4 pb-12 flex justify-center">
				<div class="bg-[var(--flexoki-bg)] rounded-xl overflow-hidden shadow-2xl border border-[var(--flexoki-ui-2)] max-w-[84ch] w-full">
					<div ref={editorRef} class="text-base" spellcheck="false" />
				</div>
			</div>
		</div>
	);
};

export default Editor;
