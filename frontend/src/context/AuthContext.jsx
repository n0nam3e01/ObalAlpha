import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, setToken, isAuthed } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On boot: if we already have a token, load the profile. Browsing is public,
  // so we never block the UI — Home renders regardless.
  useEffect(() => {
    async function boot() {
      if (!isAuthed()) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiFetch('/me');
        setUser(me);
      } catch {
        // token was stale (apiFetch clears it); stay logged out
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, []);

  // Phone-based identity. Returns the user on success.
  async function login(name, phone) {
    const data = await apiFetch('/auth/phone', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
      skipAuth: true,
    });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const me = await apiFetch('/me');
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }

  const value = { user, setUser, loading, login, logout, refreshUser, isAuthed: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
