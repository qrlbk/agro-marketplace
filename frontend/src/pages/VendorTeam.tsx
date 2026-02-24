import { useState, useEffect, useCallback } from "react";
import {
  getVendorTeam,
  postVendorTeamInvite,
  patchVendorTeamMemberRole,
  deleteVendorTeamMember,
  type TeamMemberOut,
  type CompanyRole,
  getErrorMessage,
} from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { PageLayout } from "../components/PageLayout";
import { Users, AlertCircle, UserPlus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const COMPANY_ROLES: { value: CompanyRole; label: string }[] = [
  { value: "owner", label: "Владелец" },
  { value: "manager", label: "Менеджер" },
  { value: "warehouse", label: "Склад" },
  { value: "sales", label: "Продажи" },
];

export function VendorTeam() {
  const { user, token } = useAuth();
  const [members, setMembers] = useState<TeamMemberOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<CompanyRole>("sales");
  const [submitting, setSubmitting] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getVendorTeam(token)
      .then(setMembers)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = user?.role === "admin" || user?.company_role === "owner";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !invitePhone.trim()) return;
    setSubmitting(true);
    try {
      await postVendorTeamInvite({ phone: invitePhone.trim(), company_role: inviteRole }, token);
      toast.success("Сотрудник приглашён");
      setInviteOpen(false);
      setInvitePhone("");
      setInviteRole("sales");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: number, company_role: CompanyRole) => {
    if (!token) return;
    setEditingRoleId(userId);
    try {
      await patchVendorTeamMemberRole(userId, { company_role }, token);
      toast.success("Роль обновлена");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEditingRoleId(null);
    }
  };

  const handleRemove = async (userId: number, phone: string) => {
    if (!token || !window.confirm(`Удалить ${phone} из компании?`)) return;
    try {
      await deleteVendorTeamMember(userId, token);
      toast.success("Сотрудник удалён");
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (user?.role === "vendor" && user?.company_status === "pending_approval") {
    return (
      <PageLayout>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 max-w-xl text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Заявка на рассмотрении</h1>
          <p className="text-slate-700">После одобрения компании здесь будет доступен раздел «Сотрудники».</p>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-8 h-8 text-emerald-700" aria-hidden />
          Сотрудники
        </h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Сотрудники</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Users className="w-8 h-8 text-emerald-700" aria-hidden />
          Сотрудники
        </h1>
        {canManage && (
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            <UserPlus className="w-5 h-5" />
            Пригласить
          </button>
        )}
      </div>

      {inviteOpen && (
        <form
          onSubmit={handleInvite}
          className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-3"
        >
          <h2 className="font-semibold text-slate-900">Пригласить сотрудника</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="flex-1 min-w-[180px]">
              <span className="block text-sm font-medium text-slate-700 mb-1">Телефон</span>
              <input
                type="tel"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                placeholder="+7 700 123 45 67"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                required
              />
            </label>
            <label>
              <span className="block text-sm font-medium text-slate-700 mb-1">Роль</span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as CompanyRole)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
              >
                {COMPANY_ROLES.filter((r) => r.value !== "owner").map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-50"
              >
                {submitting ? "Отправка…" : "Пригласить"}
              </button>
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-slate-700 hover:bg-gray-100"
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-900">Телефон</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Имя</th>
              <th className="px-4 py-3 font-semibold text-slate-900">Роль</th>
              {canManage && <th className="px-4 py-3 font-semibold text-slate-900 w-32">Действия</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.user_id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-slate-800">{m.phone}</td>
                <td className="px-4 py-3 text-slate-700">{m.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {canManage && m.user_id !== user?.id ? (
                    <select
                      value={m.company_role}
                      onChange={(e) => handleRoleChange(m.user_id, e.target.value as CompanyRole)}
                      disabled={editingRoleId === m.user_id}
                      className="rounded border border-gray-300 px-2 py-1 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20"
                    >
                      {COMPANY_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-slate-700">{COMPANY_ROLES.find((r) => r.value === m.company_role)?.label ?? m.company_role}</span>
                  )}
                </td>
                {canManage && (
                  <td className="px-4 py-3">
                    {m.user_id !== user?.id && m.company_role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => handleRemove(m.user_id, m.phone)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label={`Удалить ${m.phone}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="px-4 py-8 text-center text-slate-500">Пока нет сотрудников. Пригласите участников компании.</p>
        )}
      </div>
    </PageLayout>
  );
}
