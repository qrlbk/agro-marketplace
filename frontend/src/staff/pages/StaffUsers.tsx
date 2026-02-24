import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { request, type User } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { AlertCircle } from "lucide-react";

const ROLES = ["guest", "user", "farmer", "vendor", "admin"] as const;

export function StaffUsers() {
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get("phone") ?? "";
  const { getTokenForAdminApi } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState(phoneFromUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhoneFilter((prev) => (prev !== phoneFromUrl ? phoneFromUrl : prev));
  }, [phoneFromUrl]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (roleFilter) params.set("role", roleFilter);
    if (phoneFilter.trim()) params.set("phone", phoneFilter.trim());
    const url = params.toString() ? `/admin/users?${params}` : "/admin/users";
    request<User[]>(url, { token })
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, roleFilter, phoneFilter]);

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Пользователи</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Пользователи</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Пользователи</h1>
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <label htmlFor="staff-role-filter" className="block text-sm font-medium text-slate-700 mb-1">
            Роль
          </label>
          <select
            id="staff-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900"
          >
            <option value="">Все</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="staff-phone-filter" className="block text-sm font-medium text-slate-700 mb-1">
            Телефон
          </label>
          <input
            id="staff-phone-filter"
            type="text"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            placeholder="Поиск по телефону"
            className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900"
          />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">ID</th>
              <th className="text-left p-3 font-semibold text-slate-900">Телефон</th>
              <th className="text-left p-3 font-semibold text-slate-900">Имя</th>
              <th className="text-left p-3 font-semibold text-slate-900">Роль</th>
              <th className="text-left p-3 font-semibold text-slate-900">Регион</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100">
                <td className="p-3">{u.id}</td>
                <td className="p-3">{u.phone}</td>
                <td className="p-3">{u.name ?? "—"}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3 text-slate-600">{u.region ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-6 text-slate-600 text-center">Пользователей не найдено.</p>
        )}
      </div>
    </>
  );
}
