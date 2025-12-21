// src/components/Sidebar.tsx (simplified)
import { Component, For, Show } from 'solid-js';
import type { SidebarProps } from '../types';
import IssueItem from './IssueItem';

const Sidebar: Component<SidebarProps> = (props) => {
  return (
    <div class="grid h-full border-l border-[var(--flexoki-ui-2)] bg-[var(--flexoki-bg)]/95 backdrop-blur-md shadow-2xl max-w-[400px]" style={{
      "grid-template-rows": "min-content 1fr min-content",
    }}>
      <div class="flex items-center justify-between px-4 py-3 bg-[var(--flexoki-bg)]">
        <div class="flex items-center gap-3">
          <h2 class="text-base font-semibold text-[var(--flexoki-tx)] tracking-tight">Issues</h2>
          <Show when={props.issues.length > 0}>
            <span class="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-md border border-[var(--flexoki-red)]/40 bg-[var(--flexoki-red)]/15 text-[var(--flexoki-red)] text-xs font-bold tracking-wide shadow-sm">
              {props.issues.length}
            </span>
          </Show>
        </div>
      </div>
      
      <div class="w-full h-full overflow-auto">
        <Show
          when={props.issues.length > 0}
          fallback={
            <div class="text-center py-12 px-4 mx-3">
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--flexoki-ui)]/50 mb-3">
                <span class="text-2xl">✓</span>
              </div>
              <p class="text-sm text-[var(--flexoki-tx-2)] font-medium">No issues found</p>
              <p class="text-xs text-[var(--flexoki-tx-3)] mt-1.5">Start typing to see suggestions</p>
            </div>
          }
        >
          <div class="space-y-1.5 mx-3 mb-3">
            <For each={props.issues}>
              {(issue) => (
                <IssueItem
                  issue={issue}
                  isSelected={props.selectedIssueId === issue.id}
                  onSelect={() => props.onIssueSelect(issue.id)}
                  onApplySuggestion={(suggestion) => props.onApplySuggestion(issue.id, suggestion)}
                  onAddToDictionary={props.onAddToDictionary}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
      
      <Show when={props.issues.length > 0}>
        <div class="py-3 border-t border-[var(--flexoki-ui-2)] sticky bottom-0 bg-[var(--flexoki-bg)] z-10">
          <p class="text-xs text-[var(--flexoki-tx-3)] text-center leading-6">
            <kbd class="px-2 py-1 bg-[var(--flexoki-ui)] border border-[var(--flexoki-ui-2)] rounded text-[10px] font-mono text-[var(--flexoki-tx-2)] shadow-sm">Ctrl+J</kbd>
            &nbsp;&nbsp;/&nbsp;&nbsp;
            <kbd class="px-2 py-1 bg-[var(--flexoki-ui)] border border-[var(--flexoki-ui-2)] rounded text-[10px] font-mono text-[var(--flexoki-tx-2)] shadow-sm">Ctrl+K</kbd>
            &nbsp;to navigate
            <br />
            <kbd class="px-2 py-1 bg-[var(--flexoki-ui)] border border-[var(--flexoki-ui-2)] rounded text-[10px] font-mono text-[var(--flexoki-tx-2)] shadow-sm">Ctrl+Space</kbd>
            &nbsp;&nbsp;/&nbsp;&nbsp;
            <kbd class="px-2 py-1 bg-[var(--flexoki-ui)] border border-[var(--flexoki-ui-2)] rounded text-[10px] font-mono text-[var(--flexoki-tx-2)] shadow-sm">Tab</kbd>
            &nbsp;&nbsp;/&nbsp;&nbsp;Click on issue to fix
          </p>
        </div>
      </Show>
    </div>
  );
};

export default Sidebar;