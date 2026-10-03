import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const valid = (value) => ['light', 'dark', 'system'].includes(value);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { const saved = localStorage.getItem('obal_theme'); return valid(saved) ? saved : 'system'; }
    catch { return 'system'; }
  });
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#191619' : '#fbf5f3');
    };
    apply();
    try { localStorage.setItem('obal_theme', theme); } catch { /* Theme still works without storage. */ }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
