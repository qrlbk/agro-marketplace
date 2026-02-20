import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Sprout } from "lucide-react";
import type { User } from "../api/client";

export type Lang = "ru" | "kz";

export interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  cartItemCount?: number;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  user: User | null;
  onLogout: () => void;
}

function NavLink({
  to,
  children,
  className = "",
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  const location = useLocation();
  const isActive = location.pathname === to || (to === "/" && location.pathname === "/catalog");
  return (
    <Link
      to={to}
      className={`min-h-12 flex items-center px-3 rounded-md font-semibold ${
        isActive ? "text-emerald-800" : "text-slate-700 hover:text-emerald-800"
      } ${className}`}
    >
      {children}
    </Link>
  );
}

export function Header({
  searchQuery,
  onSearchChange,
  cartItemCount = 0,
  lang,
  onLangChange,
  user,
  onLogout,
}: HeaderProps) {
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    navigate(`/catalog${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10" role="banner">
      <nav className="flex flex-wrap items-center gap-2 sm:gap-4 min-h-12 px-4 py-2" aria-label="Основная навигация">
        <Link
          to="/"
          className="shrink-0 min-h-12 flex items-center gap-2 pl-2 pr-3 -ml-2 rounded-lg hover:bg-emerald-50 transition-colors"
          aria-label="На главную"
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-800 text-white">
            <Sprout className="w-5 h-5" aria-hidden />
          </span>
          <span className="text-emerald-800 font-bold text-lg">Агро Маркетплейс</span>
        </Link>

        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 min-w-[200px] max-w-md order-last w-full sm:order-none sm:mx-2"
          role="search"
          aria-label="Поиск по каталогу"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" aria-hidden />
            <input
              type="search"
              name="q"
              placeholder="Поиск по артикулу или названию…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full min-h-10 sm:min-h-10 pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-slate-900 text-base font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 transition-colors"
              aria-label="Поиск по артикулу или названию"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto shrink-0">
          <div className="flex items-center rounded-md border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => onLangChange("ru")}
              className={`min-h-10 px-3 font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 ${
                lang === "ru"
                  ? "bg-emerald-800 text-white"
                  : "bg-white text-slate-500 hover:bg-gray-50"
              }`}
              aria-label="Русский"
              aria-pressed={lang === "ru"}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => onLangChange("kz")}
              className={`min-h-10 px-3 font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 ${
                lang === "kz"
                  ? "bg-emerald-800 text-white"
                  : "bg-white text-slate-500 hover:bg-gray-50"
              }`}
              aria-label="Қазақша"
              aria-pressed={lang === "kz"}
            >
              KZ
            </button>
          </div>

          {user && (
            <Link
              to="/cart"
              className="relative min-h-12 flex items-center justify-center px-3 text-slate-700 hover:text-emerald-800 rounded-md"
              aria-label="Корзина"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 flex items-center justify-center rounded-full bg-amber-500 text-slate-900 text-xs font-bold">
                  {cartItemCount > 99 ? "99+" : cartItemCount}
                </span>
              )}
            </Link>
          )}

          <NavLink to="/catalog">Каталог</NavLink>
          {user && (
            <>
              <NavLink to="/garage">Мой Гараж</NavLink>
              <NavLink to="/orders">Заказы</NavLink>
            </>
          )}
          {(user?.role === "vendor" || user?.role === "admin") && (
            <>
              <NavLink to="/vendor/products">Мои товары</NavLink>
              <NavLink to="/vendor">Прайс-лист</NavLink>
            </>
          )}
          {user?.role === "admin" && <NavLink to="/admin">Админка</NavLink>}

          <div className="flex items-center gap-2 min-h-12 pl-2 border-l border-gray-200">
            {user ? (
              <span className="text-slate-600 text-sm font-medium">
                {user.phone} ({user.role}){" "}
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-2 font-semibold text-slate-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 rounded"
                  aria-label="Выйти из аккаунта"
                >
                  Выйти
                </button>
              </span>
            ) : (
              <NavLink to="/login">Вход</NavLink>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
