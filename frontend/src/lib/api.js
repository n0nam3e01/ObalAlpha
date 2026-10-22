const BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'obal_token';

// Old 30-day tokens must not be restored after the server-session migration.
try { globalThis.localStorage?.removeItem(TOKEN_KEY); } catch { /* storage may be disabled */ }
let _token = null;
let tokenVersion = 0;
let accountId = null;
let refreshPending = null;

export function setToken(t, userId = accountId) {
  _token = t;
  accountId = t ? userId : null;
  tokenVersion++;
}

export function getToken() {
  return _token;
}

export function isAuthed() {
  return !!_token;
}

async function responseError(response) {
  const data = await response.json().catch(() => ({ error: 'server_error' }));
  return Object.assign(new Error(data.error || 'server_error'), { code: data.error, status: response.status });
}

export function refreshAccess() {
  if (refreshPending) return refreshPending;
  const startedVersion = tokenVersion;
  const startedAccount = accountId;
  refreshPending = (async () => {
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    if (!response.ok) {
      if (response.status === 401 && tokenVersion === startedVersion) {
        setToken(null);
        globalThis.window?.dispatchEvent(new Event('obal-session-expired'));
      }
      throw await responseError(response);
    }
    const data = await response.json();
    if (tokenVersion === startedVersion) {
      if (startedAccount !== null && data.user?.id !== startedAccount) {
        setToken(null); globalThis.window?.dispatchEvent(new Event('obal-session-expired'));
        throw Object.assign(new Error('account_changed'), { code: 'account_changed', status: 401 });
      }
      setToken(data.token, data.user.id);
    }
    return data;
  })().finally(() => { refreshPending = null; });
  return refreshPending;
}

export async function apiFetch(path, options = {}) {
  const { skipAuth, retried = false, ...rest } = options;
  const requestVersion = tokenVersion;
  const requestAccount = accountId;

  const headers = {
    'Content-Type': 'application/json',
    ...(!skipAuth && _token ? { Authorization: `Bearer ${_token}` } : {}),
    ...rest.headers,
  };

  const response = await fetch(`${BASE_URL}/api${path}`, { ...rest, credentials: 'include', headers });

  if (response.status === 401 && !skipAuth && !retried) {
    if (requestAccount !== accountId) throw Object.assign(new Error('account_changed'), { code: 'account_changed', status: 401 });
    if (tokenVersion === requestVersion) await refreshAccess();
    return apiFetch(path, { ...options, retried: true });
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuth && tokenVersion === requestVersion) {
      setToken(null); globalThis.window?.dispatchEvent(new Event('obal-session-expired'));
    }
    throw await responseError(response);
  }

  return response.json();
}
