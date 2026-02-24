import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface RequireRoleProps {
  children: React.ReactNode;
  /** Allowed roles (e.g. ["admin"] or ["admin", "vendor"]). */
  roles: string[];
}

/** Renders children only if user is authenticated and has one of the allowed roles. Guest is redirected to /onboarding; others without role to /catalog. */
export function RequireRole({ children, roles }: RequireRoleProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-4 text-slate-500">Загрузка…</p>;
  }
  if (!user) {
    return <Navigate to="/catalog" replace />;
  }
  if (user.role === "guest") {
    return <Navigate to="/onboarding" replace />;
  }
  if (!roles.includes(user.role)) {
    return <Navigate to="/catalog" replace />;
  }
  return <>{children}</>;
}
