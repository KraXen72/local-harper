import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import YAML from 'yaml';

type Lockfile = {
	importers: {
		'.': {
			dependencies: Record<string, { version: string }>;
		};
	};
	packages: Record<string, { dependencies?: Record<string, string> }>;
	snapshots?: Record<string, { dependencies?: Record<string, string> }>;
};

const CODEMIRROR_PACKAGES = [
	'@codemirror/autocomplete',
	'@codemirror/commands',
	'@codemirror/language',
	'@codemirror/lint',
];

// Packages whose resolution must be a true singleton across the whole
// CodeMirror dependency graph, and the direct dependents that must all
// agree on that single version. @codemirror/state is included because a
// loose "^6.0.0" range on @codemirror/language (a transitive dependency of
// autocomplete/commands) previously let pnpm resolve a second copy of both
// @codemirror/language and @codemirror/state, which silently broke
// TypeScript's structural typing (TS2345) despite install/tests passing.
const SINGLETON_TARGETS: { name: string; dependents: string[] }[] = [
	{ name: '@codemirror/view', dependents: CODEMIRROR_PACKAGES },
	{ name: '@codemirror/state', dependents: ['@codemirror/view', ...CODEMIRROR_PACKAGES] },
	{ name: '@codemirror/language', dependents: ['@codemirror/autocomplete', '@codemirror/commands'] },
];

function packageKey(name: string, version: string): string {
	return `${name}@${version}`;
}

describe('dependency contracts', () => {
	const lockfile = YAML.parseAllDocuments(readFileSync('pnpm-lock.yaml', 'utf8'))
		.map((document) => document.toJS() as Partial<Lockfile>)
		.find((document) => document.importers?.['.']?.dependencies);

	if (!lockfile?.importers || !lockfile.packages) {
		throw new Error('Could not find project dependency document in pnpm-lock.yaml');
	}

	const rootDeps = lockfile.importers['.'].dependencies;
	const packages = lockfile.packages;
	const snapshots = lockfile.snapshots;

	for (const { name: singletonName, dependents } of SINGLETON_TARGETS) {
		it(`keeps CodeMirror packages on exactly one ${singletonName} resolution`, () => {
			const singletonVersion = rootDeps[singletonName]?.version;

			expect(singletonVersion).toMatch(/^\d+\.\d+\.\d+$/);

			const resolvedKeys = Object.keys(packages).filter((key) => key.startsWith(`${singletonName}@`));

			expect(resolvedKeys, `expected exactly one resolved version of ${singletonName}`).toEqual([
				packageKey(singletonName, singletonVersion),
			]);

			for (const dependencyName of dependents) {
				const dependencyVersion = rootDeps[dependencyName]?.version;
				const key = packageKey(dependencyName, dependencyVersion);

				const snapshotDeps = snapshots?.[key]?.dependencies;
				const packageDeps = packages[key]?.dependencies;
				const resolvedRange = snapshotDeps?.[singletonName] ?? packageDeps?.[singletonName];

				expect(resolvedRange, `${key} should depend on ${singletonName}`).toBe(singletonVersion);
			}
		});
	}
});