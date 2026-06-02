import { Tally } from '@twocaretcat/tally-ts';

export type TextCounts = {
	words: number;
	graphemes: number;
	paragraphs: number;
	lines: number;
	sentences: number;
};

const tally = new Tally();

export function countText(text: string): TextCounts {
	const source = text || '';

	try {
		const result = tally.countAll(source);
		return {
			words: result.words?.total ?? 0,
			graphemes: result.graphemes?.total ?? 0,
			paragraphs: result.paragraphs?.total ?? 0,
			lines: result.lines?.total ?? 0,
			sentences: result.sentences?.total ?? 0,
		};
	} catch {
		const words = tally.countWords ? tally.countWords(source) : { total: 0 };
		const sentences = tally.countSentences ? tally.countSentences(source) : { total: 0 };

		return {
			words: words.total ?? 0,
			graphemes: 0,
			paragraphs: 0,
			lines: 0,
			sentences: sentences.total ?? 0,
		};
	}
}
