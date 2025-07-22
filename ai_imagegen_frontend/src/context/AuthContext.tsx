import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCredits } from './CreditsContext';
import {
  registerUser,
  loginUser,
} from '../api/authApi';
import { getMyProfile } from '../api/profileApi';

type User = {
  id: string;
  username: string;
  email: string;
};

interface AuthContextType {
  currentUser: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { fetchCredits } = useCredits();

  const loadUser = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await getMyProfile();
      setUser(res.data);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Failed to load user:', err);
      logout(false); // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await loginUser({ username, password });
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      await loadUser();
      await fetchCredits();
      toast.success('✅ Login successful!');
      navigate('/community');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      await registerUser({ username, email, password });
      toast.success('🎉 Registration successful!');
      navigate('/login');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed.';
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const logout = (redirect = true) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
    if (redirect) {
      toast.info('👋 You’ve been logged out.');
      navigate('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{ currentUser: user, login, logout, register, isAuthenticated, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
