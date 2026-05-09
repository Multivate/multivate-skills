"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "@/services/auth";
import type { RegisterPayload, RegisterStartResult } from "@/services/auth";
import type { AuthUser, LoginOutcome } from "@/types/user";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  completeMfaLogin: (mfaToken: string, code: string) => Promise<AuthUser>;
  registerStart: (payload: RegisterPayload) => Promise<RegisterStartResult>;
  registerVerify: (role: "student" | "instructor", signupToken: string, code: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const u = await authApi.getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const outcome = await authApi.login(email, password);
    if ("mfaRequired" in outcome) {
      return outcome;
    }
    setUser(outcome);
    return outcome;
  }, []);

  const completeMfaLogin = useCallback(async (mfaToken: string, code: string) => {
    const u = await authApi.completeMfaLogin(mfaToken, code);
    setUser(u);
    return u;
  }, []);

  const registerStart = useCallback(async (payload: RegisterPayload) => {
    return authApi.registerStart(payload);
  }, []);

  const registerVerify = useCallback(async (role: "student" | "instructor", signupToken: string, code: string) => {
    const u = await authApi.registerVerify(role, signupToken, code);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      completeMfaLogin,
      registerStart,
      registerVerify,
      logout,
      refreshUser,
    }),
    [user, loading, login, completeMfaLogin, registerStart, registerVerify, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
