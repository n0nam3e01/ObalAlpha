// Venue panel API + session. The under-the-hood token lives in localStorage so
// a manager stays logged in and lands straight on the dashboard next time.
const BASE_URL = import.meta.env.VITE_API_URL;
const VENUE_TOKEN_KEY = 'obal_venue_token';

export function getVenueToken() {
  return localStorage.getItem(VENUE_TOKEN_KEY);
}
export function setVenueToken(token) {
  if (token) localStorage.setItem(VENUE_TOKEN_KEY, token);
  else localStorage.removeItem(VENUE_TOKEN_KEY);
}

export async function venueFetch(path, options = {}) {
  const token = options.token ?? getVenueToken();
  const res = await fetch(`${BASE_URL}/api/venue${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Venue-Token': token } : {}), ...options.headers },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const err = new Error(e.error ?? 'error');
    err.code = e.error;
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Exchange a 6-char code or magic-link key for the venue token.
export async function venueAuth(code) {
  const res = await fetch(`${BASE_URL}/api/venue/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const err = new Error(e.error ?? 'invalid_code');
    err.code = e.error;
    throw err;
  }
  return res.json(); // { token, venue }
}
