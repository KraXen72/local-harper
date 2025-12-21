// src/components/Editor.tsx (simplified)
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState } from '@codemirror/state';
import { EditorView, highlightSpecialChars, keymap, placeholder, drawSelection } from '@codemirror/view';
import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import type { EditorProps } from '../types';
import { harperExtensions } from '../utils/editor-extensions';
import { darkEditorTheme } from '../utils/editor-extensions';

const Editor: Component<EditorProps> = (props) => {
  let editorRef!: HTMLDivElement;
  let view: EditorView | undefined;
  
  onMount(() => {
    if (!editorRef) return;
    
    const startState = EditorState.create({
      doc: props.content,
      extensions: [
        highlightSpecialChars(),
        history(),
        drawSelection(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        placeholder("Paste text or start typing..."),
        EditorView.lineWrapping,
        darkEditorTheme,
        ...harperExtensions,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newContent = update.state.doc.toString();
            props.onContentChange(newContent);
          }
        })
      ]
    });
    
    view = new EditorView({
      state: startState,
      parent: editorRef,
    });
  });
  
  onCleanup(() => {
    view?.destroy();
  });
  
  // Update content when prop changes
  createEffect(() => {
    if (view && view.state.doc.toString() !== props.content) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: props.content }
      });
    }
  });
  
  // Update issues
  createEffect(() => {
    if (view) {
      view.dispatch({
        effects: (window as any).updateIssuesEffect.of(props.issues)
      });
    }
  });
  
  // Update selection
  createEffect(() => {
    if (view) {
      view.dispatch({
        effects: (window as any).setSelectedIssueEffect.of(props.selectedIssueId)
      });
    }
  });
  
  // Handle click outside to focus editor
  const handleContainerClick = (e: MouseEvent) => {
    if (view && !editorRef.contains(e.target as Node)) {
      view.focus();
    }
  };
  
  return (
    <div class="h-full overflow-auto" onClick={handleContainerClick}>
      <div class="pt-12 px-4 pb-12 flex justify-center">
        <div class="bg-[var(--flexoki-bg)] rounded-xl overflow-hidden shadow-2xl border border-[var(--flexoki-ui-2)] max-w-[84ch] w-full">
          <div ref={editorRef} class="text-base" />
        </div>
      </div>
    </div>
  );
};

export default Editor;