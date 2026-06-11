import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from '../api';
import { connectSocket, disconnectSocket } from '../socket';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => localStorage.getItem('cr_theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('cr_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const hydrate = useCallback(async () => {
    try {
      const { user, driver } = await api.me();
      setUser(user); setDriver(driver || null);
      connectSocket();
    } catch { setToken(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  const finish = (res) => {
    setToken(res.token);
    setUser(res.user);
    return api.me().then(({ driver }) => { setDriver(driver || null); connectSocket(); });
  };

  const login = async (email, password) => finish(await api.login(email, password));
  const register = async (body) => finish(await api.register(body));
  const demoLogin = (role) => {
    const map = { passenger: 'aarav@iitr.ac.in', driver: 'driver@iitr.ac.in', admin: 'admin@iitr.ac.in' };
    return login(map[role], 'password123');
  };
  const logout = () => { setToken(null); setUser(null); setDriver(null); disconnectSocket(); };

  return (
    <AuthCtx.Provider value={{ user, driver, loading, login, register, demoLogin, logout, dark, setDark }}>
      {children}
    </AuthCtx.Provider>
  );
}
