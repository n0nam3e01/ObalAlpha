// Active dictionary for the whole UI.
//
// The language is resolved once, at module load, and switching it persists the
// choice and reloads the page. That keeps every screen on a plain
// `import t from '../../i18n'` instead of threading a context and a re-render
// through 19 files — worth revisiting only if language needs to change without
// a reload.

import ru from './ru.js';
import kk from './kk.js';

const STORAGE_KEY = 'obal_lang';
const DICTS = { ru, kk };

export const SUPPORTED = ['ru', 'kk'];
const FALLBACK = 'ru';

export function getLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {
    // private mode / storage disabled — fall through to the default
  }
  return FALLBACK;
}

// Persists the choice. Returns true when the caller should reload, since the
// dictionary below was already bound at import time.
export function setLang(lang) {
  if (!SUPPORTED.includes(lang) || lang === getLang()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    return true;
  } catch {
    return false;
  }
}

const t = DICTS[getLang()] ?? ru;

export default t;
