import { useState, useEffect } from "react";
import {
  getStaffRoles,
  getStaffPermissions,
  postStaffRole,
  patchStaffRole,
  type StaffRoleOut,
  type StaffPermissionOut,
} from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { Button } from "../../components/ui";
import { AlertCircle } from "lucide-react";

export function StaffRoles() {
  const { token, hasPermission, isDemo } = useStaffAuth();
  const [roles, setRoles] = useState<StaffRoleOut[]>([]);
  const [permissions, setPermissions] = useState<StaffPermissionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPermissionIds, setFormPermissionIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!token || isDemo) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([getStaffRoles(token), getStaffPermissions(token)])
      .then(([r, p]) => {
        setRoles(r);
        setPermissions(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token, isDemo]);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormSlug("");
    setFormPermissionIds([]);
    setModalOpen(true);
  };

  const openEdit = (role: StaffRoleOut) => {
    setEditingId(role.id);
    setFormName(role.name);
    setFormSlug(role.slug);
    setFormPermissionIds(
      permissions.filter((p) => role.permission_codes.includes(p.code)).map((p) => p.id)
    );
    setModalOpen(true);
  };

  const togglePermission = (id: number) => {
    setFormPermissionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isDemo) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === null) {
        await postStaffRole(token, {
          name: formName.trim(),
          slug: formSlug.trim(),
          permission_ids: formPermissionIds,
        });
      } else {
        await patchStaffRole(token, editingId, {
          name: formName.trim(),
          slug: formSlug.trim(),
          permission_ids: formPermissionIds,
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

  if (!hasPermission("roles.manage")) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Роли</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
          Нет доступа. Требуется разрешение «Управление ролями».
        </div>
      </>
    );
  }

  if (isDemo) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Роли</h1>
        <div className="bg-slate-50 border border-slate-200 rounded-md p-6 text-slate-600">
          В демо-режиме управление ролями недоступно. Войдите по логину и паролю (когда backend настроен).
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Роли</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Роли</h1>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      <div className="mb-4">
        <Button onClick={openCreate}>Создать роль</Button>
      </div>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-slate-900">Название</th>
              <th className="text-left p-3 font-semibold text-slate-900">Slug</th>
              <th className="text-left p-3 font-semibold text-slate-900">Системная</th>
              <th className="text-left p-3 font-semibold text-slate-900">Разрешений</th>
              <th className="text-left p-3 font-semibold text-slate-900">Действия</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="p-3">{r.name}</td>
                <td className="p-3 font-mono text-slate-600">{r.slug}</td>
                <td className="p-3">{r.is_system ? "Да" : "Нет"}</td>
                <td className="p-3">{r.permission_codes.length}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="text-emerald-800 hover:underline"
                  >
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {roles.length === 0 && (
          <p className="p-6 text-slate-600 text-center">Нет ролей.</p>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingId === null ? "Создать роль" : "Редактировать роль"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900 font-mono"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-slate-700 mb-2">Разрешения</span>
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto border border-gray-200 rounded p-2">
                  {permissions.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissionIds.includes(p.id)}
                        onChange={() => togglePermission(p.id)}
                      />
                      <span className="font-mono text-sm">{p.code}</span>
                      <span className="text-slate-500 text-xs">{p.name}</span>
                    </label>
                  ))}
                </div>
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
