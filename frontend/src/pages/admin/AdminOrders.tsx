import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminOrders, type AdminOrderOut } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { PageLayout } from "../../components/PageLayout";
import { AlertCircle } from "lucide-react";

const STATUS_OPTIONS = ["New", "Paid", "Shipped", "Delivered"];

export function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<AdminOrderOut[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAdminOrders(token, {
      limit: 100,
      ...(statusFilter ? { status: statusFilter } : {}),
    })
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, statusFilter]);

  if (loading) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Заказы</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Заказы</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Заказы</h1>
      <div className="mb-4">
        <label htmlFor="admin-order-status" className="block text-sm font-medium text-slate-700 mb-1">
          Статус
        </label>
        <select
          id="admin-order-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900"
        >
          <option value="">Все</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">ID</th>
              <th className="text-left p-3 font-semibold text-slate-900">Покупатель</th>
              <th className="text-left p-3 font-semibold text-slate-900">Сумма</th>
              <th className="text-left p-3 font-semibold text-slate-900">Статус</th>
              <th className="text-left p-3 font-semibold text-slate-900">Дата</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="p-3">
                  <Link
                    to={`/admin/orders/${o.id}`}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    #{o.id}
                  </Link>
                </td>
                <td className="p-3">{o.user_phone ?? `user_id ${o.user_id}`}</td>
                <td className="p-3">
                  {typeof o.total_amount === "number"
                    ? o.total_amount.toLocaleString("ru-KZ")
                    : String(o.total_amount)}{" "}
                  ₸
                </td>
                <td className="p-3">{o.status}</td>
                <td className="p-3 text-slate-600">
                  {new Date(o.created_at).toLocaleString("ru-KZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-6 text-slate-600 text-center">Заказов не найдено.</p>
        )}
      </div>
    </PageLayout>
  );
}
