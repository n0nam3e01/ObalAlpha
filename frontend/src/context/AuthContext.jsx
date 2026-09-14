import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, setToken, isAuthed } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthed()) return setLoading(false);
    apiFetch('/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  async function authenticate(mode, values) {
    const data = await apiFetch(`/auth/${mode}`, {
      method: 'POST', body: JSON.stringify(values), skipAuth: true,
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

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
