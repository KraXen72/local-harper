export const THEME_STORAGE_KEY = 'harper-theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

const isThemePreference = (value: string | null): value is ThemePreference =>
	value === 'system' || value === 'light' || value === 'dark';

/** Reads the saved preference, defaulting to the operating system setting. */
export function getThemePreference(): ThemePreference {
	try {
		const saved = localStorage.getItem(THEME_STORAGE_KEY);
		return isThemePreference(saved) ? saved : 'system';
	} catch {
		// Private browsing and locked-down web views can deny storage access.
		return 'system';
	}
}

/** Resolves a preference to the palette that should currently be displayed. */
export function resolveTheme(
	preference: ThemePreference,
	prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
): ResolvedTheme {
	return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;
}

/** Applies the resolved palette to the document and browser chrome. */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
	const resolved = resolveTheme(preference);

	if (typeof document === 'undefined') return resolved;

	const root = document.documentElement;
	root.dataset.theme = resolved;
	root.style.colorScheme = resolved;
	document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
		?.setAttribute('content', resolved === 'dark' ? '#100f0f' : '#fffcf0');

	return resolved;
}

/** Saves and immediately applies a theme preference. */
export function saveThemePreference(preference: ThemePreference): ResolvedTheme {
	try {
		localStorage.setItem(THEME_STORAGE_KEY, preference);
	} catch {
		// The active theme still changes when persistent storage is unavailable.
	}

	return applyTheme(preference);
}
