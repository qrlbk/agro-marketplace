import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type Permission = 
  | "dashboard.view"
  | "orders.view"
  | "orders.edit"
  | "vendors.view"
  | "vendors.approve"
  | "feedback.view"
  | "feedback.edit"
  | "users.view"
  | "users.edit"
  | "audit.view"
  | "search.view"
  | "staff.manage"
  | "roles.manage";

export interface StaffRole {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: Permission[];
}

export interface StaffUser {
  id: string;
  login: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
}

interface StaffAuthContextType {
  user: StaffUser | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  isAuthenticated: boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

// Mock roles
const ROLES: Record<string, StaffRole> = {
  super_admin: {
    id: "1",
    name: "Super Admin",
    slug: "super_admin",
    isSystem: true,
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.edit",
      "vendors.view",
      "vendors.approve",
      "feedback.view",
      "feedback.edit",
      "users.view",
      "users.edit",
      "audit.view",
      "search.view",
      "staff.manage",
      "roles.manage",
    ],
  },
  admin: {
    id: "2",
    name: "Admin",
    slug: "admin",
    isSystem: true,
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.edit",
      "vendors.view",
      "vendors.approve",
      "feedback.view",
      "feedback.edit",
      "users.view",
      "audit.view",
      "search.view",
    ],
  },
  support: {
    id: "3",
    name: "Support",
    slug: "support",
    isSystem: true,
    permissions: ["feedback.view", "feedback.edit", "search.view"],
  },
};

export function StaffAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(() => {
    const savedUser = localStorage.getItem("staffUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (login: string, password: string) => {
    // Mock login - для демо используем super_admin
    if (password === "admin") {
      const mockUser: StaffUser = {
        id: "1",
        login,
        name: login === "admin" ? "Администратор" : "Сотрудник",
        role: ROLES.super_admin,
        isActive: true,
      };
      setUser(mockUser);
      localStorage.setItem("staffUser", JSON.stringify(mockUser));
    } else {
      throw new Error("Неверный логин или пароль");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("staffUser");
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.role.permissions.includes(permission);
  };

  return (
    <StaffAuthContext.Provider
      value={{
        user,
        login,
        logout,
        hasPermission,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </StaffAuthContext.Provider>
  );
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext);
  if (context === undefined) {
    throw new Error("useStaffAuth must be used within a StaffAuthProvider");
  }
  return context;
}
