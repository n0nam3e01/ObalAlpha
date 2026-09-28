const BASE_URL = import.meta.env.VITE_API_URL || '';
const KEY = 'obal_admin_token';

export const getAdminToken = () => sessionStorage.getItem(KEY);
export const setAdminToken = (token) => token ? sessionStorage.setItem(KEY, token) : sessionStorage.removeItem(KEY);

export async function adminFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) setAdminToken(null);
    const error = new Error(data.error || 'server_error'); error.status = response.status; throw error;
  }
  return data;
}
