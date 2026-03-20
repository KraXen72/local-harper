/**
 * Sidebar.tsx — issue list panel
 *
 * Pure display: receives issues + selectedIndex, emits select/ignore callbacks.
 * Auto-scrolls selected item into view.
 */

import { createEffect, For, Show, type Component } from "solid-js";
import type { Issue, LintKind } from "./harper";

// ── Helpers ────────────────────────────────────────────────────────────────

const KIND_COLORS: Record<LintKind, string> = {
  Spelling:      "#D14D41",
  Grammar:       "#4385BE",
  Punctuation:   "#D0A215",
  Capitalization:"#DA702C",
  Style:         "#3AA99F",
  Enhancement:   "#879A39",
  Formatting:    "#8B7EC8",
  Readability:   "#CE5D97",
  Other:         "#8B7EC8",
};

function kindColor(kind: LintKind): string {
  return KIND_COLORS[kind] ?? KIND_COLORS.Other;
}

/** Split a message on backtick spans, return array of {text, isCode} parts. */
function parseMessage(msg: string): Array<{ text: string; isCode: boolean }> {
  const parts: Array<{ text: string; isCode: boolean }> = [];
  const re = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(msg)) !== null) {
    if (m.index > last) parts.push({ text: msg.slice(last, m.index), isCode: false });
    parts.push({ text: m[1], isCode: true });
    last = m.index + m[0].length;
  }
  if (last < msg.length) parts.push({ text: msg.slice(last), isCode: false });
  return parts;
}

// ── Sub-components ─────────────────────────────────────────────────────────

const MessageText: Component<{ message: string }> = (props) => {
  const parts = () => parseMessage(props.message);
  return (
    <span>
      <For each={parts()}>
        {(part) =>
          part.isCode ? (
            <code
              class="font-mono text-xs px-1 py-px rounded"
              style={{
                background: "var(--color-base-800)",
                color: "var(--color-base-100)",
              }}
            >
              {part.text}
            </code>
          ) : (
            <span>{part.text}</span>
          )
        }
      </For>
    </span>
  );
};

// ── Props + Component ──────────────────────────────────────────────────────

interface SidebarProps {
  issues: Issue[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onIgnore: (key: string) => void;
}

const Sidebar: Component<SidebarProps> = (props) => {
  const selectedItems = new Map<number, HTMLLIElement>();

  // Auto-scroll selected item into view
  createEffect(() => {
    const idx = props.selectedIndex;
    if (idx === null) return;
    const el = selectedItems.get(idx);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  return (
    <aside
      class="flex flex-col h-full overflow-hidden"
      style={{
        background: "var(--color-base-950)",
        "border-right": "1px solid var(--color-base-850)",
      }}
    >
      {/* Header */}
      <header
        class="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ "border-bottom": "1px solid var(--color-base-850)" }}
      >
        <span
          class="text-xs font-semibold tracking-widest uppercase"
          style={{ color: "var(--color-base-500)" }}
        >
          Issues
        </span>
        <Show when={props.issues.length > 0}>
          <span
            class="text-xs font-semibold tabular-nums px-2 py-0.5 rounded-full"
            style={{
              background: "color-mix(in srgb, var(--color-red) 20%, transparent)",
              color: "var(--color-red)",
              border: "1px solid color-mix(in srgb, var(--color-red) 35%, transparent)",
            }}
          >
            {props.issues.length}
          </span>
        </Show>
      </header>

      {/* Issue list / empty state */}
      <div class="flex-1 overflow-y-auto min-h-0">
        <Show
          when={props.issues.length > 0}
          fallback={
            <div
              class="flex flex-col items-center justify-center h-full gap-3 px-6 text-center"
              style={{ color: "var(--color-base-600)" }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span class="text-sm">No issues found</span>
            </div>
          }
        >
          <ul class="py-1">
            <For each={props.issues}>
              {(issue, i) => {
                const isSelected = () => props.selectedIndex === i();
                const color = kindColor(issue.lintKind);

                return (
                  <li
                    ref={(el) => selectedItems.set(i(), el)}
                    class="group relative px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      background: isSelected()
                        ? "var(--color-base-850)"
                        : "transparent",
                      "border-left": `3px solid ${isSelected() ? color : "transparent"}`,
                    }}
                    onClick={() => props.onSelect(i())}
                  >
                    {/* Hover bg */}
                    <div
                      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: "var(--color-base-850)" }}
                    />

                    <div class="relative">
                      {/* Kind badge */}
                      <span
                        class="inline-block text-[10px] font-semibold tracking-wider uppercase px-1.5 py-px rounded mb-1.5"
                        style={{
                          background: `color-mix(in srgb, ${color} 15%, transparent)`,
                          color: color,
                          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                        }}
                      >
                        {issue.lintKind}
                      </span>

                      {/* Message */}
                      <p
                        class="text-sm leading-snug mb-2"
                        style={{ color: "var(--color-base-200)" }}
                      >
                        <MessageText message={issue.message} />
                      </p>

                      {/* Ignore button */}
                      <button
                        class="text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{
                          color: "var(--color-base-500)",
                          border: "1px solid var(--color-base-700)",
                          background: "transparent",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onIgnore(issue.key);
                        }}
                      >
                        Ignore
                      </button>
                    </div>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
      </div>

      {/* Keyboard shortcut hints */}
      <footer
        class="shrink-0 px-4 py-3"
        style={{
          "border-top": "1px solid var(--color-base-850)",
          color: "var(--color-base-600)",
        }}
      >
        <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          {[
            ["Ctrl+J/K", "navigate"],
            ["Tab", "suggest"],
            ["Click", "jump"],
          ].map(([key, label]) => (
            <span>
              <kbd
                class="px-1 py-px rounded text-[10px] font-mono"
                style={{
                  background: "var(--color-base-800)",
                  color: "var(--color-base-400, var(--color-base-500))",
                  border: "1px solid var(--color-base-700)",
                }}
              >
                {key}
              </kbd>{" "}
              {label}
            </span>
          ))}
        </div>
      </footer>
    </aside>
  );
};

export default Sidebar;
