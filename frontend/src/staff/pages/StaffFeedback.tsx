import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAdminFeedback, type FeedbackTicketAdminOut } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { AlertCircle } from "lucide-react";

const STATUS_OPTIONS = ["open", "in_progress", "resolved"];

export function StaffFeedback() {
  const { getTokenForAdminApi } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [tickets, setTickets] = useState<FeedbackTicketAdminOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;
  const [statusFilter, setStatusFilter] = useState("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unansweredOnly, setUnansweredOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAdminFeedback(token, {
      limit,
      offset: page * limit,
      ...(statusFilter ? { status: statusFilter } : {}),
      assigned_to_me: assignedToMe,
      overdue: overdueOnly,
      unanswered: unansweredOnly,
    })
      .then((data) => {
        setTickets(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, statusFilter, assignedToMe, overdueOnly, unansweredOnly, page]);

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Обращения</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Обращения</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Обращения в поддержку</h1>
      <div className="mb-4">
        <label htmlFor="staff-feedback-status" className="block text-sm font-medium text-slate-700 mb-1">
          Статус
        </label>
        <select
          id="staff-feedback-status"
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
        <div className="flex items-center gap-2 pt-6">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={assignedToMe}
              onChange={(e) => setAssignedToMe(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-slate-700">Мои</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-slate-700">Просроченные</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unansweredOnly}
              onChange={(e) => setUnansweredOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-slate-700">Без ответа</span>
          </label>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">ID</th>
              <th className="text-left p-3 font-semibold text-slate-900">Пользователь</th>
              <th className="text-left p-3 font-semibold text-slate-900">Тема</th>
              <th className="text-left p-3 font-semibold text-slate-900">Статус</th>
              <th className="text-left p-3 font-semibold text-slate-900">Приоритет</th>
              <th className="text-left p-3 font-semibold text-slate-900">Дата</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className={t.overdue ? "bg-red-50/50" : undefined}>
                <td className="p-3">
                  <Link
                    to={`/staff/feedback/${t.id}`}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    #{t.id}
                  </Link>
                  {t.overdue && (
                    <span className="ml-2 inline-block px-2 py-0.5 text-xs font-medium rounded bg-red-200 text-red-800">
                      Просрочено
                    </span>
                  )}
                </td>
                <td className="p-3">{t.user_phone ?? t.contact_phone ?? "—"}</td>
                <td className="p-3 truncate max-w-[200px]">{t.subject}</td>
                <td className="p-3">{t.status}</td>
                <td className="p-3">{t.priority ?? "normal"}</td>
                <td className="p-3 text-slate-600">
                  {new Date(t.created_at).toLocaleString("ru-KZ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && (
          <p className="p-6 text-slate-600 text-center">Обращений не найдено.</p>
        )}
      </div>
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            Показано {page * limit + 1}–{Math.min(page * limit + limit, total)} из {total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </>
  );
}
