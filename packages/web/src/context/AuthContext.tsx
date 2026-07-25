import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { login as apiLogin, logout as apiLogout, restoreSession } from "../api/auth";
import { getAuthInvalidatedEventName, getSession } from "../api/client";

type AuthContextValue = {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const ANDROID_AUTOLOGIN_EMAIL = import.meta.env.VITE_ANDROID_AUTOLOGIN_EMAIL?.trim();
const ANDROID_AUTOLOGIN_PASSWORD = import.meta.env.VITE_ANDROID_AUTOLOGIN_PASSWORD;

function canUseAndroidAutoLogin(): boolean {
  return (
    Capacitor.isNativePlatform() &&
    !!ANDROID_AUTOLOGIN_EMAIL &&
    !!ANDROID_AUTOLOGIN_PASSWORD
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getSession());
  const [isBootstrapping, setIsBootstrapping] = useState(() => !!getSession());
  const [error, setError] = useState<string | null>(null);

  const tryAndroidAutoLogin = useCallback(async (): Promise<boolean> => {
    if (!canUseAndroidAutoLogin()) return false;

    try {
      await apiLogin({
        email: ANDROID_AUTOLOGIN_EMAIL!,
        password: ANDROID_AUTOLOGIN_PASSWORD!,
        remember: true,
      });
      setError(null);
      setIsAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!getSession()) {
        if (canUseAndroidAutoLogin()) {
          const restored = await tryAndroidAutoLogin();
          if (active) setIsAuthenticated(restored);
        }
        if (active) setIsBootstrapping(false);
        return;
      }

      try {
        const restored = await restoreSession();
        if (!active) return;
        setIsAuthenticated(restored);
      } catch {
        if (!active) return;
        setIsAuthenticated(false);
      } finally {
        if (active) setIsBootstrapping(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [tryAndroidAutoLogin]);

  useEffect(() => {
    let active = true;

    async function handleAuthInvalidated() {
      if (canUseAndroidAutoLogin()) {
        if (active) setIsBootstrapping(true);
        const restored = await tryAndroidAutoLogin();
        if (!active) return;
        setIsAuthenticated(restored);
        setIsBootstrapping(false);
        return;
      }

      if (!active) return;
      setIsAuthenticated(false);
      setIsBootstrapping(false);
    }

    window.addEventListener(getAuthInvalidatedEventName(), handleAuthInvalidated);
    return () => {
      active = false;
      window.removeEventListener(getAuthInvalidatedEventName(), handleAuthInvalidated);
    };
  }, [tryAndroidAutoLogin]);

  const login = useCallback(async (email: string, password: string, remember?: boolean) => {
    setError(null);
    try {
      await apiLogin({ email, password, remember });
      setIsAuthenticated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar sesion");
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isBootstrapping, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
