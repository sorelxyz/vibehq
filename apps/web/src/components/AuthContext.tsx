import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { config } from '../lib/config';
import { getToken, setToken, clearToken, getAuthHeaders } from '../lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if already authenticated on mount
  useEffect(() => {
    const stored = getToken();
    if (stored) {
      // Verify token still works
      fetch(`${config.apiBase}/projects`, {
        headers: getAuthHeaders(),
      })
        .then((res) => {
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            clearToken();
          }
          setIsLoading(false);
        })
        .catch(() => {
          clearToken();
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      // Test if password works by making an authenticated request
      const res = await fetch(`${config.apiBase}/projects`, {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      
      if (res.ok) {
        setToken(password);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearToken();
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
