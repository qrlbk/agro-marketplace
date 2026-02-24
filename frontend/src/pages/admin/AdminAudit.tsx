import { useState, useEffect, useCallback } from "react";
import { getAdminAuditLog, type AuditLogOut } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { PageLayout } from "../../components/PageLayout";
import { FileText, AlertCircle } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  pricelist_upload: "Загрузка прайса",
  product_create: "Создание товара",
  product_update: "Изменение товара",
  product_delete: "Удаление товара",
  order_status_change: "Смена статуса заказа",
  team_invite: "Приглашение в команду",
  team_role_change: "Смена роли",
  team_remove: "Удаление из команды",
};

export function AdminAudit() {
  const { token } = useAuth();
  const [data, setData] = useState<{ items: AuditLogOut[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [companyId, setCompanyId] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const limit = 50;

  const load = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const params: { limit: number; offset: number; company_id?: number; action?: string } = {
      limit,
      offset: page * limit,
    };
    const cid = companyId.trim() ? parseInt(companyId, 10) : undefined;
    if (!isNaN(cid!)) params.company_id = cid;
    if (actionFilter.trim()) params.action = actionFilter.trim();
    getAdminAuditLog(token, params)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token, page, companyId, actionFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Журнал действий</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </PageLayout>
    );
  }

  if (error && !data) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Журнал действий</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </PageLayout>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <PageLayout>
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
        <FileText className="w-8 h-8 text-emerald-700" aria-hidden />
        Журнал действий
      </h1>
      <p className="text-slate-600 mb-4">Аудит действий по компаниям и пользователям.</p>

      <div className="flex flex-wrap gap-4 mb-6">
        <label>
          <span className="block text-sm font-medium text-slate-700 mb-1">ID компании</span>
          <input
            type="number"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Не указан"
            className="rounded-lg border border-gray-300 px-3 py-2 w-32 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
          />
        </label>
        <label>
          <span className="block text-sm font-medium text-slate-700 mb-1">Действие</span>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Например pricelist_upload"
            className="rounded-lg border border-gray-300 px-3 py-2 w-48 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
          />
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900">Дата</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Пользователь</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Компания ID</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Действие</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Детали</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {log.created_at ? new Date(log.created_at).toLocaleString("ru-RU") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {log.user_name || log.user_phone || `ID ${log.user_id ?? "—"}`}
                </td>
                <td className="px-4 py-3 text-slate-600">{log.company_id ?? "—"}</td>
                <td className="px-4 py-3 text-slate-800">
                  {ACTION_LABELS[log.action] ?? log.action}
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {log.details && typeof log.details === "object"
                    ? JSON.stringify(log.details)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">Записей не найдено.</p>
        )}
      </div>

      {total > limit && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-slate-600 text-sm">
            Показано {page * limit + 1}–{Math.min((page + 1) * limit, total)} из {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-gray-300 text-slate-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="px-3 py-1 rounded border border-gray-300 text-slate-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
