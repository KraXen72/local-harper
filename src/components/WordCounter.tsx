import { Component, createMemo } from 'solid-js';
import { Tally } from '@twocaretcat/tally-ts';

const tally = new Tally();

const WordCounter: Component<{ text: string }> = (props) => {
    const counts = createMemo(() => {
        try {
            const res = tally.countAll(props.text || '');
            return {
                words: res.words?.total ?? 0,
                chars: res.graphemes?.total ?? 0,
                sentences: res.sentences?.total ?? 0,
                paragraphs: res.paragraphs?.total ?? 0,
            };
        } catch {
            return { words: 0, chars: 0, sentences: 0, paragraphs: 0 };
        }
    });

    return (
        <div class="py-2 flex justify-between items-center text-xs text-(--flexoki-tx-3)">
        <span class="font-medium text-(--flexoki-tx-2)">{counts().words} words</span>
        <span>
        {counts().chars} chars &middot; {counts().sentences} sentences &middot; {counts().paragraphs} paragraphs
        </span>
        </div>
    );
};

export default WordCounter;
