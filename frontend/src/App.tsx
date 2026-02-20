import React, { useState, useCallback } from "react";
import { Routes, Route, useSearchParams } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { Catalog } from "./pages/Catalog";
import { ProductPage } from "./pages/ProductPage";
import { Garage } from "./pages/Garage";
import { Cart } from "./pages/Cart";
import { Orders } from "./pages/Orders";
import { Login } from "./pages/Login";
import { Admin } from "./pages/Admin";
import { VendorUpload } from "./pages/VendorUpload";
import { VendorProducts } from "./pages/VendorProducts";
import { useAuth } from "./hooks/useAuth";
import { useCartCount } from "./hooks/useCartCount";
import { Header } from "./components/Header";
import { ChatAssistant } from "./components/ChatAssistant";
import { RequireAuth } from "./components/RequireAuth";
import { RequireRole } from "./components/RequireRole";
import type { Lang } from "./components/Header";

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
  const { user, logout } = useAuth();
  const cartItemCount = useCartCount();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        cartItemCount={cartItemCount}
        lang={lang}
        onLangChange={onLangChange}
        user={user}
        onLogout={logout}
      />
      <main className="p-4 sm:p-6">{children}</main>
      <ChatAssistant />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <Layout>
        <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/garage" element={<RequireAuth><Garage /></RequireAuth>} />
        <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
        <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<RequireAuth><RequireRole roles={["admin"]}><Admin /></RequireRole></RequireAuth>} />
        <Route path="/vendor" element={<RequireAuth><RequireRole roles={["admin", "vendor"]}><VendorUpload /></RequireRole></RequireAuth>} />
        <Route path="/vendor/products" element={<RequireAuth><RequireRole roles={["admin", "vendor"]}><VendorProducts /></RequireRole></RequireAuth>} />
        </Routes>
      </Layout>
    </CartProvider>
  );
}
