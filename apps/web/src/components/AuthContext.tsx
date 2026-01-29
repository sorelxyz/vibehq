import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { config } from '../lib/config';
import { getToken, clearToken, getAuthHeaders } from '../lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
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
      fetch(`${config.apiBase}/auth/verify`, {
        headers: getAuthHeaders(),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
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

  const logout = () => {
    clearToken();
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
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
