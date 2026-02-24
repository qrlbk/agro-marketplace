import { useState, useEffect } from "react";
import { request, type User } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { PageLayout } from "../../components/PageLayout";
import { AlertCircle, Phone } from "lucide-react";

const ROLES = ["guest", "user", "farmer", "vendor", "admin"] as const;

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const url = roleFilter ? `/admin/users?role=${encodeURIComponent(roleFilter)}` : "/admin/users";
    request<User[]>(url, { token })
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, roleFilter]);

  if (loading) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Пользователи</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Пользователи</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Пользователи</h1>
      <div className="mb-4">
        <label htmlFor="admin-role-filter" className="block text-sm font-medium text-slate-700 mb-1">
          Роль
        </label>
        <select
          id="admin-role-filter"
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
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">ID</th>
              <th className="text-left p-3 font-semibold text-slate-900">Телефон</th>
              <th className="text-left p-3 font-semibold text-slate-900">Имя</th>
              <th className="text-left p-3 font-semibold text-slate-900">Роль</th>
              <th className="text-left p-3 font-semibold text-slate-900">Регион</th>
              <th className="text-left p-3 font-semibold text-slate-900">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-3">{u.id}</td>
                <td className="p-3">{u.phone}</td>
                <td className="p-3">{u.name ?? "—"}</td>
                <td className="p-3 font-medium text-emerald-800">{u.role}</td>
                <td className="p-3 text-slate-600">{u.region ?? "—"}</td>
                <td className="p-3">
                  <a
                    href={`tel:${u.phone}`}
                    className="inline-flex items-center gap-1 text-emerald-800 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    Позвонить
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="p-6 text-slate-600 text-center">Пользователей не найдено.</p>
        )}
      </div>
    </PageLayout>
  );
}
