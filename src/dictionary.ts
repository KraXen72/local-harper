const STORAGE_KEY = "harper-dictionary";

export function loadDictionary(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((w) => typeof w === "string");
  } catch {
    // corrupted data — start fresh
  }
  return [];
}

export function saveDictionary(words: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch {
    console.warn("harper: could not save dictionary to localStorage");
  }
}
