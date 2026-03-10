import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { loginApi, registerApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('safechat_token');
    const stored = localStorage.getItem('safechat_user');
    if (token && stored) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await loginApi(username, password);
    const { token, user: userData } = res.data;
    localStorage.setItem('safechat_token', token);
    localStorage.setItem('safechat_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    return userData;
  };

  const register = async (username, email, password, displayName) => {
    const res = await registerApi({
      username, email, password, display_name: displayName,
    });
    const { token, user: userData } = res.data;
    localStorage.setItem('safechat_token', token);
    localStorage.setItem('safechat_user', JSON.stringify(userData));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('safechat_token');
    localStorage.removeItem('safechat_user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (updated) => {
    const merged = { ...user, ...updated };
    setUser(merged);
    localStorage.setItem('safechat_user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
