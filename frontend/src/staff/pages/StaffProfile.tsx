import { useState } from "react";
import { staffChangePassword } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { AlertCircle } from "lucide-react";

export function StaffProfile() {
  const { staff, token, isDemo } = useStaffAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 6) {
      setError("Новый пароль должен быть не короче 6 символов");
      return;
    }
    if (isDemo || !token || token === "__staff_demo__") {
      setError("В демо-режиме смена пароля недоступна");
      return;
    }
    setLoading(true);
    try {
      await staffChangePassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка смены пароля");
    } finally {
      setLoading(false);
    }
  };

  if (!staff) return null;

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Профиль</h1>
      <div className="bg-white border border-gray-200 rounded-md p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">Данные сотрудника</h2>
        <p className="text-slate-700">
          <span className="font-medium">Имя:</span> {staff.name ?? "—"}
        </p>
        <p className="text-slate-700">
          <span className="font-medium">Логин:</span> {staff.login}
        </p>
        <p className="text-slate-700">
          <span className="font-medium">Роль:</span> {staff.role.name}
        </p>
        {staff.is_active && (
          <p className="text-slate-600 text-sm mt-2">Аккаунт активен</p>
        )}
        {isDemo && (
          <p className="mt-2 text-amber-700 text-sm">Вы вошли в демо-режиме (admin / admin).</p>
        )}
      </div>

      {!isDemo && (
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h2 className="font-semibold text-slate-900 mb-2">Изменить пароль</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="staff-profile-current" className="block text-sm font-medium text-slate-700 mb-1">
                Текущий пароль
              </label>
              <input
                id="staff-profile-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="staff-profile-new" className="block text-sm font-medium text-slate-700 mb-1">
                Новый пароль
              </label>
              <input
                id="staff-profile-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="staff-profile-confirm" className="block text-sm font-medium text-slate-700 mb-1">
                Подтверждение нового пароля
              </label>
              <input
                id="staff-profile-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                Пароль успешно изменён.
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-md bg-emerald-800 text-white font-medium hover:bg-emerald-900 disabled:opacity-50"
            >
              {loading ? "Сохранение…" : "Изменить пароль"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
