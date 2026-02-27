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

const PERMISSION_ROUTES: { permission: string; path: string }[] = [
  { permission: "dashboard.view", path: "/staff/dashboard" },
  { permission: "orders.view", path: "/staff/orders" },
  { permission: "vendors.view", path: "/staff/vendors" },
  { permission: "users.view", path: "/staff/users" },
  { permission: "feedback.view", path: "/staff/feedback" },
  { permission: "audit.view", path: "/staff/audit" },
  { permission: "search.view", path: "/staff/search" },
  { permission: "staff.manage", path: "/staff/employees" },
  { permission: "roles.manage", path: "/staff/roles" },
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
        <Route path="dashboard" element={<RequireStaffPermission permission="dashboard.view"><StaffDashboard /></RequireStaffPermission>} />
        <Route path="orders" element={<RequireStaffPermission permission="orders.view"><StaffOrders /></RequireStaffPermission>} />
        <Route path="orders/:orderId" element={<RequireStaffPermission permission="orders.view"><StaffOrderDetail /></RequireStaffPermission>} />
        <Route path="vendors" element={<RequireStaffPermission permission="vendors.view"><StaffVendors /></RequireStaffPermission>} />
        <Route path="users" element={<RequireStaffPermission permission="users.view"><StaffUsers /></RequireStaffPermission>} />
        <Route path="users/:userId" element={<RequireStaffPermission permission="users.view"><StaffUserProfile /></RequireStaffPermission>} />
        <Route path="feedback" element={<RequireStaffPermission permission="feedback.view"><StaffFeedback /></RequireStaffPermission>} />
        <Route path="feedback/:ticketId" element={<RequireStaffPermission permission="feedback.view"><StaffFeedbackDetail /></RequireStaffPermission>} />
        <Route path="audit" element={<RequireStaffPermission permission="audit.view"><StaffAudit /></RequireStaffPermission>} />
        <Route path="search" element={<RequireStaffPermission permission="search.view"><StaffSearch /></RequireStaffPermission>} />
        <Route path="employees" element={<RequireStaffPermission permission="staff.manage"><StaffEmployees /></RequireStaffPermission>} />
        <Route path="roles" element={<RequireStaffPermission permission="roles.manage"><StaffRoles /></RequireStaffPermission>} />
        <Route path="profile" element={<StaffProfile />} />
      </Route>
    </Routes>
  );
}
