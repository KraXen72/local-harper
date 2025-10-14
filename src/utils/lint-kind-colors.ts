

/**
 * Convert PascalCase lint kind to kebab-case CSS variable name
 * e.g., "WordChoice" -> "word-choice", "Spelling" -> "spelling"
 */
function toKebabCase(str: string): string {
	return str.replace(/([A-Z])/g, (match, letter, offset) => 
		offset > 0 ? `-${letter.toLowerCase()}` : letter.toLowerCase()
	);
}

/**
 * Get the CSS variable name for a lint kind
 * @param lintKindKey - The lint kind key (e.g., "Spelling", "WordChoice")
 * @returns The CSS variable name (e.g., "--lint-kind-spelling")
 */
export function lintKindVar(lintKindKey: string): string {
	return `--lint-kind-${toKebabCase(lintKindKey)}`;
}

/**
 * Get the color for a specific lint kind as rgb() CSS function
 * @param lintKindKey - The lint kind key
 * @returns CSS color string using rgb() with CSS variable
 */
export function lintKindColor(lintKindKey: string): string {
	return `rgb(var(${lintKindVar(lintKindKey)}))`;
}

/**
 * Get the background color for a lint kind with 0.133 alpha
 * @param lintKindKey - The lint kind key
 * @returns CSS color string using rgb() with alpha
 */
export function lintKindBackgroundColor(lintKindKey: string): string {
	return `rgb(var(${lintKindVar(lintKindKey)}) / 0.133)`;
}

/**
 * Get a lint kind color with custom alpha value
 * @param lintKindKey - The lint kind key
 * @param alpha - The alpha value (0-1)
 * @returns CSS color string using rgb() with custom alpha
 */
export function lintKindColorWithAlpha(lintKindKey: string, alpha: number): string {
	return `rgb(var(${lintKindVar(lintKindKey)}) / ${alpha})`;
}
