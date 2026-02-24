import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getRegions, patchAuthMe } from "../api/client";
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
  const [regionsList, setRegionsList] = useState<string[]>(REGIONS_KZ);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getRegions().then(setRegionsList).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setRegion(user.region ?? "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await patchAuthMe({ name: name || null, region: region || null }, token);
      await refreshUser();
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto">
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
            <Button type="submit" loading={saving}>Сохранить</Button>
          </form>
        </div>
      </div>
    </PageLayout>
  );
}
