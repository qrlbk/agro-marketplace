import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getAdminFeedbackTicket,
  patchAdminFeedback,
  getAdminReplyTemplates,
  type FeedbackTicketAdminOut,
  type ReplyTemplateOut,
} from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { Button } from "../../components/ui";
import { AlertCircle, Phone, Package, ShoppingBag } from "lucide-react";

const STATUS_OPTIONS = ["open", "in_progress", "resolved"];
const PRIORITY_OPTIONS = [
  { value: "low", label: "Низкий" },
  { value: "normal", label: "Обычный" },
  { value: "high", label: "Высокий" },
];
const CATEGORY_OPTIONS = [
  { value: "", label: "—" },
  { value: "order", label: "Заказ" },
  { value: "delivery", label: "Доставка" },
  { value: "tech", label: "Техническое" },
];

export function StaffFeedbackDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { getTokenForAdminApi, hasPermission, staff } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [ticket, setTicket] = useState<FeedbackTicketAdminOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [replyTemplates, setReplyTemplates] = useState<ReplyTemplateOut[]>([]);

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
        setPriority(t.priority ?? "normal");
        setCategory(t.category ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, ticketId]);

  useEffect(() => {
    if (!token) return;
    getAdminReplyTemplates(token)
      .then(setReplyTemplates)
      .catch(() => {});
  }, [token]);

  const phone = ticket?.contact_phone || ticket?.user_phone;
  const canEdit = hasPermission("feedback.edit");

  const handleSave = async () => {
    if (!token || !ticket) return;
    setSaving(true);
    setSaveSuccess(false);
    setError(null);
    try {
      const updated = await patchAdminFeedback(
        ticket.id,
        {
          status: status || undefined,
          priority: priority || undefined,
          category: category || undefined,
          admin_notes: adminNotes,
          send_reply: replyText.trim() || undefined,
        },
        token
      );
      setTicket(updated);
      setAdminNotes(updated.admin_notes ?? "");
      setStatus(updated.status);
      setPriority(updated.priority ?? "normal");
      setCategory(updated.category ?? "");
      if (replyText.trim()) {
        setReplyText("");
        setSaveSuccess(true);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignToSelf = async () => {
    if (!token || !ticket || !staff) return;
    setSaving(true);
    try {
      const updated = await patchAdminFeedback(
        ticket.id,
        { assigned_to_id: staff.id },
        token
      );
      setTicket(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка назначения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded-md" />;
  }

  if (error && !ticket) {
    return (
      <>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
        <Link to="/staff/feedback" className="mt-4 inline-block text-emerald-800 hover:underline">
          ← К списку обращений
        </Link>
      </>
    );
  }

  if (!ticket) return null;

  return (
    <>
      <div className="mb-4">
        <Link to="/staff/feedback" className="text-emerald-800 hover:underline text-sm">
          ← К списку обращений
        </Link>
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2 flex-wrap">
        Обращение #{ticket.id}
        {ticket.overdue && (
          <span className="inline-block px-2 py-1 text-sm font-medium rounded bg-red-200 text-red-800">
            Просрочено
          </span>
        )}
        {staff && ticket.assigned_to_id !== staff.id && hasPermission("feedback.edit") && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleAssignToSelf}
            loading={saving}
            className="ml-auto"
          >
            Назначить на себя
          </Button>
        )}
      </h1>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
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
          <p className="text-slate-600 text-sm mt-1">
            Приоритет: {PRIORITY_OPTIONS.find((o) => o.value === (ticket.priority ?? "normal"))?.label ?? ticket.priority}
            {ticket.category && ` · Категория: ${CATEGORY_OPTIONS.find((o) => o.value === ticket.category)?.label ?? ticket.category}`}
            {ticket.assigned_to_name && ` · Ответственный: ${ticket.assigned_to_name}`}
          </p>
          {(ticket.order_id != null || ticket.order_number) && (
            <p className="mt-3 text-slate-700">
              <ShoppingBag className="h-4 w-4 inline mr-1 align-middle" />
              Заказ:{" "}
              {ticket.order_id != null ? (
                <Link to={`/staff/orders/${ticket.order_id}`} className="text-emerald-800 hover:underline font-medium">
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
          {phone && (
            <a
              href={`tel:${phone}`}
              className="mt-3 inline-flex items-center gap-1 text-emerald-800 font-medium hover:underline"
            >
              <Phone className="h-4 w-4" />
              Позвонить
            </a>
          )}
        </div>

        {(ticket.messages?.length ?? 0) > 0 && (
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <h2 className="font-semibold text-slate-900 mb-3">Переписка</h2>
            <ul className="space-y-3 list-none p-0 m-0">
              {ticket.messages!.map((msg) => (
                <li
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 ${
                    msg.sender_type === "staff"
                      ? "bg-emerald-50 border border-emerald-200 ml-8"
                      : "bg-slate-100 border border-slate-200 mr-8"
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-1">
                    {msg.sender_type === "staff" ? "Поддержка" : "Пользователь"}
                    {" · "}
                    {new Date(msg.created_at).toLocaleString("ru-KZ")}
                  </p>
                  <p className="text-slate-800 whitespace-pre-wrap">{msg.message}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-md p-4">
          <h2 className="font-semibold text-slate-900 mb-2">Внутренние заметки</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            readOnly={!canEdit}
            rows={3}
            className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900 disabled:bg-gray-50"
            placeholder="Заметки поддержки"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <label htmlFor="staff-feedback-status-select" className="block font-semibold text-slate-900 mb-2">
              Статус
            </label>
            <select
              id="staff-feedback-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={!canEdit}
              className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900 disabled:bg-gray-50 w-full"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <label htmlFor="staff-feedback-priority-select" className="block font-semibold text-slate-900 mb-2">
              Приоритет
            </label>
            <select
              id="staff-feedback-priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!canEdit}
              className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900 disabled:bg-gray-50 w-full"
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <label htmlFor="staff-feedback-category-select" className="block font-semibold text-slate-900 mb-2">
              Категория
            </label>
            <select
              id="staff-feedback-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!canEdit}
              className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900 disabled:bg-gray-50 w-full"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canEdit && ticket.user_id ? (
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <h2 className="font-semibold text-slate-900 mb-2">Ответить пользователю</h2>
            <p className="text-sm text-slate-600 mb-2">
              Текст будет отправлен в раздел «Уведомления» пользователя.
            </p>
            {replyTemplates.length > 0 && (
              <div className="mb-2">
                <label htmlFor="staff-reply-template" className="text-sm text-slate-600 mr-2">
                  Вставить шаблон:
                </label>
                <select
                  id="staff-reply-template"
                  className="min-h-9 px-2 rounded border border-gray-200 bg-white text-slate-900 text-sm"
                  value=""
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) {
                      const t = replyTemplates.find((x) => x.id === Number(id));
                      if (t) setReplyText((prev) => (prev ? prev + "\n\n" + t.body : t.body));
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">— выберите —</option>
                  {replyTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900 mb-3"
              placeholder="Текст ответа…"
            />
          </div>
        ) : canEdit && !ticket.user_id ? (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
            <p className="text-amber-800 font-medium">Обращение анонимное</p>
            <p className="text-sm text-amber-700 mt-1">
              Ответить в приложение нельзя. Ответьте по контакту:{" "}
              {phone ? <span className="font-medium">{phone}</span> : "указанному в обращении"}
            </p>
          </div>
        ) : null}

        {canEdit && (
          <Button onClick={handleSave} loading={saving}>
            Сохранить (заметки, статус{replyText.trim() ? " и отправить ответ" : ""})
          </Button>
        )}
      </div>
    </>
  );
}
