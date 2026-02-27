import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Search, LogOut, User } from "lucide-react";
import { useStaffAuth } from "../context/StaffAuthContext";
import { getStaffNavItems } from "../../backoffice/navConfig";

const basePath = "/staff";

export function StaffLayout() {
  const { staff, hasPermission, logout } = useStaffAuth();
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = getStaffNavItems(hasPermission).map((item) => ({
    to: basePath + item.path,
    label: item.label,
    icon: item.icon,
  }));

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQ.trim();
    if (q) navigate(`/staff/search?q=${encodeURIComponent(q)}`);
  };

  if (!staff) return null;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      <aside className="lg:w-56 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <NavLink to="/staff/dashboard" className="text-base sm:text-lg font-bold text-emerald-800">
            Agro Staff
          </NavLink>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-0.5" aria-label="Портал сотрудников">
          {navItems.map(({ to, label, icon: Icon }) => (
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 flex items-center justify-between gap-4 px-4 lg:px-6 border-b border-gray-200 bg-white">
          {hasPermission("search.view") && (
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Поиск…"
                  className="w-full pl-8 pr-3 py-2 rounded border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                />
              </div>
            </form>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 text-slate-700"
            >
              <User className="h-5 w-5" />
              <span className="text-sm font-medium truncate max-w-[120px]">{staff.name || staff.login}</span>
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                  <NavLink
                    to="/staff/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-gray-50"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Профиль
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate("/staff/login");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Выход
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
