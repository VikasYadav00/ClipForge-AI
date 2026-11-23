'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from './api';

export interface User {
  id: string;
  name: string;
  full_name?: string;
  email: string;
  is_admin: boolean;
  is_active?: boolean;
  subscription_plan: string;
  profile_photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('clipforge_token');
    const savedUser = localStorage.getItem('clipforge_user');

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
      // Verify token with backend
      authApi
        .getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('clipforge_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('clipforge_token');
          localStorage.removeItem('clipforge_user');
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('clipforge_token', newToken);
    localStorage.setItem('clipforge_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('clipforge_token');
    localStorage.removeItem('clipforge_user');
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      setUser(res.data);
      localStorage.setItem('clipforge_user', JSON.stringify(res.data));
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
