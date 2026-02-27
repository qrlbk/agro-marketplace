import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { getMe, type User } from "../api/client";

const TOKEN_KEY = "agro_token";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "{}")) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  loading: boolean;
  /** Сохранить JWT и инициировать загрузку профиля через /auth/me. */
  login: (token: string) => void;
  logout: () => void;
  /** Принудительно перечитать /auth/me (например, после онбординга). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    if (isTokenExpired(stored)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return stored;
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
      const me = await getMe(token);
      setUser(me);
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

  const login = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        refreshUser,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
