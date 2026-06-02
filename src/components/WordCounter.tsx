import { Component, createMemo } from 'solid-js';
import { countText } from '../utils/word-count';

type WordCounterProps = {
    text: string;
};

const WordCounter: Component<WordCounterProps> = (props) => {
    const counts = createMemo(() => {
        return countText(props.text);
    });

    return (
        <div class="pt-1 pb-3 px-2 text-sm text-(--flexoki-text-muted)">
            <div class="flex items-center justify-between">
                <div class="text-sm font-medium mr-2">Words: {counts().words}</div>
                {/* mobile wordcount */}
                <div class="sm:hidden text-sm" aria-hidden="true">Ch: {counts().graphemes} &middot; Sn: {counts().sentences} &middot; Ln: {counts().lines} &middot; Pr: {counts().paragraphs}</div>
                {/* md/lg+ wordcount */}
                <div class="hidden sm:block text-sm" aria-hidden="false">Characters: {counts().graphemes} &middot; Sentences: {counts().sentences} &middot; Lines: {counts().lines} &middot; Paragraphs: {counts().paragraphs}</div>
            </div>
            <div class="mt-1 text-xs opacity-35 text-right">
                build {__BUILD_INFO__.hash} &middot; Harper {__BUILD_INFO__.harperVersion} &middot; {__BUILD_INFO__.date}
            </div>
        </div>
    );
};

export default WordCounter;
