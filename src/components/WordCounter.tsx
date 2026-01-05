import { Component, createMemo } from 'solid-js';
import { Tally } from '@twocaretcat/tally-ts';

type WordCounterProps = {
    text: string;
};

const tally = new Tally();

const WordCounter: Component<WordCounterProps> = (props) => {
    const counts = createMemo(() => {
        try {
            const res = tally.countAll(props.text || '');
            return {
                words: res.words?.total ?? 0,
                graphemes: res.graphemes?.total ?? 0,
                paragraphs: res.paragraphs?.total ?? 0,
                lines: res.lines?.total ?? 0,
                sentences: res.sentences?.total ?? 0,
            };
        } catch {
            const w = tally.countWords ? tally.countWords(props.text || '') : { total: 0 };
            const s = tally.countSentences ? tally.countSentences(props.text || '') : { total: 0 };
            return { words: w.total ?? 0, graphemes: 0, paragraphs: 0, lines: 0, sentences: s.total ?? 0 };
        }
    });

    return (
        <div class="pt-1 pb-3 px-2 text-sm text-(--flexoki-text-muted)">
            <div class="flex items-center justify-between">
                <div class="text-sm font-medium">Words: {counts().words}</div>
                <div class="text-sm">Characters: {counts().graphemes} &middot; Sentences: {counts().sentences} &middot; Lines: {counts().lines} &middot; Paragraphs: {counts().paragraphs}</div>
            </div>
        </div>
    );
};

export default WordCounter;
