import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getAdminUser,
  getAdminOrders,
  getAdminFeedback,
  type User,
  type AdminOrderOut,
  type FeedbackTicketAdminOut,
} from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { AlertCircle, Phone, ShoppingBag, MessageSquare } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  New: "Новый",
  Paid: "Оплачен",
  Processing: "В обработке",
  Shipped: "Отправлен",
  Delivered: "Доставлен",
  Cancelled: "Отменён",
  open: "Открыт",
  in_progress: "В работе",
  resolved: "Решён",
};

export function StaffUserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { getTokenForAdminApi } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<AdminOrderOut[]>([]);
  const [tickets, setTickets] = useState<FeedbackTicketAdminOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !userId) {
      setLoading(false);
      return;
    }
    const id = parseInt(userId, 10);
    if (Number.isNaN(id)) {
      setError("Неверный ID пользователя");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getAdminUser(id, token),
      getAdminOrders(token, { user_id: id, limit: 20 }),
      getAdminFeedback(token, { user_id: id, limit: 20 }),
    ])
      .then(([u, ordersData, feedbackData]) => {
        setUser(u);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setTickets(feedbackData.items ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, userId]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded-md" />;
  }

  if (error || !user) {
    return (
      <>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error ?? "Пользователь не найден"}
        </div>
        <Link to="/staff/users" className="mt-4 inline-block text-emerald-800 hover:underline">
          ← К списку пользователей
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Link to="/staff/users" className="text-emerald-800 hover:underline text-sm">
          ← К списку пользователей
        </Link>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Профиль пользователя #{user.id}</h1>
      <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
        <p className="font-medium text-slate-900">{user.phone}</p>
        <p className="text-slate-600">{user.name ?? "—"}</p>
        <p className="text-slate-600 text-sm">Роль: {user.role}</p>
        {user.region && <p className="text-slate-600 text-sm">Регион: {user.region}</p>}
        <a
          href={`tel:${user.phone}`}
          className="mt-2 inline-flex items-center gap-1 text-emerald-800 font-medium hover:underline"
        >
          <Phone className="h-4 w-4" />
          Позвонить
        </a>
      </div>

      <section className="mb-6">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
          <ShoppingBag className="h-5 w-5" />
          Заказы
        </h2>
        {orders.length === 0 ? (
          <p className="text-slate-600 text-sm">Нет заказов.</p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-1">
            {orders.map((o) => (
              <li key={o.id}>
                <Link to={`/staff/orders/${o.id}`} className="text-emerald-800 hover:underline">
                  Заказ #{o.order_number ?? o.id}
                  {o.status && (
                    <span className="ml-2 text-slate-500 text-sm">
                      ({STATUS_LABELS[o.status] ?? o.status})
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
          <MessageSquare className="h-5 w-5" />
          Обращения в поддержку
        </h2>
        {tickets.length === 0 ? (
          <p className="text-slate-600 text-sm">Нет обращений.</p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-1">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link to={`/staff/feedback/${t.id}`} className="text-emerald-800 hover:underline">
                  #{t.id} — {t.subject}
                  {t.status && (
                    <span className="ml-2 text-slate-500 text-sm">
                      ({STATUS_LABELS[t.status] ?? t.status})
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
