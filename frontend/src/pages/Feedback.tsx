import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { postFeedback, request, type Order } from "../api/client";
import { PageLayout } from "../components/PageLayout";
import { Input, Button } from "../components/ui";

const SUBJECT_OPTIONS = [
  { value: "", label: "Выберите тему" },
  { value: "order", label: "Вопрос по заказу" },
  { value: "product", label: "Вопрос по товару" },
  { value: "delivery", label: "Доставка" },
  { value: "payment", label: "Оплата" },
  { value: "other", label: "Другое" },
];

export function Feedback() {
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get("order_id");
  const { token } = useAuth();
  const [subject, setSubject] = useState("");
  const [subjectOther, setSubjectOther] = useState("");
  const [message, setMessage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [orderId, setOrderId] = useState<string>("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderIdFromUrl && token) {
      const id = parseInt(orderIdFromUrl, 10);
      if (!isNaN(id)) {
        setSubject("order");
        setOrderId(orderIdFromUrl);
      }
    }
  }, [orderIdFromUrl, token]);

  useEffect(() => {
    if ((subject === "order" && token) || (orderIdFromUrl && token)) {
      setOrdersLoading(true);
      request<Order[]>("/orders", { token })
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setOrdersLoading(false));
    } else {
      setOrders([]);
    }
  }, [subject, token, orderIdFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const subjectVal = subject === "other" ? subjectOther.trim() : subject;
    if (!subjectVal) {
      setError("Укажите тему обращения");
      return;
    }
    if (!message.trim()) {
      setError("Напишите сообщение");
      return;
    }
    if (!token && !contactPhone.trim()) {
      setError("Для анонимного обращения укажите контактный телефон");
      return;
    }
    const selectedOrderId = orderId ? parseInt(orderId, 10) : undefined;
    const orderIdValid = selectedOrderId != null && !isNaN(selectedOrderId);
    setLoading(true);
    try {
      await postFeedback(
        {
          subject: subjectVal,
          message: message.trim(),
          contact_phone: contactPhone.trim() || undefined,
          order_id: orderIdValid ? selectedOrderId : undefined,
        },
        token ?? undefined
      );
      setSent(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <PageLayout>
        <div className="max-w-xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold text-emerald-800 mb-4">Обратная связь</h1>
          <p className="text-slate-700 text-lg">
            Спасибо, мы ответим в уведомлениях{contactPhone.trim() ? " и по телефону, если указан" : ""}.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-xl mx-auto py-4">
        <h1 className="text-2xl font-bold text-emerald-800 mb-6">Написать в поддержку</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-subject" className="block text-sm font-medium text-slate-700 mb-1">
              Тема
            </label>
            <select
              id="feedback-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full min-h-10 px-3 py-2 rounded-lg border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
            >
              {SUBJECT_OPTIONS.map((o) => (
                <option key={o.value || "empty"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {subject === "other" && (
            <div>
              <label htmlFor="feedback-subject-other" className="block text-sm font-medium text-slate-700 mb-1">
                Укажите тему
              </label>
              <Input
                id="feedback-subject-other"
                value={subjectOther}
                onChange={(e) => setSubjectOther(e.target.value)}
                placeholder="Тема обращения"
              />
            </div>
          )}
          {subject === "order" && token && (
            <div>
              <label htmlFor="feedback-order" className="block text-sm font-medium text-slate-700 mb-1">
                По заказу
              </label>
              <select
                id="feedback-order"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
              >
                <option value="">Без привязки к заказу</option>
                {ordersLoading ? (
                  <option value="">Загрузка заказов…</option>
                ) : (
                  orders.map((o) => (
                    <option key={o.id} value={String(o.id)}>
                      {o.order_number ?? `Заказ #${o.id}`} · {new Date(o.created_at).toLocaleDateString("ru-RU")}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="feedback-message" className="block text-sm font-medium text-slate-700 mb-1">
              Сообщение
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
              placeholder="Опишите ваш вопрос или проблему"
            />
          </div>
          <div>
            <label htmlFor="feedback-phone" className="block text-sm font-medium text-slate-700 mb-1">
              Телефон для обратного звонка{" "}
              {!token && <span className="text-amber-600">(обязательно, если вы не авторизованы)</span>}
            </label>
            <Input
              id="feedback-phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+7 ..."
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Отправка…" : "Отправить"}
          </Button>
        </form>
      </div>
    </PageLayout>
  );
}
