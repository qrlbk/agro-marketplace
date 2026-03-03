import { useState, useEffect, useCallback } from "react";
import { request, postAuthRefresh, postLogout, setAuthRefresher, User } from "../api/client";

const TOKEN_KEY = "agro_token";
const REFRESH_TOKEN_KEY = "agro_refresh_token";

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

function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t && isTokenExpired(t)) {
      clearTokens();
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
      clearTokens();
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await request<User>("/auth/me", { token });
      setUser(u);
    } catch {
      setToken(null);
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setAuthRefresher(async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) return null;
      try {
        const data = await postAuthRefresh(refreshToken);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        setToken(data.access_token);
        return data.access_token;
      } catch {
        clearTokens();
        setToken(null);
        setUser(null);
        return null;
      }
    });
    return () => setAuthRefresher(null);
  }, []);

  const login = (accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setToken(accessToken);
  };

  const logout = useCallback(() => {
    const access = localStorage.getItem(TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (access) postLogout(access, refresh).catch(() => {});
    clearTokens();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    if (token) loadUser();
  }, [token, loadUser]);

  return { token, user, loading, login, logout, refreshUser };
}
