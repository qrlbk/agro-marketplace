import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { staffLogin as apiStaffLogin, staffMe, type StaffMe as StaffMeType } from "../../api/client";

const STAFF_TOKEN_KEY = "staff_token";
const DEMO_TOKEN = "__staff_demo__";

const ALL_PERMISSIONS = [
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
];

const DEMO_STAFF: StaffMeType = {
  id: 0,
  login: "admin",
  name: "Демо-админ",
  role: { id: 1, name: "Super Admin", slug: "super_admin" },
  permissions: ALL_PERMISSIONS,
  is_active: true,
};

type StaffAuthContextValue = {
  token: string | null;
  staff: StaffMeType | null;
  loading: boolean;
  isDemo: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (code: string) => boolean;
  /** Token to use for /admin/* API calls. In demo mode uses main app token so backend works. */
  getTokenForAdminApi: () => string | null;
  refreshStaff: () => Promise<void>;
};

const StaffAuthContext = createContext<StaffAuthContextValue | null>(null);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STAFF_TOKEN_KEY));
  const [staff, setStaff] = useState<StaffMeType | null>(null);
  const [loading, setLoading] = useState(true);

  const isDemo = token === DEMO_TOKEN;

  const loadStaff = useCallback(async () => {
    if (!token) {
      setStaff(null);
      setLoading(false);
      return;
    }
    if (token === DEMO_TOKEN) {
      setStaff(DEMO_STAFF);
      setLoading(false);
      return;
    }
    try {
      const me = await staffMe(token);
      setStaff(me);
    } catch {
      localStorage.removeItem(STAFF_TOKEN_KEY);
      setToken(null);
      setStaff(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const login = useCallback(async (loginValue: string, password: string) => {
    try {
      const res = await apiStaffLogin(loginValue, password);
      localStorage.setItem(STAFF_TOKEN_KEY, res.access_token);
      setToken(res.access_token);
    } catch (err) {
      const isNetworkOr404 =
        err instanceof TypeError ||
        (err instanceof Error && ("status" in err && (err as { status?: number }).status === 404));
      if (isNetworkOr404 && loginValue === "admin" && password === "admin") {
        localStorage.setItem(STAFF_TOKEN_KEY, DEMO_TOKEN);
        setToken(DEMO_TOKEN);
        setStaff(DEMO_STAFF);
        setLoading(false);
        return;
      }
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    setToken(null);
    setStaff(null);
  }, []);

  const hasPermission = useCallback(
    (code: string) => {
      if (!staff) return false;
      if (staff.role.slug === "super_admin") return true;
      return staff.permissions.includes(code);
    },
    [staff]
  );

  const getTokenForAdminApi = useCallback((): string | null => {
    if (token === DEMO_TOKEN) {
      return localStorage.getItem("agro_token");
    }
    return token;
  }, [token]);

  const refreshStaff = useCallback(async () => {
    if (token && token !== DEMO_TOKEN) {
      try {
        const me = await staffMe(token);
        setStaff(me);
      } catch {
        logout();
      }
    }
  }, [token, logout]);

  const value: StaffAuthContextValue = {
    token,
    staff,
    loading,
    isDemo,
    login,
    logout,
    hasPermission,
    getTokenForAdminApi,
    refreshStaff,
  };

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth(): StaffAuthContextValue {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error("useStaffAuth must be used within StaffAuthProvider");
  return ctx;
}
