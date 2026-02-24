import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getAdminOrder, type AdminOrderOut } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { AlertCircle, Phone } from "lucide-react";

export function StaffOrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const { getTokenForAdminApi } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [order, setOrder] = useState<AdminOrderOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orderId) {
      setLoading(false);
      return;
    }
    const id = parseInt(orderId, 10);
    if (Number.isNaN(id)) {
      setError("Неверный ID заказа");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAdminOrder(id, token)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, orderId]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded-md" />;
  }

  if (error || !order) {
    return (
      <>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error ?? "Заказ не найден"}
        </div>
        <Link to="/staff/orders" className="mt-4 inline-block text-emerald-800 hover:underline">
          ← К списку заказов
        </Link>
      </>
    );
  }

  const totalAmount =
    typeof order.total_amount === "number"
      ? order.total_amount
      : parseFloat(String(order.total_amount));
  const orderNumber = (order as AdminOrderOut & { order_number?: string | null }).order_number ?? `#${order.id}`;

  return (
    <>
      <div className="mb-4">
        <Link to="/staff/orders" className="text-emerald-800 hover:underline text-sm">
          ← К списку заказов
        </Link>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Заказ {orderNumber}</h1>
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Контакты</h2>
          <p>
            Покупатель:{" "}
            {order.user_phone ? (
              <a href={`tel:${order.user_phone}`} className="text-emerald-800 inline-flex items-center gap-1">
                {order.user_phone}
                <Phone className="h-4 w-4" />
              </a>
            ) : (
              `user_id ${order.user_id}`
            )}
          </p>
          <p>
            Поставщик:{" "}
            {order.vendor_phone ? (
              <a href={`tel:${order.vendor_phone}`} className="text-emerald-800 inline-flex items-center gap-1">
                {order.vendor_phone}
                <Phone className="h-4 w-4" />
              </a>
            ) : (
              `vendor_id ${order.vendor_id}`
            )}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <p className="text-slate-700">
            <span className="font-medium">Статус:</span> {order.status}
          </p>
          <p className="text-slate-700">
            <span className="font-medium">Сумма:</span> {totalAmount.toLocaleString("ru-KZ")} ₸
          </p>
          {order.delivery_address && (
            <p className="text-slate-700">
              <span className="font-medium">Адрес доставки:</span> {order.delivery_address}
            </p>
          )}
          {order.comment && (
            <p className="text-slate-700">
              <span className="font-medium">Комментарий:</span> {order.comment}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-2">
            {new Date(order.created_at).toLocaleString("ru-KZ")}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <h2 className="font-semibold text-slate-900 p-4 border-b border-gray-200">Состав</h2>
          <ul className="list-none p-0 m-0 divide-y divide-gray-200">
            {(order.items ?? []).map((item) => (
              <li key={item.id} className="px-4 py-3 flex justify-between gap-4">
                <span>
                  {item.name ?? `Товар #${item.product_id}`}
                  {item.article_number && (
                    <span className="text-slate-500 ml-2">{item.article_number}</span>
                  )}
                </span>
                <span>
                  {item.quantity} × {item.price_at_order?.toLocaleString("ru-KZ") ?? "—"} ₸ ={" "}
                  {((item.quantity ?? 0) * (item.price_at_order ?? 0)).toLocaleString("ru-KZ")} ₸
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
