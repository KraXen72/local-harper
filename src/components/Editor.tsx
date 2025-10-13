import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import type { ViewUpdate } from '@codemirror/view';
import type { EditorProps } from '../types';

const Editor: Component<EditorProps> = (props) => {
  let editorRef!: HTMLDivElement;
  let view: EditorView | undefined;

  onMount(() => {
    if (!editorRef) return;

    const startState = EditorState.create({
      doc: props.content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            props.onContentChange(newContent);
          }
        }),
      ],
    });

    view = new EditorView({
      state: startState,
      parent: editorRef,
    });
  });

  onCleanup(() => {
    if (view) {
      view.destroy();
    }
  });

  // Update editor content when prop changes (if different from current)
  createEffect(() => {
    if (view && view.state.doc.toString() !== props.content) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: props.content,
        },
      });
    }
  });

  return (
    <div class="h-full overflow-auto bg-white">
      <div class="mx-auto max-w-[65ch] py-8 px-4">
        <div ref={editorRef} class="text-base" />
      </div>
    </div>
  );
};

export default Editor;
