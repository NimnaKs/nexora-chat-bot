import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthState } from '../types';
import apiService from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  const checkAuth = async () => {
    try {
      const token = apiService.getToken();
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const response = await apiService.verifyToken();
      if (response.success && response.user) {
        setAuthState({
          user: response.user,
          token,
          isLoading: false,
        });
      } else {
        apiService.logout();
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      apiService.logout();
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      
      if (response.success && response.user) {
        setAuthState({
          user: response.user,
          token: response.token,
          isLoading: false,
        });
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const logout = () => {
    apiService.logout();
    setAuthState({
      user: null,
      token: null,
      isLoading: false,
    });
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};