import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { PageLayout } from "../../components/PageLayout";
import { AlertCircle } from "lucide-react";

export function AdminDashboard() {
  const { token } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboard>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAdminDashboard(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Дашборд</h1>
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
        <h1 className="text-xl font-bold text-slate-900 mb-4">Дашборд</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </PageLayout>
    );
  }

  if (!data) return null;

  return (
    <PageLayout>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Дашборд</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Заказов</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">{data.total_orders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Выручка</h2>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {data.total_revenue.toLocaleString("ru-KZ")} ₸
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">По статусам</h2>
          <p className="text-sm text-slate-700 mt-1 font-mono">
            {Object.entries(data.by_status)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ") || "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 p-4 border-b border-gray-200">
            Последние заказы
          </h2>
          {data.recent_orders.length === 0 ? (
            <p className="p-4 text-slate-600">Нет заказов.</p>
          ) : (
            <ul className="list-none p-0 m-0 divide-y divide-gray-200">
              {data.recent_orders.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/admin/orders/${o.id}`}
                    className="block px-4 py-3 hover:bg-gray-50 text-slate-900"
                  >
                    <span className="font-medium">#{o.id}</span>
                    <span className="text-slate-600 ml-2">{o.user_phone ?? "—"}</span>
                    <span className="text-slate-600 ml-2">
                      {typeof o.total_amount === "number"
                        ? o.total_amount.toLocaleString("ru-KZ")
                        : String(o.total_amount)}{" "}
                      ₸
                    </span>
                    <span className="ml-2 text-sm text-slate-500">{o.status}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date(o.created_at).toLocaleString("ru-KZ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 p-4 border-b border-gray-200">
            Новые пользователи
          </h2>
          {data.recent_users.length === 0 ? (
            <p className="p-4 text-slate-600">Нет пользователей.</p>
          ) : (
            <ul className="list-none p-0 m-0 divide-y divide-gray-200">
              {data.recent_users.map((u) => (
                <li key={u.id} className="px-4 py-3 text-slate-900">
                  <span className="font-medium">{u.phone}</span>
                  <span className="text-slate-600 ml-2">{u.name ?? "—"}</span>
                  <span className="text-slate-500 text-sm ml-2">{u.role}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          to="/admin/vendors"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-medium hover:bg-amber-100"
        >
          Ожидают одобрения: {data.pending_vendors_count}
        </Link>
        <Link
          to="/admin/feedback"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-medium hover:bg-blue-100"
        >
          Обращения в поддержку: {data.open_feedback_count}
        </Link>
      </div>

      {data.recent_reviews.length > 0 && (
        <section className="mt-6 bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
          <h2 className="text-lg font-bold text-slate-900 p-4 border-b border-gray-200">
            Последние отзывы
          </h2>
          <ul className="list-none p-0 m-0 divide-y divide-gray-200">
            {data.recent_reviews.map((r) => (
              <li key={r.review_id} className="px-4 py-3 text-slate-900">
                <Link to={`/products/${r.product_id}`} className="text-emerald-800 hover:underline">
                  {r.product_name}
                </Link>
                <span className="text-slate-600 ml-2">★ {r.rating}</span>
                <span className="text-xs text-slate-500 ml-2">
                  {new Date(r.created_at).toLocaleString("ru-KZ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageLayout>
  );
}
