import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { request, productImageUrl, type Product, type ProductList } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { PageLayout } from "../components/PageLayout";
import { Package, AlertTriangle, Pencil, Warehouse as WarehouseIcon } from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

export function Warehouse() {
  const { user, token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user?.id || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    request<ProductList>(`/products?vendor_id=${user.id}&limit=500`, { token })
      .then((res) => setProducts(res.items))
      .catch((e) => {
        setProducts([]);
        setError(e instanceof Error ? e.message : "Ошибка загрузки склада");
      })
      .finally(() => setLoading(false));
  }, [user?.id, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (user?.role === "vendor" && user?.company_status === "pending_approval") {
    return (
      <PageLayout>
        <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-8 max-w-xl text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-2">Заявка на рассмотрении</h1>
          <p className="text-slate-700">
            После одобрения компании здесь будет доступен просмотр остатков по складу.
          </p>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <WarehouseIcon className="w-8 h-8 text-emerald-700" aria-hidden />
          Склад
        </h1>
        <p className="text-slate-600 mb-6">Остатки по вашим товарам</p>
        <div className="animate-pulse space-y-3">
          <div className="h-12 bg-gray-200 rounded-md" />
          <div className="h-12 bg-gray-200 rounded-md" />
          <div className="h-12 bg-gray-200 rounded-md" />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <WarehouseIcon className="w-8 h-8 text-emerald-700" aria-hidden />
          Склад
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 mt-6">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            type="button"
            onClick={load}
            className="min-h-10 px-4 rounded-lg border-2 border-red-500 text-red-600 font-semibold hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            Повторить
          </button>
        </div>
      </PageLayout>
    );
  }

  const inStockCount = products.filter((p) => p.stock_quantity > 0).length;
  const lowStockCount = products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;

  return (
    <PageLayout>
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <WarehouseIcon className="w-8 h-8 text-emerald-700" aria-hidden />
        Склад
      </h1>
      <p className="text-slate-600 mb-4 sm:mb-6 text-sm sm:text-base">
        Остатки по вашим товарам. Обновляйте остатки в разделе «Мои товары» или через загрузку прайс-листа.
      </p>

      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" aria-hidden />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Склад пуст</h2>
          <p className="text-slate-600 mb-6">Добавьте товары в разделе «Мои товары» или загрузите прайс-лист.</p>
          <Link
            to="/vendor/products"
            className="inline-flex items-center justify-center min-h-12 px-6 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            Мои товары
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">В наличии</p>
              <p className="text-2xl font-bold text-emerald-700">{inStockCount}</p>
              <p className="text-slate-600 text-sm">позиций</p>
            </div>
            <div className="bg-white border border-amber-100 rounded-xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Мало осталось (≤{LOW_STOCK_THRESHOLD} шт.)</p>
              <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
              <p className="text-slate-600 text-sm">позиций</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-slate-500 text-sm font-medium">Нет в наличии</p>
              <p className="text-2xl font-bold text-slate-600">{outOfStockCount}</p>
              <p className="text-slate-600 text-sm">позиций</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 font-semibold text-slate-700">Артикул</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Наименование</th>
                    <th className="py-3 px-4 font-semibold text-slate-700 text-right">Остаток, шт.</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Статус</th>
                    <th className="py-3 px-4 font-semibold text-slate-700 text-right">Цена</th>
                    <th className="py-3 px-4 font-semibold text-slate-700 w-24" aria-label="Действия" />
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const inStock = p.status === "In_Stock";
                    const lowStock = p.stock_quantity > 0 && p.stock_quantity <= LOW_STOCK_THRESHOLD;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-gray-100 last:border-0 ${
                          lowStock ? "bg-amber-50/50" : p.stock_quantity === 0 ? "bg-slate-50/50" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono text-sm text-slate-700">{p.article_number}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {p.images?.[0] ? (
                              <img
                                src={productImageUrl(p.images[0])}
                                alt=""
                                className="w-10 h-10 object-cover rounded-md shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-gray-100 shrink-0 flex items-center justify-center text-slate-400 text-xs">
                                —
                              </div>
                            )}
                            <span className="font-medium text-slate-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={lowStock ? "font-semibold text-amber-700" : "text-slate-700"}>
                            {p.stock_quantity}
                          </span>
                          {lowStock && (
                            <AlertTriangle className="inline-block w-4 h-4 ml-1 text-amber-500 align-middle" aria-hidden />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
                              inStock ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${inStock ? "bg-emerald-500" : "bg-amber-500"}`}
                              aria-hidden
                            />
                            {inStock ? "В наличии" : "Под заказ"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">
                          {Number(p.price).toLocaleString("ru-KZ")} ₸
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            to="/vendor/products"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 rounded"
                            aria-label={`Редактировать ${p.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                            Изменить
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-slate-500 text-sm mt-4">
            Всего позиций: <strong>{products.length}</strong>. Остатки можно изменить в разделе «Мои товары».
          </p>
        </>
      )}
    </PageLayout>
  );
}
