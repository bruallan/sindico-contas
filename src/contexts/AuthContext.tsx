import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  restoreAuthSession,
  signInAdmin,
  signInSyndic,
  signOutUser,
  signUpSyndic,
} from '@/services/dataService';
import { AuthUserSession } from '@/types/database';

interface AuthContextValue {
  session: AuthUserSession | null;
  loading: boolean;
  loginSyndic: (email: string, password: string) => Promise<AuthUserSession>;
  registerSyndic: (params: {
    condo_name: string;
    syndic_name: string;
    email: string;
    password: string;
  }) => Promise<AuthUserSession>;
  loginAdmin: (email: string, password: string) => Promise<AuthUserSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthUserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    try {
      const restored = await restoreAuthSession();
      setSession(restored);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const loginSyndic = async (email: string, password: string) => {
    const authSession = await signInSyndic(email, password);
    setSession(authSession);
    return authSession;
  };

  const registerSyndic = async (params: {
    condo_name: string;
    syndic_name: string;
    email: string;
    password: string;
  }) => {
    const authSession = await signUpSyndic(params);
    setSession(authSession);
    return authSession;
  };

  const loginAdmin = async (email: string, password: string) => {
    const authSession = await signInAdmin(email, password);
    setSession(authSession);
    return authSession;
  };

  const logout = async () => {
    await signOutUser();
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        loginSyndic,
        registerSyndic,
        loginAdmin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider.');
  }
  return ctx;
}
