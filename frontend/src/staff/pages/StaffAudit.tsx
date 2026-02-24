import { useState, useEffect, useCallback } from "react";
import { getAdminAuditLog, type AuditLogOut } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
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

export function StaffAudit() {
  const { getTokenForAdminApi } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [data, setData] = useState<{ items: AuditLogOut[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [companyId, setCompanyId] = useState("");
  const [actionFilter, setActionFilter] = useState("");
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
    if (cid !== undefined && !Number.isNaN(cid)) params.company_id = cid;
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
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Журнал действий</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Журнал действий</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </>
    );
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mb-4">
        <FileText className="w-8 h-8 text-emerald-700" aria-hidden />
        Журнал действий
      </h1>
      <div className="mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label htmlFor="staff-audit-company" className="block text-sm font-medium text-slate-700 mb-1">
            ID компании
          </label>
          <input
            id="staff-audit-company"
            type="text"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="Опционально"
            className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900 w-32"
          />
        </div>
        <div>
          <label htmlFor="staff-audit-action" className="block text-sm font-medium text-slate-700 mb-1">
            Действие
          </label>
          <input
            id="staff-audit-action"
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Опционально"
            className="min-h-10 px-3 rounded border border-gray-200 bg-white text-slate-900 w-40"
          />
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">Дата</th>
              <th className="text-left p-3 font-semibold text-slate-900">Действие</th>
              <th className="text-left p-3 font-semibold text-slate-900">Пользователь</th>
              <th className="text-left p-3 font-semibold text-slate-900">Компания</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="p-3 text-slate-600 whitespace-nowrap">
                  {new Date(item.created_at).toLocaleString("ru-KZ")}
                </td>
                <td className="p-3">
                  {ACTION_LABELS[item.action] ?? item.action}
                </td>
                <td className="p-3">{item.user_phone ?? item.user_name ?? `#${item.user_id}` ?? "—"}</td>
                <td className="p-3">{item.company_id ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="p-6 text-slate-600 text-center">Записей нет.</p>
        )}
      </div>
      {total > limit && (
        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-slate-600">Всего: {total}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded border border-gray-200 disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </>
  );
}
