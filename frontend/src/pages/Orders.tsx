import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { request, Order } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { PageLayout } from "../components/PageLayout";
import { Package } from "lucide-react";

export function Orders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    request<Order[]>("/orders", { token })
      .then(setOrders)
      .catch((e) => {
        setOrders([]);
        setError(e instanceof Error ? e.message : "Ошибка загрузки заказов");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token]);

  if (loading) {
    return (
      <PageLayout>
        <h1>Мои заказы</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-md" />
          <div className="h-24 bg-gray-200 rounded-md" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <h1>Мои заказы</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-red-700 font-medium">{error}</p>
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

  if (orders.length === 0) {
    return (
      <PageLayout>
        <h1>Мои заказы</h1>
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-12 text-center">
          <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" aria-hidden />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Заказов пока нет</h2>
          <p className="text-slate-600 mb-6">Ваши заказы появятся здесь после оформления.</p>
          <Link
            to="/catalog"
            className="inline-flex items-center justify-center min-h-12 px-6 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            В каталог
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <h1>Мои заказы</h1>
      <ul className="list-none p-0 m-0 space-y-4">
        {orders.map((o) => (
          <li
            key={o.id}
            className="bg-white border border-gray-200 rounded-md shadow-sm p-6"
          >
            <p className="font-bold text-slate-900">
              Заказ #{o.id} · {Number(o.total_amount).toLocaleString("ru-KZ")} ₸ · Статус: {o.status}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {new Date(o.created_at).toLocaleString("ru-RU")}
            </p>
            {o.items && o.items.length > 0 && (
              <ul className="list-none p-0 mt-4 pt-4 border-t border-gray-100 space-y-2">
                {o.items.map((item) => (
                  <li
                    key={item.id}
                    className="text-sm text-slate-700 py-1 border-b border-gray-50 last:border-0"
                  >
                    {item.name ?? item.article_number ?? `Товар #${item.product_id}`} × {item.quantity} = {(item.price_at_order * item.quantity).toLocaleString("ru-KZ")} ₸
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
