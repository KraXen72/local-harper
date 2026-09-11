import { Component, createMemo, createSignal, onMount, onCleanup, Show } from 'solid-js';
import { countText } from '../utils/word-count';

type WordCounterProps = {
    text: string;
};

const WordCounter: Component<WordCounterProps> = (props) => {
    let counterRef!: HTMLDivElement;
    const [compact, setCompact] = createSignal(true);
    onMount(() => {
        // Side panels can narrow the editor without changing the viewport width.
        const observer = new ResizeObserver(([entry]) => {
            setCompact(entry.contentRect.width < 608);
        });
        observer.observe(counterRef);
        onCleanup(() => observer.disconnect());
    });
    const counts = createMemo(() => {
        return countText(props.text);
    });

    return (
		<div ref={el => { counterRef = el; }} class="pt-1 pb-[22px] px-2 text-sm text-(--flexoki-tx-2)">
            <div class="flex items-center justify-between">
                <div class="text-sm font-medium mr-2 whitespace-nowrap" data-testid="word-count">Words: {counts().words}</div>
                <Show when={compact()} fallback={
                    <div class="text-sm">Characters: {counts().graphemes} &middot; Sentences: {counts().sentences} &middot; Lines: {counts().lines} &middot; Paragraphs: {counts().paragraphs}</div>
                }>
                    <div class="text-xs" aria-label={`Characters: ${counts().graphemes}, Sentences: ${counts().sentences}, Lines: ${counts().lines}, Paragraphs: ${counts().paragraphs}`}>Ch: {counts().graphemes} &middot; Sn: {counts().sentences} &middot; Ln: {counts().lines} &middot; Pr: {counts().paragraphs}</div>
                </Show>
            </div>
            <div class="mt-1 text-xs opacity-35 text-right">
                build {__BUILD_INFO__.hash} &middot; Harper {__BUILD_INFO__.harperVersion} &middot; {__BUILD_INFO__.date}
            </div>
        </div>
    );
};

export default WordCounter;
