import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ShoppingCart,
  User,
  Bot,
  Bell,
  Menu,
  X,
  LogOut,
  Package,
  Warehouse,
  FileText,
  Settings,
  MessageSquare,
  Tractor as TractorIcon,
  ShoppingBag,
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

interface ImprovedHeaderProps {
  onAIAssistantOpen: () => void;
  cartItemsCount?: number;
  notificationsCount?: number;
}

export function ImprovedHeader({
  onAIAssistantOpen,
  cartItemsCount = 0,
  notificationsCount = 0,
}: ImprovedHeaderProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isVendorMenuOpen, setIsVendorMenuOpen] = useState(false);
  const [language, setLanguage] = useState<"RU" | "KZ">("RU");
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    setIsProfileMenuOpen(false);
  };

  const isVendorOrAdmin = user?.role === "vendor" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-green-100 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🌾</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg text-gray-900">AgroMarket</h1>
                <p className="text-xs text-green-600">AI-Powered</p>
              </div>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              to="/catalog"
              className="text-gray-700 hover:text-green-600 transition-colors font-medium"
            >
              Каталог
            </Link>
            {isAuthenticated && user?.role !== "guest" && (
              <>
                <Link
                  to="/garage"
                  className="text-gray-700 hover:text-green-600 transition-colors font-medium"
                >
                  Гараж
                </Link>
                <Link
                  to="/orders"
                  className="text-gray-700 hover:text-green-600 transition-colors font-medium"
                >
                  Заказы
                </Link>
              </>
            )}

            {/* Vendor Menu */}
            {isVendorOrAdmin && (
              <div className="relative">
                <button
                  onClick={() => setIsVendorMenuOpen(!isVendorMenuOpen)}
                  className="text-gray-700 hover:text-green-600 transition-colors font-medium flex items-center gap-1"
                >
                  Кабинет продавца
                  <motion.span
                    animate={{ rotate: isVendorMenuOpen ? 180 : 0 }}
                    className="text-xs"
                  >
                    ▼
                  </motion.span>
                </button>

                <AnimatePresence>
                  {isVendorMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[200px]"
                    >
                      <Link
                        to="/vendor/products"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsVendorMenuOpen(false)}
                      >
                        <Package size={16} />
                        <span>Мои товары</span>
                      </Link>
                      <Link
                        to="/vendor/warehouse"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsVendorMenuOpen(false)}
                      >
                        <Warehouse size={16} />
                        <span>Склад</span>
                      </Link>
                      <Link
                        to="/vendor"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsVendorMenuOpen(false)}
                      >
                        <FileText size={16} />
                        <span>Прайс-лист</span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>

          {/* Search Bar */}
          <motion.div
            animate={{
              width: isSearchFocused ? "400px" : "300px",
            }}
            className="relative hidden md:flex flex-1 max-w-md"
          >
            <input
              type="text"
              placeholder="Поиск по артикулу или названию..."
              className="w-full px-4 py-2 pl-10 pr-4 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors text-sm"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
          </motion.div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="hidden lg:flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setLanguage("RU")}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  language === "RU"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                RU
              </button>
              <button
                onClick={() => setLanguage("KZ")}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  language === "KZ"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                KZ
              </button>
            </div>

            {/* AI Assistant */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onAIAssistantOpen}
              className="relative p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-shadow"
            >
              <Bot size={20} />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
              />
            </motion.button>

            {/* Notifications (vendor/admin only) */}
            {isVendorOrAdmin && (
              <Link to="/notifications">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <Bell size={20} className="text-gray-700" />
                  {notificationsCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                    >
                      {notificationsCount}
                    </motion.span>
                  )}
                </motion.button>
              </Link>
            )}

            {/* Cart */}
            {isAuthenticated && user?.role !== "guest" && (
              <Link to="/cart">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-2 rounded-xl bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <ShoppingCart size={20} className="text-green-700" />
                  {cartItemsCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                    >
                      {cartItemsCount}
                    </motion.span>
                  )}
                </motion.button>
              </Link>
            )}

            {/* Profile Menu */}
            {isAuthenticated ? (
              <div className="relative hidden lg:block">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <User size={20} className="text-gray-700" />
                </motion.button>

                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[220px]"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-semibold text-sm">{user.phone}</p>
                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                      </div>

                      {isAdmin && (
                        <Link
                          to="/admin/dashboard"
                          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Settings size={16} />
                          <span>Админка</span>
                        </Link>
                      )}

                      <Link
                        to="/feedback"
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <MessageSquare size={16} />
                        <span>Служба поддержки</span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors w-full text-red-600"
                      >
                        <LogOut size={16} />
                        <span>Выйти</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                >
                  Войти
                </motion.button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск..."
              className="w-full px-4 py-2 pl-10 pr-4 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors text-sm"
            />
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              <Link
                to="/catalog"
                className="block py-2 text-gray-700 hover:text-green-600 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Каталог
              </Link>
              {isAuthenticated && user?.role !== "guest" && (
                <>
                  <Link
                    to="/garage"
                    className="block py-2 text-gray-700 hover:text-green-600 transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Гараж
                  </Link>
                  <Link
                    to="/orders"
                    className="block py-2 text-gray-700 hover:text-green-600 transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Заказы
                  </Link>
                </>
              )}
              {isVendorOrAdmin && (
                <>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2">
                      Кабинет продавца
                    </p>
                    <Link
                      to="/vendor/products"
                      className="block py-2 text-gray-700 hover:text-green-600 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Мои товары
                    </Link>
                    <Link
                      to="/vendor/warehouse"
                      className="block py-2 text-gray-700 hover:text-green-600 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Склад
                    </Link>
                    <Link
                      to="/vendor"
                      className="block py-2 text-gray-700 hover:text-green-600 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Прайс-лист
                    </Link>
                  </div>
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="block py-2 text-gray-700 hover:text-green-600 transition-colors font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Админка
                </Link>
              )}
              <Link
                to="/feedback"
                className="block py-2 text-gray-700 hover:text-green-600 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Служба поддержки
              </Link>
              {isAuthenticated && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block py-2 text-red-600 font-medium w-full text-left"
                >
                  Выйти
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
