// Theme handling for website mode: default to the OS preference, allow a
// persisted manual override. Applies `data-theme` on <html>.

const THEME_KEY = 'obal_theme';

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY); // 'light' | 'dark' | null
}

export function resolveTheme() {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export function initTheme() {
  applyTheme(resolveTheme());
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const next = resolveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
