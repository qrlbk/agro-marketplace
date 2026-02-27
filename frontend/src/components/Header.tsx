import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Sprout, Bell, Menu as MenuIcon, X, ChevronDown, User as UserIcon, Bot, Home, ListOrdered } from "lucide-react";
import { Menu, Transition } from "@headlessui/react";
import { motion } from "framer-motion";
import type { User } from "../api/client";

export type Lang = "ru" | "kz";

export interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  cartItemCount?: number;
  unreadNotificationsCount?: number;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  user: User | null;
  onLogout: () => void;
  /** Opens the AI chat assistant (design: button in header) */
  onOpenChat?: () => void;
}

function NavLink({
  to,
  children,
  className = "",
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`min-h-12 flex items-center px-3 rounded-xl font-semibold transition-colors ${
        isActive ? "text-green-700 bg-green-50" : "text-gray-700 hover:text-green-600 hover:bg-gray-50"
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
  unreadNotificationsCount = 0,
  lang,
  onLangChange,
  user,
  onLogout,
  onOpenChat,
}: HeaderProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    navigate(`/catalog${params.toString() ? `?${params}` : ""}`);
    setMobileMenuOpen(false);
  };

  const isVendorOrAdmin = user?.role === "vendor" || user?.role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-green-100 shadow-sm" role="banner">
      <nav className="page-container" aria-label="Основная навигация">
        <div className="flex justify-between h-14 sm:h-16 items-center gap-3 sm:gap-4">
          
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Открыть меню</span>
              {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <MenuIcon className="h-6 w-6" aria-hidden="true" />}
            </button>

            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <span className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                <Sprout className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
              </span>
              <span className="text-gray-900 font-bold text-lg sm:text-xl tracking-tight hidden sm:block">
                Агро Маркетплейс
              </span>
            </Link>
          </div>

          {/* Search Bar (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex flex-1 min-w-[180px] max-w-xl mx-4"
            role="search"
          >
            <div className="relative w-full min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden />
              <input
                type="search"
                name="q"
                placeholder="Поиск по артикулу или названию…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full min-w-0 min-h-10 pl-10 pr-4 py-2 rounded-full border-2 border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition-all"
              />
            </div>
          </form>

          {/* Desktop Right Nav */}
          <div className="hidden lg:flex items-center gap-2">
            <NavLink to="/">Главная</NavLink>
            <NavLink to="/catalog">Каталог</NavLink>
            
            {user && (
              <>
                <NavLink to="/garage">Гараж</NavLink>
                <NavLink to="/orders">Заказы</NavLink>
              </>
            )}

            {isVendorOrAdmin && (
              <Menu as="div" className="relative inline-block text-left">
                <Menu.Button className="min-h-12 flex items-center px-3 rounded-xl font-semibold text-gray-700 hover:text-green-600 hover:bg-green-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500">
                  Кабинет продавца
                  <ChevronDown className="ml-1 w-4 h-4" aria-hidden="true" />
                </Menu.Button>
                <Transition
                  as={React.Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1 z-50">
                    <Menu.Item>
                      {({ active }) => (
                        <Link to="/vendor/products" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                          Мои товары
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link to="/vendor/warehouse" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                          Склад
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link to="/vendor" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                          Прайс-лист
                        </Link>
                      )}
                    </Menu.Item>
                    {(user?.role === "admin" || user?.company_role === "owner") && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link to="/vendor/team" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                            Сотрудники
                          </Link>
                        )}
                      </Menu.Item>
                    )}
                    <Menu.Item>
                      {({ active }) => (
                        <Link to="/vendor/audit" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                          Журнал действий
                        </Link>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            <div className="h-6 w-px bg-gray-200 mx-2" aria-hidden="true" />

            {/* AI Assistant (design: purple-pink gradient) */}
            {onOpenChat && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenChat}
                className="relative p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                aria-label="Открыть AI помощника"
              >
                <Bot className="h-5 w-5" aria-hidden />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden />
              </motion.button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center rounded-full bg-gray-100 p-0.5">
              <button
                type="button"
                onClick={() => onLangChange("ru")}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${lang === "ru" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => onLangChange("kz")}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${lang === "kz" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              >
                KZ
              </button>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1 ml-2">
              {isVendorOrAdmin && (
                <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-50 transition-colors">
                  <Bell className="h-6 w-6" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                    </span>
                  )}
                </Link>
              )}
              
              {user && (
                <Link to="/cart" className="relative p-2 text-gray-500 hover:text-green-600 rounded-full hover:bg-green-50 transition-colors">
                  <ShoppingCart className="h-6 w-6" />
                  {cartItemCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                      {cartItemCount > 99 ? "99+" : cartItemCount}
                    </span>
                  )}
                </Link>
              )}
            </div>

            {/* User Profile */}
            {user ? (
              <Menu as="div" className="relative ml-2">
                <Menu.Button className="flex items-center gap-2 p-1.5 rounded-full border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                    <UserIcon className="w-5 h-5" />
                  </div>
                </Menu.Button>
                <Transition
                  as={React.Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                      <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                    </div>
                    {user?.role === "admin" && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link to="/admin" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                            Админ-панель
                          </Link>
                        )}
                      </Menu.Item>
                    )}
                    <Menu.Item>
                      {({ active }) => (
                        <Link to="/profile" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                          Профиль
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <Link to="/feedback" className={`${active ? 'bg-green-50 text-green-800' : 'text-gray-700'} block px-4 py-2 text-sm font-medium`}>
                          Служба поддержки
                        </Link>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={onLogout}
                          className={`${active ? 'bg-red-50 text-red-700' : 'text-red-600'} block w-full text-left px-4 py-2 text-sm font-medium border-t border-gray-100`}
                        >
                          Выйти
                        </button>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            ) : (
              <Link to="/login" className="ml-2 px-4 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors">
                Войти
              </Link>
            )}
          </div>
          
          {/* Mobile Right Icons */}
          <div className="flex lg:hidden items-center gap-1.5">
            {isVendorOrAdmin && (
              <Link to="/notifications" className="relative p-2 text-gray-500">
                <Bell className="h-6 w-6" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <Link to="/cart" className="relative p-2 text-gray-500">
                <ShoppingCart className="h-6 w-6" />
                {cartItemCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-amber-500 rounded-full flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            ) : (
              <Link to="/login" className="text-sm font-bold text-green-600">
                Войти
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="lg:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden />
            <input
              type="search"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full min-h-10 pl-10 pr-4 py-2 rounded-full border-2 border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            />
          </form>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          
          {/* Drawer */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl animate-fade-in">
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4 mb-4">
                <span className="text-green-800 font-bold text-xl">Меню</span>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                <NavLink to="/" onClick={() => setMobileMenuOpen(false)}>Главная</NavLink>
                <NavLink to="/catalog" onClick={() => setMobileMenuOpen(false)}>Каталог</NavLink>
                {onOpenChat && (
                  <button
                    type="button"
                    onClick={() => { onOpenChat(); setMobileMenuOpen(false); }}
                    className="min-h-12 flex items-center px-3 rounded-xl font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors w-full text-left"
                  >
                    <Bot className="h-5 w-5 mr-2 text-purple-500" />
                    AI Помощник
                  </button>
                )}
                {user && (
                  <>
                    <NavLink to="/garage" onClick={() => setMobileMenuOpen(false)}>Мой Гараж</NavLink>
                    <NavLink to="/orders" onClick={() => setMobileMenuOpen(false)}>Заказы</NavLink>
                  </>
                )}
                
                {user?.role === "admin" && (
                  <div className="mt-4 mb-2">
                    <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Админ-панель</p>
                    <div className="mt-2 space-y-1">
                      <NavLink to="/admin" onClick={() => setMobileMenuOpen(false)}>Дашборд</NavLink>
                    </div>
                  </div>
                )}
                {isVendorOrAdmin && (
                  <div className="mt-4 mb-2">
                    <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Кабинет продавца</p>
                    <div className="mt-2 space-y-1">
                      <NavLink to="/vendor/products" onClick={() => setMobileMenuOpen(false)}>Мои товары</NavLink>
                      <NavLink to="/vendor/warehouse" onClick={() => setMobileMenuOpen(false)}>Склад</NavLink>
                      <NavLink to="/vendor" onClick={() => setMobileMenuOpen(false)}>Прайс-лист</NavLink>
                      {(user?.role === "admin" || user?.company_role === "owner") && (
                        <NavLink to="/vendor/team" onClick={() => setMobileMenuOpen(false)}>Сотрудники</NavLink>
                      )}
                      <NavLink to="/vendor/audit" onClick={() => setMobileMenuOpen(false)}>Журнал действий</NavLink>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 mb-2">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Настройки</p>
                  <div className="mt-2 space-y-1">
                    <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>Профиль</NavLink>
                    <NavLink to="/feedback" onClick={() => setMobileMenuOpen(false)}>Служба поддержки</NavLink>
                  </div>
                </div>
              </nav>
            </div>
            
            {/* Mobile Footer */}
            <div className="flex-shrink-0 flex flex-col border-t border-gray-200 p-4 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Язык:</span>
                <div className="flex items-center rounded-full bg-gray-100 p-0.5">
                  <button onClick={() => { onLangChange("ru"); setMobileMenuOpen(false); }} className={`px-4 py-1.5 text-xs font-bold rounded-full ${lang === "ru" ? "bg-white text-green-700 shadow-sm" : "text-gray-500"}`}>RU</button>
                  <button onClick={() => { onLangChange("kz"); setMobileMenuOpen(false); }} className={`px-4 py-1.5 text-xs font-bold rounded-full ${lang === "kz" ? "bg-white text-green-700 shadow-sm" : "text-gray-500"}`}>KZ</button>
                </div>
              </div>
              
              {user && (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{user.phone}</span>
                    <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                  </div>
                  <button
                    onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-md text-sm font-semibold hover:bg-red-100"
                  >
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200"
        aria-label="Быстрая навигация по разделам"
      >
        <div className="page-container">
          <div className="flex justify-between items-stretch py-1.5">
            <Link
              to="/"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-600 hover:text-green-700 py-1"
            >
              <Home className="h-5 w-5" aria-hidden />
              <span>Главная</span>
            </Link>
            <Link
              to="/catalog"
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-600 hover:text-green-700 py-1"
            >
              <ListOrdered className="h-5 w-5" aria-hidden />
              <span>Каталог</span>
            </Link>
            {user && (
              <Link
                to="/garage"
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-600 hover:text-green-700 py-1"
              >
                <Sprout className="h-5 w-5" aria-hidden />
                <span>Гараж</span>
              </Link>
            )}
            {user ? (
              <Link
                to="/orders"
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-600 hover:text-green-700 py-1"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden />
                <span>Заказы</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-600 hover:text-green-700 py-1"
              >
                <UserIcon className="h-5 w-5" aria-hidden />
                <span>Войти</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
