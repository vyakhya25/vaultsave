import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vaultsave_token');
    const savedUser = localStorage.getItem('vaultsave_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('vaultsave_token', token);
    localStorage.setItem('vaultsave_user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vaultsave_token');
    localStorage.removeItem('vaultsave_user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateBalance = (newBalance) => {
    const updated = { ...user, walletBalance: newBalance };
    setUser(updated);
    localStorage.setItem('vaultsave_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateBalance, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
