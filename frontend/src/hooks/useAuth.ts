import { useState, useEffect, useCallback } from "react";
import { request, User } from "../api/client";

const TOKEN_KEY = "agro_token";

/** Проверка без верификации подписи (только exp). Не использовать для безопасности. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "{}"));
    const exp = payload.exp as number | undefined;
    if (!exp) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t && isTokenExpired(t)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return t;
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (isTokenExpired(token)) {
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await request<User>("/auth/me", { token });
      setUser(u);
    } catch {
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = (t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = useCallback(() => {
    if (token) loadUser();
  }, [token, loadUser]);

  return { token, user, loading, login, logout, refreshUser };
}
