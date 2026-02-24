import { useState, useEffect } from "react";
import {
  getStaffEmployees,
  postStaffEmployee,
  patchStaffEmployee,
  getStaffRoles,
  type StaffEmployeeOut,
  type StaffRoleOut,
} from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { Button } from "../../components/ui";
import { AlertCircle } from "lucide-react";

export function StaffEmployees() {
  const { token, hasPermission, isDemo } = useStaffAuth();
  const [employees, setEmployees] = useState<StaffEmployeeOut[]>([]);
  const [roles, setRoles] = useState<StaffRoleOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formLogin, setFormLogin] = useState("");
  const [formName, setFormName] = useState("");
  const [formRoleId, setFormRoleId] = useState<number>(1);
  const [formPassword, setFormPassword] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formNewPassword, setFormNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token || isDemo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([getStaffEmployees(token), getStaffRoles(token)])
      .then(([emp, r]) => {
        setEmployees(emp);
        setRoles(r);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token, isDemo]);

  const openCreate = () => {
    setEditingId(null);
    setFormLogin("");
    setFormName("");
    setFormRoleId(roles[0]?.id ?? 1);
    setFormPassword("");
    setFormIsActive(true);
    setFormNewPassword("");
    setModalOpen(true);
  };

  const openEdit = (e: StaffEmployeeOut) => {
    setEditingId(e.id);
    setFormLogin(e.login);
    setFormName(e.name ?? "");
    setFormRoleId(e.role_id);
    setFormPassword("");
    setFormNewPassword("");
    setFormIsActive(e.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isDemo) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === null) {
        await postStaffEmployee(token, {
          login: formLogin.trim(),
          name: formName.trim() || null,
          role_id: formRoleId,
          password: formPassword,
          is_active: formIsActive,
        });
      } else {
        await patchStaffEmployee(token, editingId, {
          name: formName.trim() || null,
          role_id: formRoleId,
          is_active: formIsActive,
          new_password: formNewPassword.trim() || undefined,
        });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (emp: StaffEmployeeOut) => {
    if (!token || isDemo) return;
    setSaving(true);
    try {
      await patchStaffEmployee(token, emp.id, { is_active: !emp.is_active });
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission("staff.manage")) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Сотрудники</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
          Нет доступа. Требуется разрешение «Управление сотрудниками».
        </div>
      </>
    );
  }

  if (isDemo) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Сотрудники</h1>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 text-slate-600">
          В демо-режиме управление сотрудниками недоступно. Войдите по логину и паролю (когда backend настроен).
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Сотрудники</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Сотрудники</h1>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      <div className="mb-4">
        <Button onClick={openCreate}>Добавить сотрудника</Button>
      </div>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">Логин</th>
              <th className="text-left p-3 font-semibold text-slate-900">Имя</th>
              <th className="text-left p-3 font-semibold text-slate-900">Роль</th>
              <th className="text-left p-3 font-semibold text-slate-900">Активен</th>
              <th className="text-left p-3 font-semibold text-slate-900">Действия</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-gray-100">
                <td className="p-3">{emp.login}</td>
                <td className="p-3">{emp.name ?? "—"}</td>
                <td className="p-3">{emp.role_name}</td>
                <td className="p-3">{emp.is_active ? "Да" : "Нет"}</td>
                <td className="p-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(emp)}
                    className="text-emerald-800 hover:underline"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(emp)}
                    disabled={saving}
                    className="text-slate-600 hover:underline"
                  >
                    {emp.is_active ? "Деактивировать" : "Активировать"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && (
          <p className="p-6 text-slate-600 text-center">Нет сотрудников.</p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingId === null ? "Добавить сотрудника" : "Редактировать"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Логин</label>
                <input
                  type="text"
                  value={formLogin}
                  onChange={(e) => setFormLogin(e.target.value)}
                  required
                  disabled={editingId !== null}
                  className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Имя</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Роль</label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              {editingId === null ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Новый пароль (оставить пустым)</label>
                  <input
                    type="password"
                    value={formNewPassword}
                    onChange={(e) => setFormNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="form-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                <label htmlFor="form-is-active" className="text-sm text-slate-700">Активен</label>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" loading={saving}>
                  {editingId === null ? "Создать" : "Сохранить"}
                </Button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded border border-gray-200 text-slate-700 hover:bg-gray-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
