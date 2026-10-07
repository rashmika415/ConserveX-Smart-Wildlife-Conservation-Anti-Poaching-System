import { createContext, useContext, useEffect, useState } from 'react';
import { api, get } from '../services/api';
import { syncWaypoints } from '../services/offlineWaypoints';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  function logout() {
    sessionStorage.removeItem('conservex-token');
    sessionStorage.removeItem('conservex-user');
    setUser(null);
  }
  useEffect(() => {
    let active = true;
    if (sessionStorage.getItem('conservex-token'))
      get('/auth/me')
        .then((user) => {
          if (active) {
            sessionStorage.setItem('conservex-user', JSON.stringify(user));
            setUser(user);
          }
        })
        .catch((error) => {
          if (!active) return;
          if (!error.response) {
            try {
              setUser(JSON.parse(sessionStorage.getItem('conservex-user')));
            } catch {
              logout();
            }
          } else logout();
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    else setLoading(false);
    window.addEventListener('session-expired', logout);
    return () => {
      active = false;
      window.removeEventListener('session-expired', logout);
    };
  }, []);
  useEffect(() => {
    if (!user || user.role !== 'RANGER') return;
    const sync = () => syncWaypoints(user._id).catch(() => {});
    sync();
    window.addEventListener('online', sync);
    const timer = setInterval(sync, 30000);
    return () => {
      window.removeEventListener('online', sync);
      clearInterval(timer);
    };
  }, [user]);
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('conservex-token', data.data.token);
    sessionStorage.setItem('conservex-user', JSON.stringify(data.data.user));
    setUser(data.data.user);
    return data.data.user;
  }
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
