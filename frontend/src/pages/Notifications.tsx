import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getNotifications, markNotificationRead, type Notification } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useNotificationsCountRefresh } from "../contexts/NotificationsCountContext";
import { PageLayout } from "../components/PageLayout";
import { Button } from "../components/ui";
import { Bell, Star } from "lucide-react";

export function Notifications() {
  const { token } = useAuth();
  const refreshCount = useNotificationsCountRefresh();
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getNotifications(token, { limit: 50 })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleMarkRead = async (n: Notification) => {
    if (!token || n.read_at) return;
    try {
      await markNotificationRead(n.id, token);
      setList((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
      refreshCount?.();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Уведомления</h1>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-200 rounded-md" />
          <div className="h-20 bg-gray-200 rounded-md" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <h1 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Bell className="h-6 w-6" aria-hidden />
        Уведомления
      </h1>
      {list.length === 0 ? (
        <p className="text-slate-600">Нет уведомлений.</p>
      ) : (
        <ul className="list-none p-0 m-0 space-y-3">
          {list.map((n) => {
            const isNewReview = n.type === "new_review";
            const isSupportMessage = n.type === "support_message";
            const productId = isNewReview && typeof n.payload?.product_id === "number" ? n.payload.product_id : null;
            const productName = isNewReview && typeof n.payload?.product_name === "string" ? n.payload.product_name : "Товар";
            const rating = isNewReview && typeof n.payload?.rating === "number" ? n.payload.rating : null;
            const textPreview = isNewReview && typeof n.payload?.review_text_preview === "string" ? n.payload.review_text_preview : null;
            const supportText = isSupportMessage && typeof n.payload?.text === "string" ? n.payload.text : null;
            const unread = !n.read_at;

            return (
              <li
                key={n.id}
                className={`rounded-lg border p-4 ${
                  unread ? "bg-amber-50/50 border-amber-200" : "bg-white border-gray-200"
                }`}
              >
                {isNewReview && (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Новый отзыв на товар
                        {productId ? (
                          <Link
                            to={`/products/${productId}`}
                            className="ml-1 text-emerald-800 hover:underline"
                          >
                            {productName}
                          </Link>
                        ) : (
                          ` ${productName}`
                        )}
                      </p>
                      {rating != null && (
                        <p className="mt-1 text-sm text-slate-600 inline-flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" aria-hidden />
                          {rating} из 5
                        </p>
                      )}
                      {textPreview && (
                        <p className="mt-1 text-sm text-slate-700 line-clamp-2">{textPreview}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(n.created_at).toLocaleString("ru-KZ")}
                      </p>
                    </div>
                    {unread && (
                      <Button variant="secondary" onClick={() => handleMarkRead(n)}>
                        Прочитано
                      </Button>
                    )}
                  </div>
                )}
                {isSupportMessage && (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">Сообщение от поддержки</p>
                      {supportText != null && (
                        <p className="mt-1 text-slate-700 whitespace-pre-wrap">{supportText}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(n.created_at).toLocaleString("ru-KZ")}
                      </p>
                    </div>
                    {unread && (
                      <Button variant="secondary" onClick={() => handleMarkRead(n)}>
                        Прочитано
                      </Button>
                    )}
                  </div>
                )}
                {!isNewReview && !isSupportMessage && (
                  <p className="text-slate-700">
                    {n.type} — {new Date(n.created_at).toLocaleString("ru-KZ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </PageLayout>
  );
}
