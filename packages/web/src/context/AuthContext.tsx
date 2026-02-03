import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, logout as apiLogout } from "../api/auth";
import { setSession } from "../api/client";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("couchpick-session"));
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string, remember?: boolean) => {
    setError(null);
    try {
      await apiLogin({ email, password, remember });
      setIsAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesión");
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
