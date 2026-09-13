const BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'obal_token';

let _token = localStorage.getItem(TOKEN_KEY) || null;

export function setToken(t) {
  _token = t;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return _token;
}

export function isAuthed() {
  return !!_token;
}

export async function apiFetch(path, options = {}) {
  const { skipAuth, ...rest } = options;

  const headers = {
    'Content-Type': 'application/json',
    ...(!skipAuth && _token ? { Authorization: `Bearer ${_token}` } : {}),
    ...rest.headers,
  };

  const response = await fetch(`${BASE_URL}/api${path}`, { ...rest, headers });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'server_error' }));
    const error = new Error(err.error ?? 'server_error');
    error.code = err.error;
    error.status = response.status;
    // A stale/invalid token: clear it so the app can re-auth.
    if (response.status === 401 && !skipAuth) setToken(null);
    throw error;
  }

  return response.json();
}
