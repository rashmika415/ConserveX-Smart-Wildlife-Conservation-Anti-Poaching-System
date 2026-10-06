import { createContext, useContext, useEffect, useState } from 'react';
import { api, get } from '../services/api';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  function logout() {
    sessionStorage.removeItem('conservex-token');
    setUser(null);
  }
  useEffect(() => {
    let active = true;
    if (sessionStorage.getItem('conservex-token'))
      get('/auth/me')
        .then((user) => {
          if (active) setUser(user);
        })
        .catch(() => {
          if (active) logout();
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
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    sessionStorage.setItem('conservex-token', data.data.token);
    setUser(data.data.user);
    return data.data.user;
  }
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
