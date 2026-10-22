import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, setToken, refreshAccess } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    refreshAccess().then((data) => { if (active) setUser(data.user); })
      .catch(() => { if (active) { setToken(null); setUser(null); } })
      .finally(() => { if (active) setLoading(false); });
    const expired = () => setUser(null);
    window.addEventListener('obal-session-expired', expired);
    return () => { active = false; window.removeEventListener('obal-session-expired', expired); };
  }, []);

  async function authenticate(mode, values) {
    const data = await apiFetch(`/auth/${mode}`, {
      method: 'POST', body: JSON.stringify(values), skipAuth: true,
    });
    setToken(data.token, data.user.id);
    setUser(data.user);
    return data.user;
  }

  const logout = useCallback(async (all = false) => {
    await apiFetch(all ? '/auth/logout-all' : '/auth/logout', { method: 'POST', body: '{}' });
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthed: !!user, setUser, logout,
      login: (values) => authenticate('login', values),
      register: (values) => authenticate('register', values),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
