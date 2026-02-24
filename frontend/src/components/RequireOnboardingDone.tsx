import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface RequireOnboardingDoneProps {
  children: React.ReactNode;
}

/** Redirects guest (role not yet chosen) to /onboarding. Use after RequireAuth for routes that need a chosen role (orders, garage). */
export function RequireOnboardingDone({ children }: RequireOnboardingDoneProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="p-4 text-slate-500">Загрузка…</p>;
  }
  if (user?.role === "guest") {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}
