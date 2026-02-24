import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Garage from "./pages/Garage";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Notifications from "./pages/Notifications";
import Feedback from "./pages/Feedback";
import VendorPricelist from "./pages/vendor/VendorPricelist";
import VendorProducts from "./pages/vendor/VendorProducts";
import VendorWarehouse from "./pages/vendor/VendorWarehouse";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminFeedbackDetail from "./pages/admin/AdminFeedbackDetail";
import AdminSearch from "./pages/admin/AdminSearch";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/catalog",
    Component: Products,
  },
  {
    path: "/products/:category",
    Component: Products,
  },
  {
    path: "/product/:id",
    Component: ProductDetail,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/onboarding",
    Component: Onboarding,
  },
  {
    path: "/garage",
    Component: Garage,
  },
  {
    path: "/cart",
    Component: Cart,
  },
  {
    path: "/orders",
    Component: Orders,
  },
  {
    path: "/notifications",
    Component: Notifications,
  },
  {
    path: "/feedback",
    Component: Feedback,
  },
  // Vendor routes
  {
    path: "/vendor",
    Component: VendorPricelist,
  },
  {
    path: "/vendor/products",
    Component: VendorProducts,
  },
  {
    path: "/vendor/warehouse",
    Component: VendorWarehouse,
  },
  // Admin routes
  {
    path: "/admin/dashboard",
    Component: AdminDashboard,
  },
  {
    path: "/admin/users",
    Component: AdminUsers,
  },
  {
    path: "/admin/orders",
    Component: AdminOrders,
  },
  {
    path: "/admin/orders/:orderId",
    Component: AdminOrderDetail,
  },
  {
    path: "/admin/vendors",
    Component: AdminVendors,
  },
  {
    path: "/admin/feedback",
    Component: AdminFeedback,
  },
  {
    path: "/admin/feedback/:ticketId",
    Component: AdminFeedbackDetail,
  },
  {
    path: "/admin/search",
    Component: AdminSearch,
  },
]);
