import { useEffect, useState } from 'react';
import { getSession, setSession, KEYS, API_BASE } from '../lib/db';
import { AuthContext } from './AuthContextValue';

// Backend's AuthController (POST /api/auth/login) returns
// LoginResponse { id, fullname, username, role } — there is no JWT/token,
// since the backend has no Spring Security filter. We treat a response
// that contains an id/username as a successful login.
async function apiLogin(username, password) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getSession);
  const [ready] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const logoutOnHistoryNavigation = () => {
      setSession(null);
      setUser(null);
    };

    const logoutOnRestoredPage = (event) => {
      if (event.persisted) logoutOnHistoryNavigation();
    };

    window.addEventListener('popstate', logoutOnHistoryNavigation);
    window.addEventListener('pageshow', logoutOnRestoredPage);

    return () => {
      window.removeEventListener('popstate', logoutOnHistoryNavigation);
      window.removeEventListener('pageshow', logoutOnRestoredPage);
    };
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    const apiRes = await apiLogin(username, password);
    if (apiRes && apiRes.id && apiRes.username) {
      const authenticatedUser = {
        id: apiRes.id,
        username: apiRes.username,
        name: apiRes.fullname,
        role: apiRes.role,
      };
      localStorage.removeItem(KEYS.TOKEN);
      setSession(authenticatedUser);
      setUser(authenticatedUser);
      setLoading(false);
      return authenticatedUser;
    }

    setUser(null);
    setLoading(false);
    return null;
  };

  const logout = () => {
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, ready, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
