import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "guest" | "user" | "farmer" | "vendor" | "admin";

export interface User {
  id: string;
  phone: string;
  name?: string;
  role: UserRole;
  region?: string;
  company?: {
    name: string;
    bin: string;
    status: "pending" | "approved" | "rejected";
  };
}

interface AuthContextType {
  user: User | null;
  login: (phone: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Demo user for testing
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (phone: string, password?: string) => {
    // Mock login - в реальности это будет API call
    const mockUser: User = {
      id: "1",
      phone,
      name: "Демо Пользователь",
      role: "admin", // Для демонстрации ставим admin
      region: "Алматинская область",
    };
    
    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
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
