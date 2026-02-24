import React, { useState, useCallback } from "react";
import { Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "./contexts/CartContext";
import { Catalog } from "./pages/Catalog";
import { ProductPage } from "./pages/ProductPage";
import { Garage } from "./pages/Garage";
import { Cart } from "./pages/Cart";
import { Orders } from "./pages/Orders";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { VendorUpload } from "./pages/VendorUpload";
import { VendorProducts } from "./pages/VendorProducts";
import { Warehouse } from "./pages/Warehouse";
import { VendorTeam } from "./pages/VendorTeam";
import { VendorAudit } from "./pages/VendorAudit";
import { Notifications } from "./pages/Notifications";
import { Feedback } from "./pages/Feedback";
import { Profile } from "./pages/Profile";
import { useAuth } from "./hooks/useAuth";
import { useCartCount } from "./hooks/useCartCount";
import { useUnreadNotificationsCount } from "./hooks/useUnreadNotificationsCount";
import { NotificationsCountProvider } from "./contexts/NotificationsCountContext";
import { ChatControlProvider } from "./contexts/ChatControlContext";
import { Header } from "./components/Header";
import { ChatAssistant } from "./components/ChatAssistant";
import { Home } from "./pages/Home";
import { RequireAuth } from "./components/RequireAuth";
import { RequireRole } from "./components/RequireRole";
import { RequireOnboardingDone } from "./components/RequireOnboardingDone";
import type { Lang } from "./components/Header";
import { StaffAuthProvider } from "./staff/context/StaffAuthContext";
import { StaffRoutes } from "./staff/routes";
import { AdminLayout } from "./components/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminOrderDetail } from "./pages/admin/AdminOrderDetail";
import { AdminVendors } from "./pages/admin/AdminVendors";
import { AdminFeedback } from "./pages/admin/AdminFeedback";
import { AdminFeedbackDetail } from "./pages/admin/AdminFeedbackDetail";
import { AdminAudit } from "./pages/admin/AdminAudit";
import { AdminSearch } from "./pages/admin/AdminSearch";

const LANG_STORAGE_KEY = "agro-lang";

function loadLang(): Lang {
  try {
    const s = localStorage.getItem(LANG_STORAGE_KEY);
    if (s === "ru" || s === "kz") return s;
  } catch {
    /* ignore */
  }
  return "ru";
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout, token } = useAuth();
  const cartItemCount = useCartCount();
  const { count: unreadNotificationsCount, refresh: refreshNotificationsCount } = useUnreadNotificationsCount(
    user?.role === "vendor" || user?.role === "admin" ? token : null
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const onSearchChange = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (value) p.set("q", value);
        else p.delete("q");
        return p;
      });
    },
    [setSearchParams]
  );
  const [lang, setLang] = useState<Lang>(loadLang);
  const onLangChange = useCallback((next: Lang) => {
    setLang(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);
  const [chatOpen, setChatOpen] = useState(false);
  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  return (
    <NotificationsCountProvider refresh={refreshNotificationsCount}>
      <ChatControlProvider openChat={openChat}>
        <div className="min-h-screen bg-gray-50">
          <Header
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            cartItemCount={cartItemCount}
            unreadNotificationsCount={unreadNotificationsCount}
            lang={lang}
            onLangChange={onLangChange}
            user={user}
            onLogout={logout}
            onOpenChat={openChat}
          />
          <main className="p-0 sm:p-4 sm:p-6">{children}</main>
          <ChatAssistant isOpen={chatOpen} onClose={closeChat} />
        </div>
      </ChatControlProvider>
    </NotificationsCountProvider>
  );
}

export default function App() {
  return (
    <CartProvider>
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
      <Layout>
        <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route path="/garage" element={<RequireAuth><RequireOnboardingDone><Garage /></RequireOnboardingDone></RequireAuth>} />
        <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><RequireOnboardingDone><Orders /></RequireOnboardingDone></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/vendor" element={<RequireAuth><RequireRole roles={["admin", "vendor"]}><VendorUpload /></RequireRole></RequireAuth>} />
        <Route path="/vendor/products" element={<RequireAuth><RequireRole roles={["admin", "vendor"]}><VendorProducts /></RequireRole></RequireAuth>} />
        <Route path="/vendor/warehouse" element={<RequireAuth><RequireRole roles={["admin", "vendor"]}><Warehouse /></RequireRole></RequireAuth>} />
        <Route path="/vendor/team" element={<RequireAuth><RequireRole roles={["admin", "vendor"]}><VendorTeam /></RequireRole></RequireAuth>} />
        <Route path="/vendor/audit" element={<RequireAuth><RequireRole roles={["admin", "vendor"]}><VendorAudit /></RequireRole></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole roles={["admin"]}>
                <AdminLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:orderId" element={<AdminOrderDetail />} />
          <Route path="vendors" element={<AdminVendors />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="feedback/:ticketId" element={<AdminFeedbackDetail />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="search" element={<AdminSearch />} />
        </Route>
        <Route
          path="/staff/*"
          element={
            <StaffAuthProvider>
              <StaffRoutes />
            </StaffAuthProvider>
          }
        />
        </Routes>
      </Layout>
    </CartProvider>
  );
}
