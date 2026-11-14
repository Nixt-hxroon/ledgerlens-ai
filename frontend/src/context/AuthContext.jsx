import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ledgerlens_access_token');
      const savedUser = localStorage.getItem('ledgerlens_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Verify with backend
          const me = await authService.getMe();
          if (me) {
            setUser(me);
            localStorage.setItem('ledgerlens_user', JSON.stringify(me));
          }
        } catch (e) {
          console.warn('Session verification failed, logging out');
          localStorage.removeItem('ledgerlens_access_token');
          localStorage.removeItem('ledgerlens_refresh_token');
          localStorage.removeItem('ledgerlens_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('ledgerlens_access_token', data.tokens.accessToken);
    localStorage.setItem('ledgerlens_refresh_token', data.tokens.refreshToken);
    localStorage.setItem('ledgerlens_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (full_name, email, password) => {
    const data = await authService.register({ full_name, email, password });
    localStorage.setItem('ledgerlens_access_token', data.tokens.accessToken);
    localStorage.setItem('ledgerlens_refresh_token', data.tokens.refreshToken);
    localStorage.setItem('ledgerlens_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('ledgerlens_refresh_token');
    await authService.logout(refreshToken);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('ledgerlens_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

