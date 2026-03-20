export function lintKindVar(lintKind: string): string {
	return `--lint-kind-${lintKind.toLowerCase().replace(/([a-z])([A-Z])/g, '$1-$2')}`;
}

export function lintKindColor(lintKind: string): string {
	return `rgb(var(${lintKindVar(lintKind)}))`;
}

export function lintKindBackgroundColor(lintKind: string): string {
	return `rgb(var(${lintKindVar(lintKind)}) / 0.133)`;
}
