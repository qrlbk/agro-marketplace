import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getRegions, patchAuthMe, setUserPassword } from "../api/client";
import { PageLayout } from "../components/PageLayout";
import { Input, Button, Select } from "../components/ui";

const REGIONS_KZ = [
  "Акмолинская область", "Актюбинская область", "Алматинская область", "Атырауская область",
  "Восточно-Казахстанская область", "Жамбылская область", "Западно-Казахстанская область",
  "Карагандинская область", "Костанайская область", "Кызылординская область", "Мангистауская область",
  "Павлодарская область", "Северо-Казахстанская область", "Туркестанская область", "Улытауская область",
  "г. Астана", "г. Алматы", "г. Шымкент",
];

export function Profile() {
  const { user, token, refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [chatStorageOptIn, setChatStorageOptIn] = useState(false);
  const [regionsList, setRegionsList] = useState<string[]>(REGIONS_KZ);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  useEffect(() => {
    getRegions().then(setRegionsList).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setRegion(user.region ?? "");
      setChatStorageOptIn(user.chat_storage_opt_in ?? false);
      setHasPassword(Boolean(user.has_password));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await patchAuthMe(
        { name: name || null, region: region || null, chat_storage_opt_in: chatStorageOptIn },
        token
      );
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPasswordError("");
    setPasswordSaved(false);
    if (hasPassword && !currentPassword.trim()) {
      setPasswordError("Введите текущий пароль");
      return;
    }
    if (!newPassword.trim()) {
      setPasswordError("Введите новый пароль");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }
    setPasswordSaving(true);
    try {
      const body: { current_password?: string | null; new_password: string } = {
        new_password: newPassword,
      };
      if (hasPassword) {
        body.current_password = currentPassword;
      }
      await setUserPassword(token, body);
      setPasswordSaved(true);
      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshUser();
    } catch (e) {
      setPasswordError((e as Error).message);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!user) return null;

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto pb-4">
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Профиль</h1>
          <p className="text-slate-600 mb-6">Телефон: {user.phone}</p>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">{error}</div>
          )}
          {saved && (
            <div className="mb-4 p-3 rounded-md bg-green-50 text-green-700 text-sm font-medium" role="alert">Изменения сохранены</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Имя" placeholder="Как к вам обращаться" value={name} onChange={(e) => setName(e.target.value)} />
            <Select
              label="Регион"
              options={[{ value: "", label: "— Выберите регион —" }, ...regionsList.map((r) => ({ value: r, label: r }))]}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
            <div className="flex items-start gap-3">
              <input
                id="chat_storage_opt_in"
                type="checkbox"
                checked={chatStorageOptIn}
                onChange={(e) => setChatStorageOptIn(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="chat_storage_opt_in" className="text-sm text-slate-700">
                Сохранять историю чата с помощником (для персонализации и улучшения ответов). Можно отключить в любой момент.
              </label>
            </div>
            <Button type="submit" loading={saving}>Сохранить</Button>
          </form>
        </div>
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Пароль аккаунта</h2>
          <p className="text-slate-600 text-sm mb-4">
            {hasPassword
              ? "У вас уже установлен пароль. Вы можете сменить его здесь."
              : "У вас ещё нет пароля. Задайте пароль, чтобы входить без SMS-кода."}
          </p>
          {passwordError && (
            <div
              className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium"
              role="alert"
            >
              {passwordError}
            </div>
          )}
          {passwordSaved && (
            <div
              className="mb-4 p-3 rounded-md bg-green-50 text-green-700 text-sm font-medium"
              role="alert"
            >
              Пароль обновлён
            </div>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {hasPassword && (
              <Input
                label="Текущий пароль"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            )}
            <Input
              label="Новый пароль"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Подтверждение пароля"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" loading={passwordSaving}>
              {hasPassword ? "Сменить пароль" : "Задать пароль"}
            </Button>
          </form>
        </div>
      </div>
    </PageLayout>
  );
}
