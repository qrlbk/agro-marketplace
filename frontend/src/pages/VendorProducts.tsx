import { useState, useEffect, useCallback } from "react";
import { request, uploadProductImage, productImageUrl, type Product, type ProductList } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { PageLayout } from "../components/PageLayout";
import { Input, Button } from "../components/ui";
import { ImagePlus, Trash2, Pencil } from "lucide-react";

const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

export function VendorProducts() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    article_number: "",
    price: "",
    stock_quantity: "0",
    description: "",
    characteristicsText: "",
    composition: "",
    images: [] as string[],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (user?.role === "vendor" && user?.company_status === "pending_approval") {
    return (
      <PageLayout>
        <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-8 max-w-xl text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Заявка на рассмотрении</h1>
          <p className="text-slate-700">
            Ваша заявка на регистрацию как поставщик отправлена. Ожидайте одобрения администратора. После одобрения здесь будет доступен список и редактирование товаров.
          </p>
        </div>
      </PageLayout>
    );
  }

  const load = useCallback(() => {
    if (!user?.id || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    request<ProductList>(`/products?vendor_id=${user.id}&limit=100`, { token })
      .then((res) => setProducts(res.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [user?.id, token]);

  useEffect(() => {
    load();
  }, [load]);

  const startAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      article_number: "",
      price: "",
      stock_quantity: "0",
      description: "",
      characteristicsText: "",
      composition: "",
      images: [],
    });
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    const characteristicsText = p.characteristics && Object.keys(p.characteristics).length > 0
      ? Object.entries(p.characteristics).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "";
    setForm({
      name: p.name,
      article_number: p.article_number,
      price: String(p.price),
      stock_quantity: String(p.stock_quantity),
      description: p.description ?? "",
      characteristicsText,
      composition: p.composition ?? "",
      images: p.images ?? [],
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !token) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadProductImage(files[i], token);
        setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки фото");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const save = async () => {
    if (!token) return;
    const name = form.name.trim();
    const article_number = form.article_number.trim() || null;
    const price = parseFloat(form.price);
    const stock_quantity = parseInt(form.stock_quantity, 10) || 0;
    if (!name) {
      setError("Заполните название товара");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setError("Укажите корректную цену");
      return;
    }
    setError(null);
    const characteristics: Record<string, string> = {};
    form.characteristicsText.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const colon = trimmed.indexOf(":");
      if (colon >= 0) {
        const key = trimmed.slice(0, colon).trim();
        const value = trimmed.slice(colon + 1).trim();
        if (key) characteristics[key] = value;
      }
    });
    const payload = {
      name,
      ...(article_number !== null && { article_number }),
      price,
      stock_quantity,
      description: form.description.trim() || null,
      characteristics: Object.keys(characteristics).length ? characteristics : null,
      composition: form.composition.trim() || null,
      images: form.images.length ? form.images : null,
    };
    setSaving(true);
    try {
      if (editingId) {
        await request(`/products/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
          token,
        });
      } else {
        await request("/products", {
          method: "POST",
          body: JSON.stringify(payload),
          token,
        });
      }
      load();
      setEditingId(null);
      startAdd();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <PageLayout>
      <h1>Мои товары</h1>
      <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
        Добавляйте фото товаров — они отображаются в каталоге и на странице товара.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">
          {error}
        </div>
      )}

      <div className="mb-4 sm:mb-6">
        <Button onClick={startAdd} variant="secondary">
          Добавить товар
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-md shadow-sm p-4 sm:p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {editingId ? "Редактировать товар" : "Новый товар"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="Название"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Название товара"
          />
          <Input
            label="Артикул"
            value={form.article_number}
            onChange={(e) => setForm((f) => ({ ...f, article_number: e.target.value }))}
            placeholder="Оставьте пустым для автогенерации"
          />
          <Input
            type="number"
            label="Цена (₸)"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="0"
          />
          <Input
            type="number"
            label="Количество"
            value={form.stock_quantity}
            onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))}
            placeholder="0"
          />
        </div>
        <Input
          label="Описание"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Краткое описание товара"
          className="mb-4"
        />
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Характеристики</label>
          <textarea
            value={form.characteristicsText}
            onChange={(e) => setForm((f) => ({ ...f, characteristicsText: e.target.value }))}
            placeholder={"По одной в строке:\nОбъём: 5 л\nВязкость: 15W-40"}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
          />
          <p className="text-sm text-slate-500 mt-1">Формат: название: значение (каждая пара с новой строки).</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Состав</label>
          <textarea
            value={form.composition}
            onChange={(e) => setForm((f) => ({ ...f, composition: e.target.value }))}
            placeholder="Состав (для семян, СЗР, удобрений и т.д.)"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
          />
        </div>

        <div className="mb-4">
          <span className="block text-sm font-semibold text-slate-700 mb-2">Фото товара</span>
          <div className="flex flex-wrap gap-3 items-start">
            {form.images.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={productImageUrl(url)}
                  alt=""
                  className="w-24 h-24 object-cover rounded-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800"
                  aria-label="Удалить фото"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-24 h-24 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-emerald-600 hover:bg-emerald-50/50 transition-colors">
              <input
                type="file"
                accept={ACCEPT_IMAGES}
                multiple
                onChange={handleImageSelect}
                disabled={uploading}
                className="hidden"
              />
              {uploading ? (
                <span className="text-xs text-slate-500">Загрузка…</span>
              ) : (
                <ImagePlus className="w-8 h-8 text-slate-400" aria-hidden />
              )}
            </label>
          </div>
          <p className="text-sm text-slate-500 mt-1">JPG, PNG, WebP или GIF. Первое фото — основное в каталоге.</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={save} loading={saving}>
            {editingId ? "Сохранить" : "Создать товар"}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={() => { setEditingId(null); startAdd(); }}>
              Отмена
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded-md" />
          <div className="h-16 bg-gray-200 rounded-md" />
        </div>
      ) : (
        <ul className="list-none p-0 m-0 space-y-3">
          {products.map((p) => (
            <li
              key={p.id}
              className="bg-white border border-gray-200 rounded-md shadow-sm p-4 flex flex-wrap items-center gap-4"
            >
              {p.images?.[0] ? (
                <img
                  src={productImageUrl(p.images[0])}
                  alt=""
                  className="w-16 h-16 object-cover rounded-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center text-slate-400 text-xs">
                  Нет фото
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-slate-700">{p.article_number}</p>
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-slate-600 text-sm">{Number(p.price).toLocaleString("ru-KZ")} ₸ · {p.stock_quantity} шт.</p>
              </div>
              <Button variant="secondary" onClick={() => startEdit(p)} aria-label={`Редактировать ${p.name}`}>
                <Pencil className="w-5 h-5" />
                Редактировать
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!loading && products.length === 0 && (
        <p className="text-slate-600">Товаров пока нет. Добавьте первый товар выше или загрузите прайс-лист (Прайс-лист).</p>
      )}
    </PageLayout>
  );
}
