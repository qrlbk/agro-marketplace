import { useState, useEffect } from "react";
import { request, User } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { PageLayout } from "../components/PageLayout";
import { Button } from "../components/ui";
import { AlertCircle } from "lucide-react";

export interface PendingVendor {
  company_id: number;
  bin: string;
  company_name: string | null;
  legal_address: string | null;
  chairman_name: string | null;
  bank_iik: string | null;
  bank_bik: string | null;
  user_id: number;
  user_phone: string;
  user_name: string | null;
}

export function Admin() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [analytics, setAnalytics] = useState<{
    total_orders: number;
    total_revenue: number;
    by_status: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const load = () => {
    if (!token || user?.role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      request<{ items: User[]; total: number }>("/admin/users?limit=100&offset=0", { token }),
      request<{ total_orders: number; total_revenue: number; by_status: Record<string, number> }>(
        "/admin/analytics",
        { token }
      ),
      request<PendingVendor[]>("/admin/vendors/pending", { token }).catch(() => []),
    ])
      .then(([usersData, analyticsData, pendingData]) => {
        setUsers(usersData.items ?? []);
        setAnalytics(analyticsData);
        setPendingVendors(Array.isArray(pendingData) ? pendingData : []);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      })
      .finally(() => setLoading(false));
  };

  const approveVendor = async (companyId: number) => {
    if (!token) return;
    setApprovingId(companyId);
    try {
      await request(`/admin/vendors/${companyId}/approve`, { method: "POST", token });
      setPendingVendors((prev) => prev.filter((v) => v.company_id !== companyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось одобрить поставщика");
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    load();
  }, [token, user?.role]);

  if (loading) {
    return (
      <PageLayout>
        <h1>Админка</h1>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-md" />
          <div className="h-48 bg-gray-200 rounded-md" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <h1>Админка</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-700 font-medium">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            {error}
          </div>
          <button
            type="button"
            onClick={load}
            className="min-h-10 px-4 rounded-md border-2 border-red-500 text-red-600 font-semibold hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            Повторить
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <h1>Админка</h1>
      {pendingVendors.length > 0 && (
        <section className="mb-6 bg-amber-50 border border-amber-200 rounded-md overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 p-4 border-b border-amber-200">Заявки поставщиков (ожидают одобрения)</h2>
          <ul className="list-none p-0 m-0 divide-y divide-amber-200">
            {pendingVendors.map((v) => (
              <li key={v.company_id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-900">{v.company_name || "—"}</span>
                  <span className="text-slate-600 ml-2">БИН {v.bin}</span>
                  <p className="text-sm text-slate-600 mt-1">{v.user_phone} · {v.user_name || "—"}</p>
                </div>
                <Button
                  onClick={() => approveVendor(v.company_id)}
                  loading={approvingId === v.company_id}
                >
                  Одобрить
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {analytics && (
        <section className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Заказов</h2>
              <p className="text-2xl font-bold text-slate-900 mt-1">{analytics.total_orders}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Выручка</h2>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {analytics.total_revenue.toLocaleString("ru-KZ")} ₸
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">По статусам</h2>
              <p className="text-sm text-slate-700 mt-1 font-mono">
                {Object.entries(analytics.by_status)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(", ") || "—"}
              </p>
            </div>
          </div>
        </section>
      )}
      <section className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <h2 className="text-lg font-bold text-slate-900 p-4 border-b border-gray-200">Пользователи</h2>
        {users.length === 0 ? (
          <p className="p-6 text-slate-600">Пользователей пока нет.</p>
        ) : (
          <ul className="list-none p-0 m-0 divide-y divide-gray-200">
            {users.map((u) => (
              <li
                key={u.id}
                className="px-4 py-3 flex flex-wrap gap-2 text-slate-900"
              >
                <span className="font-medium">{u.phone}</span>
                <span className="text-slate-600">·</span>
                <span>{u.name || "—"}</span>
                <span className="text-slate-600">·</span>
                <span className="font-semibold text-emerald-800">{u.role}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageLayout>
  );
}
