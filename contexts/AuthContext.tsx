// contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and token from localStorage on mount
  useEffect(() => {
    console.log('🔄 AuthContext: Initializing...');
    
    try {
      // Try both 'token' and 'access_token' for backward compatibility
      const storedToken = localStorage.getItem('token') || localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      console.log('🔍 Stored token exists:', !!storedToken);
      console.log('🔍 Stored user exists:', !!storedUser);

      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log('✅ Restored session for:', parsedUser.email);
      } else {
        console.log('⚠️ No stored session found');
      }
    } catch (e) {
      console.error('❌ Failed to restore session:', e);
      localStorage.removeItem('token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    
    setIsLoading(false);
  }, []);

  // Global fetch interceptor: auto refresh access token on 401
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const originalFetch = window.fetch.bind(window);
    let refreshPromise: Promise<string | null> | null = null;

    const clearSession = () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    };

    const refreshAccessToken = async (): Promise<string | null> => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      const response = await originalFetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      const data = await response.json().catch(() => null);
      const nextToken = data?.access_token as string | undefined;
      if (!nextToken) {
        clearSession();
        return null;
      }

      localStorage.setItem('access_token', nextToken);
      localStorage.setItem('token', nextToken);
      setToken(nextToken);
      return nextToken;
    };

    const getUrlString = (input: RequestInfo | URL) => {
      if (typeof input === 'string') return input;
      if (input instanceof URL) return input.toString();
      if (input instanceof Request) return input.url;
      return String(input);
    };

    type RequestInitWithRetry = RequestInit & { __retry?: boolean };

    window.fetch = async (input: RequestInfo | URL, init?: RequestInitWithRetry) => {
      const response = await originalFetch(input, init);
      if (response.status !== 401) return response;

      const url = getUrlString(input);
      if (!url.startsWith(apiBase)) return response;
      if (url.includes('/auth/login') || url.includes('/auth/refresh')) return response;

      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      const hasAuthHeader = headers.has('Authorization') || headers.has('authorization');
      if (!hasAuthHeader) return response;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return response;

      const retryFlag = init?.__retry;
      if (retryFlag) return response;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (!newToken) return response;

      headers.set('Authorization', `Bearer ${newToken}`);

      const retryInit: RequestInitWithRetry = {
        ...(init || {}),
        headers,
        __retry: true
      };

      const retryInput = input instanceof Request ? input.clone() : input;
      return originalFetch(retryInput, retryInit);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 Login attempt for:', email);
      
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      console.log('🌐 API URL:', baseURL);
      
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          type: 'admin'
        }),
      });

      console.log('📡 Login response status:', response.status);

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        let message = 'Invalid email or password';

        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            message = parsed?.message || parsed?.error || message;
            console.error('❌ Login failed:', parsed);
          } catch {
            message = raw;
            console.error('❌ Login failed:', raw);
          }
        } else {
          console.error('❌ Login failed: empty response body');
        }

        throw new Error(message);
      }

      const data = await response.json();
      console.log('📦 Login response data:', {
        hasToken: !!data.access_token,
        hasUser: !!data.user,
        userRole: data.user?.role
      });

      // Validate admin role
      if (data.user.role !== 'admin') {
        console.error('❌ Not an admin user:', data.user.role);
        throw new Error('Access denied. Admin privileges required.');
      }

      // Store token and user in BOTH locations for compatibility
      console.log('💾 Storing token and user...');
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('access_token', data.access_token); // Also store as 'access_token'
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Verify storage
      const storedToken = localStorage.getItem('token');
      const storedAccessToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      console.log('✅ Token stored:', !!storedToken);
      console.log('✅ Access token stored:', !!storedAccessToken);
      console.log('✅ User stored:', !!storedUser);
      
      setToken(data.access_token);
      setUser(data.user);

      console.log('✅ Login successful for:', data.user.email);
      
      return Promise.resolve();
    } catch (error: unknown) {
      console.error('❌ Login error:', error);
      if (error instanceof Error) throw error;
      throw new Error('Login failed');
    }
  };

  const logout = () => {
    console.log('🔓 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    console.log('✅ Logged out successfully');
  };

  const contextValue = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
  };

  console.log('📊 AuthContext state:', {
    hasUser: !!user,
    hasToken: !!token,
    isAuthenticated: contextValue.isAuthenticated,
    isLoading
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
