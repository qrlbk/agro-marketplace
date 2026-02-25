import { createBrowserRouter } from "react-router";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import StaffOrders from "./pages/StaffOrders";
import StaffOrderDetail from "./pages/StaffOrderDetail";
import StaffVendors from "./pages/StaffVendors";
import StaffUsers from "./pages/StaffUsers";
import StaffFeedback from "./pages/StaffFeedback";
import StaffFeedbackDetail from "./pages/StaffFeedbackDetail";
import StaffAudit from "./pages/StaffAudit";
import StaffSearch from "./pages/StaffSearch";
import StaffEmployees from "./pages/StaffEmployees";
import StaffRoles from "./pages/StaffRoles";
import StaffProfile from "./pages/StaffProfile";

export const router = createBrowserRouter([
  {
    path: "/staff/login",
    Component: StaffLogin,
  },
  {
    path: "/staff",
    Component: StaffDashboard,
  },
  {
    path: "/staff/dashboard",
    Component: StaffDashboard,
  },
  {
    path: "/staff/orders",
    Component: StaffOrders,
  },
  {
    path: "/staff/orders/:id",
    Component: StaffOrderDetail,
  },
  {
    path: "/staff/vendors",
    Component: StaffVendors,
  },
  {
    path: "/staff/users",
    Component: StaffUsers,
  },
  {
    path: "/staff/feedback",
    Component: StaffFeedback,
  },
  {
    path: "/staff/feedback/:id",
    Component: StaffFeedbackDetail,
  },
  {
    path: "/staff/audit",
    Component: StaffAudit,
  },
  {
    path: "/staff/search",
    Component: StaffSearch,
  },
  {
    path: "/staff/employees",
    Component: StaffEmployees,
  },
  {
    path: "/staff/roles",
    Component: StaffRoles,
  },
  {
    path: "/staff/profile",
    Component: StaffProfile,
  },
]);
