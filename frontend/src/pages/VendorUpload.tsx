import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { uploadFile } from "../api/client";
import { PageLayout } from "../components/PageLayout";
import { Button } from "../components/ui";
import { Upload, CheckCircle2, BarChart3 } from "lucide-react";

export interface PricelistUploadResult {
  created: number;
  updated: number;
  rows_processed: number;
  mapping_confidence?: Record<string, number>;
}

const FIELD_LABELS: Record<string, string> = {
  article_number: "Артикул",
  name: "Название",
  price: "Цена",
  quantity: "Количество",
};

export function VendorUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PricelistUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { token, user } = useAuth();

  if (user?.role === "vendor" && user?.company_status === "pending_approval") {
    return (
      <PageLayout>
        <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-8 max-w-xl text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Заявка на рассмотрении</h1>
          <p className="text-slate-700">
            Ваша заявка на регистрацию как поставщик отправлена. Ожидайте одобрения администратора платформы. После одобрения здесь будет доступна загрузка прайс-листов и товаров.
          </p>
        </div>
      </PageLayout>
    );
  }

  const upload = async () => {
    if (!file || !token) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Выберите файл .xlsx или .xls");
      return;
    }
    setError(null);
    setResult(null);
    setUploading(true);
    try {
      const data = await uploadFile("/vendor/upload-pricelist", file, token) as PricelistUploadResult;
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageLayout>
      <h1>Загрузка прайс-листа</h1>
      <p className="text-slate-600 mb-6">
        Загрузите Excel-файл с колонками: артикул (или код), наименование, цена, количество. Система сама определит соответствие колонок.
      </p>
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 max-w-2xl">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Файл (.xlsx или .xls)
        </label>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 file:cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          />
          <Button onClick={upload} disabled={!file} loading={uploading}>
            <Upload className="h-5 w-5" />
            Загрузить
          </Button>
        </div>
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium" role="alert">
            {error}
          </div>
        )}
        {result && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-emerald-200/80 bg-white">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Прайс загружен
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Обработано строк: <span className="font-semibold text-slate-800">{result.rows_processed}</span>
              </p>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-100 p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-emerald-700">{result.created}</div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-0.5">Создано</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-100 p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-slate-700">{result.updated}</div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-0.5">Обновлено</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-100 p-3 text-center shadow-sm col-span-2 sm:col-span-2">
                <div className="text-2xl font-bold text-slate-800">{result.rows_processed}</div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-0.5">Всего обработано</div>
              </div>
            </div>
            {result.mapping_confidence && Object.keys(result.mapping_confidence).length > 0 && (
              <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm mb-2">
                  <BarChart3 className="h-4 w-4 text-slate-500" />
                  Уверенность распознавания колонок
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.mapping_confidence).map(([key, value]) => {
                    const pct = Math.round((value ?? 0) * 100);
                    const label = FIELD_LABELS[key] ?? key;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm"
                      >
                        <span className="text-slate-600">{label}:</span>
                        <span className={`font-semibold ${pct >= 80 ? "text-emerald-700" : pct >= 50 ? "text-amber-700" : "text-slate-600"}`}>
                          {pct}%
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
