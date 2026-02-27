import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UsageInfo } from '../types.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string;
  plan: string;
  token: string | null;
  usage: UsageInfo | null;
  login: (token: string, username: string, plan?: string) => void;
  logout: () => void;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [plan, setPlan] = useState('free');
  const [token, setToken] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  const fetchUsage = useCallback(async (tok: string) => {
    try {
      const res = await fetch(`${API_URL}/api/usage`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
        setPlan(data.plan);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    const savedPlan = localStorage.getItem('plan') || 'free';
    if (savedToken && savedUsername) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
      setToken(savedToken);
      setPlan(savedPlan);
      fetchUsage(savedToken);
    }
  }, [fetchUsage]);

  const login = (newToken: string, newUsername: string, newPlan = 'free') => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('plan', newPlan);
    setToken(newToken);
    setUsername(newUsername);
    setPlan(newPlan);
    setIsAuthenticated(true);
    fetchUsage(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('plan');
    setToken(null);
    setUsername('');
    setPlan('free');
    setUsage(null);
    setIsAuthenticated(false);
  };

  const refreshUsage = async () => {
    if (token) await fetchUsage(token);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, plan, token, usage, login, logout, refreshUsage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
