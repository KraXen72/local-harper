import { WorkerLinter } from 'harper.js';
import { binary } from 'harper.js/binary';
import type { Dialect, Linter } from 'harper.js';

export type HarperLinter = Pick<
	Linter,
	| 'setup'
	| 'organizedLints'
	| 'importWords'
	| 'getDefaultLintConfig'
	| 'getLintConfig'
	| 'getLintDescriptions'
	| 'setLintConfig'
	| 'applySuggestion'
>;

export function createWorkerHarperLinter(dialect: Dialect): HarperLinter {
	return new WorkerLinter({ binary, dialect });
}
