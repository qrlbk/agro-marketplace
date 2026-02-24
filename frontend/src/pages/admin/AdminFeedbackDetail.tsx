import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getAdminFeedbackTicket,
  patchAdminFeedback,
  type FeedbackTicketAdminOut,
} from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { PageLayout } from "../../components/PageLayout";
import { Button } from "../../components/ui";
import { AlertCircle, Phone, Package, ShoppingBag } from "lucide-react";

const STATUS_OPTIONS = ["open", "in_progress", "resolved"];

export function AdminFeedbackDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { token } = useAuth();
  const [ticket, setTicket] = useState<FeedbackTicketAdminOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [status, setStatus] = useState("");
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!token || !ticketId) {
      setLoading(false);
      return;
    }
    const id = parseInt(ticketId, 10);
    if (Number.isNaN(id)) {
      setError("Неверный ID обращения");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAdminFeedbackTicket(id, token)
      .then((t) => {
        setTicket(t);
        setAdminNotes(t.admin_notes ?? "");
        setStatus(t.status);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, ticketId]);

  const phone = ticket?.contact_phone || ticket?.user_phone;
  const canCall = !!phone;

  const handleSave = async () => {
    if (!token || !ticket) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await patchAdminFeedback(
        ticket.id,
        {
          status: status || undefined,
          admin_notes: adminNotes,
          send_reply: replyText.trim() || undefined,
        },
        token
      );
      setTicket(updated);
      setAdminNotes(updated.admin_notes ?? "");
      setStatus(updated.status);
      if (replyText.trim()) {
        setReplyText("");
        setSaveSuccess(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </PageLayout>
    );
  }

  if (error && !ticket) {
    return (
      <PageLayout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
        <Link to="/admin/feedback" className="mt-4 inline-block text-emerald-800 hover:underline">
          ← К списку обращений
        </Link>
      </PageLayout>
    );
  }

  if (!ticket) return null;

  return (
    <PageLayout>
      <div className="mb-4">
        <Link to="/admin/feedback" className="text-emerald-800 hover:underline text-sm">
          ← К списку обращений
        </Link>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Обращение #{ticket.id}</h1>
      {saveSuccess && (
        <p className="mb-4 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          Ответ отправлен в уведомления пользователю.
        </p>
      )}
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-md p-4">
          <p className="text-slate-700">
            <span className="font-medium">Тема:</span> {ticket.subject}
          </p>
          <p className="text-slate-700 mt-2">
            <span className="font-medium">Сообщение:</span>
          </p>
          <p className="mt-1 text-slate-800 whitespace-pre-wrap">{ticket.message}</p>
          <p className="text-slate-600 text-sm mt-2">
            Контакт: {ticket.user_phone ?? ticket.contact_phone ?? "—"}
            {ticket.user_name && ` · ${ticket.user_name}`}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {new Date(ticket.created_at).toLocaleString("ru-KZ")}
          </p>
          {(ticket.order_id != null || ticket.order_number) && (
            <p className="mt-3 text-slate-700">
              <ShoppingBag className="h-4 w-4 inline mr-1 align-middle" />
              Заказ:{" "}
              {ticket.order_id != null ? (
                <Link to={`/admin/orders/${ticket.order_id}`} className="text-emerald-800 hover:underline font-medium">
                  {ticket.order_number ?? `#${ticket.order_id}`}
                </Link>
              ) : (
                ticket.order_number ?? "—"
              )}
            </p>
          )}
          {(ticket.product_id != null || ticket.product_name) && (
            <p className="mt-1 text-slate-700">
              <Package className="h-4 w-4 inline mr-1 align-middle" />
              Товар: {ticket.product_name ?? `#${ticket.product_id}`}
            </p>
          )}
          {canCall && (
            <a
              href={`tel:${phone}`}
              className="mt-3 inline-flex items-center gap-1 text-emerald-800 font-medium hover:underline"
            >
              <Phone className="h-4 w-4" />
              Позвонить
            </a>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Внутренние заметки</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
            placeholder="Заметки поддержки"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <label htmlFor="admin-feedback-status-select" className="block font-semibold text-slate-900 mb-2">
            Статус
          </label>
          <select
            id="admin-feedback-status-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {ticket.user_id && (
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <h2 className="font-semibold text-slate-900 mb-2">Ответить пользователю</h2>
            <p className="text-sm text-slate-600 mb-2">
              Текст будет отправлен в раздел «Уведомления» пользователя.
            </p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900 mb-3"
              placeholder="Текст ответа…"
            />
          </div>
        )}

        <Button onClick={handleSave} loading={saving}>
          Сохранить (заметки, статус{replyText.trim() ? " и отправить ответ" : ""})
        </Button>
      </div>
    </PageLayout>
  );
}
