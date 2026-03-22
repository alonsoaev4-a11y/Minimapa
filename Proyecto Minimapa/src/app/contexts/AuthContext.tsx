import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { AdminUser } from '../types/supabase';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_CREDENTIALS = {
  email: 'alonsouas1006@gmail.com',
  password: 'Alonso123'
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured()) {
        const stored = localStorage.getItem('admin_session');
        if (stored) {
          setUser(JSON.parse(stored));
        }
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: 'admin'
        });
      }
      setIsLoading(false);
    };

    checkSession();

    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            role: 'admin'
          });
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) {
      if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
        const adminUser: AdminUser = {
          id: 'local-admin',
          email: 'alonsouas1006@gmail.com',
          role: 'admin'
        };
        localStorage.setItem('admin_session', JSON.stringify(adminUser));
        setUser(adminUser);
        return { success: true };
      }
      return { success: false, error: 'Credenciales incorrectas' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        role: 'admin'
      });
    }

    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      localStorage.removeItem('admin_session');
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
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