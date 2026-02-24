import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminOrders, type AdminOrderOut } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { AlertCircle } from "lucide-react";

const STATUS_OPTIONS = ["New", "Paid", "Shipped", "Delivered"];

export function StaffOrders() {
  const { getTokenForAdminApi } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [orders, setOrders] = useState<AdminOrderOut[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [orderNumberSearch, setOrderNumberSearch] = useState("");
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
      ...(orderNumberSearch.trim() ? { order_number: orderNumberSearch.trim() } : {}),
    })
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, statusFilter, orderNumberSearch]);

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Заказы</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Заказы</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </>
    );
  }

  const orderNumber = (o: AdminOrderOut & { order_number?: string | null }) => o.order_number ?? `#${o.id}`;

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Заказы</h1>
      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="staff-order-number" className="block text-sm font-medium text-slate-700 mb-1">
            Номер заказа
          </label>
          <input
            id="staff-order-number"
            type="text"
            value={orderNumberSearch}
            onChange={(e) => setOrderNumberSearch(e.target.value)}
            placeholder="ORD-2025-000001"
            className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900 w-48"
          />
        </div>
        <div>
          <label htmlFor="staff-order-status" className="block text-sm font-medium text-slate-700 mb-1">
            Статус
          </label>
          <select
          id="staff-order-status"
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
      </div>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">Номер</th>
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
                    to={`/staff/orders/${o.id}`}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    {orderNumber(o)}
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
    </>
  );
}
