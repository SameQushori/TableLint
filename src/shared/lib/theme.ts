export type ColorTheme = 'dark' | 'light';

const STORAGE_KEY = 'tablelint-color-theme';

export function getStoredTheme(): ColorTheme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function storeTheme(theme: ColorTheme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme persistence is optional when storage is unavailable.
  }
}

export function initializeTheme(): ColorTheme {
  const theme = getStoredTheme() ?? 'light';
  applyTheme(theme);
  return theme;
}
