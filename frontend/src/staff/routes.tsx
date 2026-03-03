import { Navigate, Route, Routes } from "react-router-dom";
import { useStaffAuth } from "./context/StaffAuthContext";
import { StaffLayout } from "./components/StaffLayout";
import { StaffLogin } from "./pages/StaffLogin";
import { StaffDashboard } from "./pages/StaffDashboard";
import { StaffOrders } from "./pages/StaffOrders";
import { StaffOrderDetail } from "./pages/StaffOrderDetail";
import { StaffVendors } from "./pages/StaffVendors";
import { StaffUsers } from "./pages/StaffUsers";
import { StaffUserProfile } from "./pages/StaffUserProfile";
import { StaffFeedback } from "./pages/StaffFeedback";
import { StaffFeedbackDetail } from "./pages/StaffFeedbackDetail";
import { StaffAudit } from "./pages/StaffAudit";
import { StaffSearch } from "./pages/StaffSearch";
import { StaffEmployees } from "./pages/StaffEmployees";
import { StaffRoles } from "./pages/StaffRoles";
import { StaffProfile } from "./pages/StaffProfile";
import {
  PERMISSION_DASHBOARD_VIEW,
  PERMISSION_ORDERS_VIEW,
  PERMISSION_VENDORS_VIEW,
  PERMISSION_USERS_VIEW,
  PERMISSION_FEEDBACK_VIEW,
  PERMISSION_AUDIT_VIEW,
  PERMISSION_SEARCH_VIEW,
  PERMISSION_STAFF_MANAGE,
  PERMISSION_ROLES_MANAGE,
} from "../constants/permissions";

const PERMISSION_ROUTES: { permission: string; path: string }[] = [
  { permission: PERMISSION_DASHBOARD_VIEW, path: "/staff/dashboard" },
  { permission: PERMISSION_ORDERS_VIEW, path: "/staff/orders" },
  { permission: PERMISSION_VENDORS_VIEW, path: "/staff/vendors" },
  { permission: PERMISSION_USERS_VIEW, path: "/staff/users" },
  { permission: PERMISSION_FEEDBACK_VIEW, path: "/staff/feedback" },
  { permission: PERMISSION_AUDIT_VIEW, path: "/staff/audit" },
  { permission: PERMISSION_SEARCH_VIEW, path: "/staff/search" },
  { permission: PERMISSION_STAFF_MANAGE, path: "/staff/employees" },
  { permission: PERMISSION_ROLES_MANAGE, path: "/staff/roles" },
];

function getFirstAllowedPath(hasPermission: (p: string) => boolean): string {
  for (const { permission, path } of PERMISSION_ROUTES) {
    if (hasPermission(permission)) return path;
  }
  return "/staff/profile";
}

function RequireStaff({ children }: { children: React.ReactNode }) {
  const { staff, loading } = useStaffAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-slate-500">Загрузка…</div>
      </div>
    );
  }
  if (!staff) {
    return <Navigate to="/staff/login" replace />;
  }
  return <>{children}</>;
}

function StaffRedirect() {
  const { hasPermission } = useStaffAuth();
  return <Navigate to={getFirstAllowedPath(hasPermission)} replace />;
}

function RequireStaffPermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { hasPermission } = useStaffAuth();
  if (!hasPermission(permission)) {
    return <Navigate to={getFirstAllowedPath(hasPermission)} replace />;
  }
  return <>{children}</>;
}

export function StaffRoutes() {
  return (
    <Routes>
      <Route path="login" element={<StaffLogin />} />
      <Route
        path="*"
        element={
          <RequireStaff>
            <StaffLayout />
          </RequireStaff>
        }
      >
        <Route index element={<StaffRedirect />} />
        <Route path="dashboard" element={<RequireStaffPermission permission={PERMISSION_DASHBOARD_VIEW}><StaffDashboard /></RequireStaffPermission>} />
        <Route path="orders" element={<RequireStaffPermission permission={PERMISSION_ORDERS_VIEW}><StaffOrders /></RequireStaffPermission>} />
        <Route path="orders/:orderId" element={<RequireStaffPermission permission={PERMISSION_ORDERS_VIEW}><StaffOrderDetail /></RequireStaffPermission>} />
        <Route path="vendors" element={<RequireStaffPermission permission={PERMISSION_VENDORS_VIEW}><StaffVendors /></RequireStaffPermission>} />
        <Route path="users" element={<RequireStaffPermission permission={PERMISSION_USERS_VIEW}><StaffUsers /></RequireStaffPermission>} />
        <Route path="users/:userId" element={<RequireStaffPermission permission={PERMISSION_USERS_VIEW}><StaffUserProfile /></RequireStaffPermission>} />
        <Route path="feedback" element={<RequireStaffPermission permission={PERMISSION_FEEDBACK_VIEW}><StaffFeedback /></RequireStaffPermission>} />
        <Route path="feedback/:ticketId" element={<RequireStaffPermission permission={PERMISSION_FEEDBACK_VIEW}><StaffFeedbackDetail /></RequireStaffPermission>} />
        <Route path="audit" element={<RequireStaffPermission permission={PERMISSION_AUDIT_VIEW}><StaffAudit /></RequireStaffPermission>} />
        <Route path="search" element={<RequireStaffPermission permission={PERMISSION_SEARCH_VIEW}><StaffSearch /></RequireStaffPermission>} />
        <Route path="employees" element={<RequireStaffPermission permission={PERMISSION_STAFF_MANAGE}><StaffEmployees /></RequireStaffPermission>} />
        <Route path="roles" element={<RequireStaffPermission permission={PERMISSION_ROLES_MANAGE}><StaffRoles /></RequireStaffPermission>} />
        <Route path="profile" element={<StaffProfile />} />
      </Route>
    </Routes>
  );
}
