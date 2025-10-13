import { Component, For, Show } from 'solid-js';
import type { SidebarProps } from '../types';

const Sidebar: Component<SidebarProps> = (props) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const isSelected = (issueId: string) => props.selectedIssueId === issueId;

  return (
    <div class="w-80 h-full border-l border-gray-200 bg-gray-50 overflow-auto">
      <div class="p-4">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Issues</h2>
        
        <Show
          when={props.issues.length > 0}
          fallback={<p class="text-sm text-gray-500 text-center py-8">No issues found</p>}
        >
          <div class="space-y-2">
            <For each={props.issues}>
              {(issue) => (
                <div
                  class="p-3 rounded-md border cursor-pointer transition-colors"
                  classList={{
                    'bg-blue-50 border-blue-300': isSelected(issue.id),
                    'bg-white border-gray-200 hover:border-gray-300': !isSelected(issue.id),
                  }}
                  onClick={() => props.onIssueSelect(issue.id)}
                >
                  <div class="flex items-start gap-2">
                    <span
                      class={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getSeverityColor(issue.severity)}`}
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-gray-900">{issue.lint.message()}</p>
                      <p class="text-xs text-gray-500 mt-1">
                        "{issue.lint.get_problem_text()}"
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Sidebar;
