/**
 * WordCounter.tsx — sticky stats bar at the bottom of the editor.
 *
 * When `selectedText` is provided, shows stats for the selection only;
 * otherwise shows stats for the full document.
 */

import { createMemo, Show, type Component } from "solid-js";
import { tally } from "@twocaretcat/tally-ts";

interface WordCounterProps {
  text: string;
  selectedText: string | null;
}

interface Stats {
  words: number;
  chars: number;
  sentences: number;
  paragraphs: number;
}

function getStats(text: string): Stats {
  const t = tally(text) as Record<string, number>;
  return {
    words:      t["words"]      ?? 0,
    chars:      t["characters"] ?? t["chars"] ?? text.length,
    sentences:  t["sentences"]  ?? 0,
    paragraphs: t["paragraphs"] ?? 0,
  };
}

const WordCounter: Component<WordCounterProps> = (props) => {
  const active = createMemo(() => props.selectedText ?? props.text);
  const isSelection = () => props.selectedText !== null;
  const stats = createMemo(() => getStats(active()));

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div
      class="flex items-center gap-5 px-5 py-2 shrink-0 text-xs tabular-nums select-none"
      style={{
        background: "var(--color-base-950)",
        "border-top": "1px solid var(--color-base-850)",
        color: "var(--color-base-500)",
      }}
    >
      <Show when={isSelection()}>
        <span
          class="text-[10px] font-semibold tracking-wider uppercase mr-1"
          style={{
            color: "var(--color-cyan)",
            background: "color-mix(in srgb, var(--color-cyan) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-cyan) 25%, transparent)",
            padding: "1px 6px",
            borderRadius: "4px",
          }}
        >
          selection
        </span>
      </Show>

      <span>
        <span style={{ color: "var(--color-base-300)" }}>{fmt(stats().words)}</span>
        {" "}words
      </span>
      <span>
        <span style={{ color: "var(--color-base-300)" }}>{fmt(stats().chars)}</span>
        {" "}chars
      </span>
      <span>
        <span style={{ color: "var(--color-base-300)" }}>{fmt(stats().sentences)}</span>
        {" "}sentences
      </span>
      <span>
        <span style={{ color: "var(--color-base-300)" }}>{fmt(stats().paragraphs)}</span>
        {" "}paragraphs
      </span>
    </div>
  );
};

export default WordCounter;
