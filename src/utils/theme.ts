export const THEME_STORAGE_KEY = 'harper-theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

const isThemePreference = (value: string | null): value is ThemePreference =>
	value === 'system' || value === 'light' || value === 'dark';

/** Reads the saved preference, falling back to the operating system setting. */
export function getThemePreference(): ThemePreference {
	const saved = localStorage.getItem(THEME_STORAGE_KEY);
	return isThemePreference(saved) ? saved : 'system';
}

/** Resolves a user preference to the palette that should currently be displayed. */
export function resolveTheme(
	preference: ThemePreference,
	prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches,
): ResolvedTheme {
	return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

/** Applies the resolved palette to the document and browser chrome. */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
	const resolved = resolveTheme(preference);
	document.documentElement.dataset.theme = resolved;
	document.documentElement.style.colorScheme = resolved;
	document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
		?.setAttribute('content', resolved === 'dark' ? '#100f0f' : '#fffcf0');
	return resolved;
}

/** Saves and immediately applies a theme preference. */
export function saveThemePreference(preference: ThemePreference): ResolvedTheme {
	localStorage.setItem(THEME_STORAGE_KEY, preference);
	return applyTheme(preference);
}
