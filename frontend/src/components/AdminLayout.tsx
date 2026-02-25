import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Search, LayoutDashboard, Users, ShoppingBag, Truck, MessageSquare, FileText } from "lucide-react";

const nav = [
  { to: "/admin/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { to: "/admin/users", label: "Пользователи", icon: Users },
  { to: "/admin/orders", label: "Заказы", icon: ShoppingBag },
  { to: "/admin/vendors", label: "Поставщики", icon: Truck },
  { to: "/admin/feedback", label: "Обращения", icon: MessageSquare },
  { to: "/admin/audit", label: "Журнал действий", icon: FileText },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQ.trim();
    if (q) navigate(`/admin/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0">
      <aside className="lg:w-56 shrink-0 flex flex-row lg:flex-col gap-2 lg:gap-1 border-b lg:border-b-0 lg:border-r border-gray-200 pb-4 lg:pb-0">
        <form onSubmit={handleSearchSubmit} className="lg:mb-2 flex-1 lg:flex-none w-full min-w-[140px]">
          <div className="relative w-full min-w-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 shrink-0 pointer-events-none" aria-hidden />
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Поиск…"
              className="w-full min-w-0 pl-8 pr-3 py-2 rounded border border-gray-200 text-sm text-slate-900 placeholder:text-slate-500 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
            />
          </div>
        </form>
        <nav className="flex lg:flex-col gap-1 flex-wrap lg:flex-nowrap" aria-label="Админ-навигация">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `min-h-10 flex items-center gap-2 px-3 rounded-md text-sm font-medium ${
                  isActive ? "bg-emerald-100 text-emerald-800" : "text-slate-700 hover:bg-gray-100"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
