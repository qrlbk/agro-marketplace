import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Building2,
  Users,
  MessageSquare,
  FileText,
  Search,
  UserCog,
  Shield,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { useStaffAuth, Permission } from "../context/StaffAuthContext";

interface MenuItem {
  path: string;
  icon: any;
  label: string;
  permission: Permission;
}

const menuItems: MenuItem[] = [
  { path: "/staff/dashboard", icon: LayoutDashboard, label: "Дашборд", permission: "dashboard.view" },
  { path: "/staff/orders", icon: ShoppingBag, label: "Заказы", permission: "orders.view" },
  { path: "/staff/vendors", icon: Building2, label: "Поставщики", permission: "vendors.view" },
  { path: "/staff/users", icon: Users, label: "Пользователи", permission: "users.view" },
  { path: "/staff/feedback", icon: MessageSquare, label: "Обращения", permission: "feedback.view" },
  { path: "/staff/audit", icon: FileText, label: "Журнал действий", permission: "audit.view" },
  { path: "/staff/search", icon: Search, label: "Поиск", permission: "search.view" },
  { path: "/staff/employees", icon: UserCog, label: "Сотрудники", permission: "staff.manage" },
  { path: "/staff/roles", icon: Shield, label: "Роли", permission: "roles.manage" },
];

interface StaffLayoutProps {
  children: ReactNode;
}

export function StaffLayout({ children }: StaffLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useStaffAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const visibleMenuItems = menuItems.filter((item) => hasPermission(item.permission));

  const handleLogout = () => {
    logout();
    navigate("/staff/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/staff/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (!user) {
    navigate("/staff/login");
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className={`${
          isMobileMenuOpen ? "block" : "hidden"
        } lg:block w-64 bg-white border-r border-gray-200 fixed lg:relative h-full z-40 overflow-y-auto`}
      >
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🏢</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">Agro Staff</h2>
              <p className="text-xs text-gray-600">Портал сотрудников</p>
            </div>
          </div>

          {/* Menu */}
          <nav className="space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Search */}
            {hasPermission("search.view") && (
              <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 hidden md:block">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </form>
            )}

            {/* Profile Menu */}
            <div className="relative ml-auto">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-gray-600">{user.role.name}</p>
                </div>
                <ChevronDown size={16} className="text-gray-600" />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-semibold text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.login}</p>
                    </div>

                    <Link
                      to="/staff/profile"
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <User size={16} />
                      <span className="text-sm">Профиль</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors w-full text-red-600"
                    >
                      <LogOut size={16} />
                      <span className="text-sm">Выход</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
