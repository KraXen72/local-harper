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

const CODEMIRROR_VIEW = '@codemirror/view';
const CODEMIRROR_PACKAGES = [
	'@codemirror/autocomplete',
	'@codemirror/commands',
	'@codemirror/language',
	'@codemirror/lint',
];

function packageKey(name: string, version: string): string {
	return `${name}@${version}`;
}

describe('dependency contracts', () => {
	it('keeps CodeMirror packages on exactly one @codemirror/view resolution', () => {
		const lockfile = YAML.parse(readFileSync('pnpm-lock.yaml', 'utf8')) as Lockfile;
		const rootDeps = lockfile.importers['.'].dependencies;
		const viewVersion = rootDeps[CODEMIRROR_VIEW]?.version;

		expect(viewVersion).toMatch(/^\d+\.\d+\.\d+$/);

		const packageViewKeys = Object.keys(lockfile.packages).filter((key) => key.startsWith(`${CODEMIRROR_VIEW}@`));
		expect(packageViewKeys).toEqual([packageKey(CODEMIRROR_VIEW, viewVersion)]);

		for (const dependencyName of CODEMIRROR_PACKAGES) {
			const dependencyVersion = rootDeps[dependencyName]?.version;
			const key = packageKey(dependencyName, dependencyVersion);
			const snapshotDeps = lockfile.snapshots?.[key]?.dependencies;
			const packageDeps = lockfile.packages[key]?.dependencies;
			const viewRange = snapshotDeps?.[CODEMIRROR_VIEW] ?? packageDeps?.[CODEMIRROR_VIEW];

			expect(viewRange, `${key} should depend on ${CODEMIRROR_VIEW}`).toBe(viewVersion);
		}
	});
});
