import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getBinLookup, getRegions, postOnboarding, type OnboardingBody } from "../api/client";
import { PageLayout } from "../components/PageLayout";
import { Input, Button, Select } from "../components/ui";
import { User, Tractor, Store } from "lucide-react";

const REGIONS_KZ = [
  "Акмолинская область", "Актюбинская область", "Алматинская область", "Атырауская область",
  "Восточно-Казахстанская область", "Жамбылская область", "Западно-Казахстанская область",
  "Карагандинская область", "Костанайская область", "Кызылординская область", "Мангистауская область",
  "Павлодарская область", "Северо-Казахстанская область", "Туркестанская область", "Улытауская область",
  "г. Астана", "г. Алматы", "г. Шымкент",
];

type RoleChoice = "user" | "farmer" | "vendor" | null;

export function Onboarding() {
  const { user, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"choose" | "form">("choose");
  const [role, setRole] = useState<RoleChoice>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [binLookupLoading, setBinLookupLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [bin, setBin] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [chairmanName, setChairmanName] = useState("");
  const [bankIik, setBankIik] = useState("");
  const [bankBik, setBankBik] = useState("");
  const [contactName, setContactName] = useState("");
  const [regionsList, setRegionsList] = useState<string[]>(REGIONS_KZ);

  useEffect(() => {
    getRegions().then(setRegionsList).catch(() => {});
  }, []);

  if (!user || user.role !== "guest") {
    navigate("/catalog", { replace: true });
    return null;
  }

  const selectRole = (r: RoleChoice) => {
    setRole(r);
    setStep("form");
    setError("");
  };

  const handleBinLookup = async () => {
    const clean = bin.replace(/\D/g, "");
    if (clean.length < 10 || !token) return;
    setBinLookupLoading(true);
    setError("");
    try {
      const res = await getBinLookup(clean, token);
      if (res.name) setCompanyName(res.name);
      if (res.legal_address) setLegalAddress(res.legal_address);
      if (res.chairman_name) setChairmanName(res.chairman_name);
    } catch {
      // Fallback: leave fields for manual input
    } finally {
      setBinLookupLoading(false);
    }
  };

  const submitUser = async () => {
    if (!token) return;
    setError("");
    setSubmitting(true);
    try {
      await postOnboarding({ role: "user", name: name || null, region: region || null }, token);
      refreshUser();
      navigate("/catalog", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitFarmer = async () => {
    const cleanBin = bin.replace(/\D/g, "");
    if (cleanBin.length < 10) {
      setError("Введите корректный БИН (10–12 цифр)");
      return;
    }
    if (!token) return;
    setError("");
    setSubmitting(true);
    try {
      const body: OnboardingBody = {
        role: "farmer",
        name: name || null,
        region: region || null,
        bin: cleanBin,
        company_name: companyName || null,
        legal_address: legalAddress || null,
        chairman_name: chairmanName || null,
      };
      await postOnboarding(body, token);
      refreshUser();
      navigate("/garage", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitVendor = async () => {
    const cleanBin = bin.replace(/\D/g, "");
    if (cleanBin.length < 10) {
      setError("Введите корректный БИН (10–12 цифр)");
      return;
    }
    if (!token) return;
    setError("");
    setSubmitting(true);
    try {
      const body: OnboardingBody = {
        role: "vendor",
        name: name || null,
        region: region || null,
        bin: cleanBin,
        company_name: companyName || null,
        legal_address: legalAddress || null,
        chairman_name: chairmanName || contactName || null,
        contact_name: contactName || null,
        bank_iik: bankIik || null,
        bank_bik: bankBik || null,
      };
      await postOnboarding(body, token);
      refreshUser();
      navigate("/catalog", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const backToChoose = () => {
    setStep("choose");
    setRole(null);
    setError("");
  };

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto">
        {step === "choose" && (
          <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
            <h1 className="text-xl font-bold text-slate-900 mb-2">Как вы планируете использовать платформу?</h1>
            <p className="text-slate-600 mb-6">Выберите тип аккаунта</p>
            <div className="grid gap-4 sm:grid-cols-1">
              <button
                type="button"
                onClick={() => selectRole("user")}
                className="flex items-start gap-4 p-4 rounded-md border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition-colors"
              >
                <User className="h-10 w-10 text-slate-500 shrink-0" aria-hidden />
                <div>
                  <span className="font-bold text-slate-900 block">Обычный пользователь</span>
                  <span className="text-sm text-slate-600">Механик, тракторист, частник — покупки для себя, оплата картой</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectRole("farmer")}
                className="flex items-start gap-4 p-4 rounded-md border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition-colors"
              >
                <Tractor className="h-10 w-10 text-slate-500 shrink-0" aria-hidden />
                <div>
                  <span className="font-bold text-slate-900 block">Фермер (КХ, ТОО)</span>
                  <span className="text-sm text-slate-600">Счета на оплату, гараж, заказы компании, приглашение механиков</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectRole("vendor")}
                className="flex items-start gap-4 p-4 rounded-md border-2 border-gray-200 hover:border-amber-500 hover:bg-amber-50/50 text-left transition-colors"
              >
                <Store className="h-10 w-10 text-slate-500 shrink-0" aria-hidden />
                <div>
                  <span className="font-bold text-slate-900 block">Поставщик / Компания</span>
                  <span className="text-sm text-slate-600">Загрузка прайс-листов и товаров. Заявка требует одобрения администратора</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === "form" && role === "user" && (
          <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
            <h1 className="text-xl font-bold text-slate-900 mb-6">Обычный пользователь</h1>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">{error}</div>
            )}
            <div className="space-y-4">
              <Input label="Имя" placeholder="Как к вам обращаться" value={name} onChange={(e) => setName(e.target.value)} />
              <Select
                label="Регион (для доставки)"
                options={[{ value: "", label: "— Выберите регион —" }, ...regionsList.map((r) => ({ value: r, label: r }))]}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
              <div className="flex gap-2 pt-2">
                <Button onClick={submitUser} loading={submitting}>Продолжить</Button>
                <Button variant="secondary" onClick={backToChoose}>Назад</Button>
              </div>
            </div>
          </div>
        )}

        {step === "form" && role === "farmer" && (
          <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
            <h1 className="text-xl font-bold text-slate-900 mb-6">Фермер (КХ, ТОО)</h1>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">{error}</div>
            )}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  label="БИН"
                  placeholder="12 цифр"
                  value={bin}
                  onChange={(e) => setBin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className="flex-1"
                />
                <div className="pt-8">
                  <Button variant="secondary" onClick={handleBinLookup} loading={binLookupLoading}>Проверить</Button>
                </div>
              </div>
              <Input label="Название компании" placeholder="Подставится по БИН или введите вручную" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              <Select
                label="Регион"
                options={[{ value: "", label: "— Выберите регион —" }, ...regionsList.map((r) => ({ value: r, label: r }))]}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
              <Input label="Юридический адрес" placeholder="Подставится по БИН или введите вручную" value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} />
              <Input label="ФИО руководителя" placeholder="Подставится по БИН или введите вручную" value={chairmanName} onChange={(e) => setChairmanName(e.target.value)} />
              <Input label="Ваше имя" placeholder="Как к вам обращаться" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="flex gap-2 pt-2">
                <Button onClick={submitFarmer} loading={submitting}>Продолжить</Button>
                <Button variant="secondary" onClick={backToChoose}>Назад</Button>
              </div>
            </div>
          </div>
        )}

        {step === "form" && role === "vendor" && (
          <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
            <h1 className="text-xl font-bold text-slate-900 mb-6">Поставщик / Компания</h1>
            {error && (
              <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">{error}</div>
            )}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  label="БИН"
                  placeholder="12 цифр"
                  value={bin}
                  onChange={(e) => setBin(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className="flex-1"
                />
                <div className="pt-8">
                  <Button variant="secondary" onClick={handleBinLookup} loading={binLookupLoading}>Проверить</Button>
                </div>
              </div>
              <Input label="Название компании" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              <Select
                label="Регион компании"
                options={[{ value: "", label: "— Выберите регион —" }, ...regionsList.map((r) => ({ value: r, label: r }))]}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
              <Input label="Юридический адрес" value={legalAddress} onChange={(e) => setLegalAddress(e.target.value)} />
              <Input label="ФИО руководителя" value={chairmanName} onChange={(e) => setChairmanName(e.target.value)} />
              <Input label="Контакт ответственного" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              <Input label="ИИК (банк)" placeholder="IBAN / счёт" value={bankIik} onChange={(e) => setBankIik(e.target.value)} />
              <Input label="БИК банка" value={bankBik} onChange={(e) => setBankBik(e.target.value)} />
              <Input label="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} />
              <div className="flex gap-2 pt-2">
                <Button onClick={submitVendor} loading={submitting}>Отправить заявку</Button>
                <Button variant="secondary" onClick={backToChoose}>Назад</Button>
              </div>
              <p className="text-sm text-slate-600">После отправки заявки ожидайте одобрения администратора. Доступ к загрузке товаров откроется после проверки.</p>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
