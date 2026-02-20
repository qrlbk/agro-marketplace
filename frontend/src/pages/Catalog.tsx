import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { request, getCategoryTree, getRecommendations, ProductList, Machine, type Product, type CategoryTree, type RecommendationOut } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useCartContext } from "../contexts/CartContext";
import { ProductCard } from "../components/ProductCard";
import { GarageWidget } from "../components/GarageWidget";
import { PageLayout } from "../components/PageLayout";
import { AlertCircle, X, SlidersHorizontal } from "lucide-react";

const PARTS_ROOT_SLUG = "zapchasti-tehnika";

type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

function flattenTree(tree: CategoryTree[]): Map<number, { slug: string; parent_id: number | null }> {
  const map = new Map<number, { slug: string; parent_id: number | null }>();
  function walk(nodes: CategoryTree[]) {
    for (const n of nodes) {
      map.set(n.id, { slug: n.slug, parent_id: n.parent_id });
      walk(n.children);
    }
  }
  walk(tree);
  return map;
}

function isPartsCategory(flatCategories: Map<number, { slug: string; parent_id: number | null }>, categoryId: string | null): boolean {
  if (!categoryId || categoryId === "") return true;
  const id = parseInt(categoryId, 10);
  if (Number.isNaN(id)) return true;
  let current: { slug: string; parent_id: number | null } | undefined = flatCategories.get(id);
  while (current) {
    if (current.slug === PARTS_ROOT_SLUG) return true;
    current = current.parent_id != null ? flatCategories.get(current.parent_id) : undefined;
  }
  return false;
}

function sortProducts(items: Product[], sort: SortOption): Product[] {
  if (sort === "default") return items;
  const arr = [...items];
  switch (sort) {
    case "price_asc":
      return arr.sort((a, b) => Number(a.price) - Number(b.price));
    case "price_desc":
      return arr.sort((a, b) => Number(b.price) - Number(a.price));
    case "name_asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return arr;
  }
}

function CatalogSkeleton() {
  return (
    <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <li key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="aspect-square bg-gray-200 animate-pulse" />
          <div className="p-5 space-y-2">
            <div className="h-5 bg-gray-200 rounded w-4/5 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse mt-3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const categoryIdParam = searchParams.get("category") ?? "";
  const [categoryId, setCategoryId] = useState(categoryIdParam);
  const [machineId, setMachineId] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [data, setData] = useState<ProductList | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationOut[]>([]);
  const { token } = useAuth();
  const { invalidateCart } = useCartContext();
  const navigate = useNavigate();

  const flatCategories = useMemo(() => flattenTree(categoryTree), [categoryTree]);
  const showMachineFilter = isPartsCategory(flatCategories, categoryId);

  useEffect(() => {
    setCategoryId(categoryIdParam);
  }, [categoryIdParam]);

  useEffect(() => {
    getCategoryTree().then(setCategoryTree).catch(() => setCategoryTree([]));
  }, []);

  useEffect(() => {
    request<Machine[]>("/machines")
      .then(setMachines)
      .catch(() => setMachines([]));
  }, []);

  useEffect(() => {
    if (!token) {
      setRecommendations([]);
      return;
    }
    getRecommendations(token)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [token]);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q) {
      params.set("q", q);
      if (q.trim().length >= 2) params.set("expand", "true");
    }
    if (machineId) params.set("machine_id", machineId);
    if (categoryId) params.set("category_id", categoryId);
    params.set("limit", "500");
    request<ProductList>(`/products?${params}`)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setData({ items: [], total: 0 });
        setError(err instanceof Error ? err.message : "Ошибка загрузки каталога");
        setLoading(false);
      });
  }, [q, machineId, categoryId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value) p.set("category", value);
      else p.delete("category");
      return p;
    });
  };

  const selectedMachine =
    machineId && machines.length
      ? machines.find((m) => m.id === Number(machineId)) ?? null
      : null;

  const sortedItems = useMemo(
    () => (data?.items ? sortProducts(data.items, sortBy) : []),
    [data?.items, sortBy]
  );

  const handleAddToCart = useCallback(
    async (productId: number) => {
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        await request("/cart/items", {
          method: "POST",
          body: JSON.stringify({ product_id: productId, quantity: 1 }),
          token,
        });
        invalidateCart();
        setAddedProductId(productId);
        setTimeout(() => setAddedProductId(null), 2500);
      } catch {
        // no-op; user can retry
      }
    },
    [token, navigate, invalidateCart]
  );

  return (
    <PageLayout>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Каталог</h1>
        <p className="mt-1 text-slate-600">
          Запчасти и техника, семена, удобрения, СЗР — выберите раздел или смотрите весь каталог.
        </p>
      </header>

      {/* Блок «Разделы» — быстрые ссылки на разделы каталога */}
      {categoryTree.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {categoryTree.map((root) => (
            <Link
              key={root.id}
              to={`/catalog?category=${root.id}`}
              className={`block p-4 rounded-xl border-2 text-center font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 ${
                categoryId === String(root.id)
                  ? "border-emerald-800 bg-emerald-50 text-emerald-900"
                  : "border-gray-200 bg-white text-slate-800 hover:border-emerald-600 hover:bg-emerald-50/50"
              }`}
            >
              {root.name}
            </Link>
          ))}
        </div>
      )}

      {/* Фильтр по категории */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label htmlFor="catalog-category" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          Раздел:
        </label>
        <select
          id="catalog-category"
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="min-h-10 px-4 rounded-lg border border-gray-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
        >
          <option value="">Весь каталог</option>
          {categoryTree.map((root) => (
            <optgroup key={root.id} label={root.name}>
              <option value={root.id}>{root.name}</option>
              {root.children.map((child) => (
                <option key={child.id} value={child.id}>
                  — {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {categoryId && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-semibold">
            Категория выбрана
            <button
              type="button"
              onClick={() => handleCategoryChange("")}
              className="p-0.5 rounded hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              aria-label="Сбросить категорию"
            >
              <X className="w-4 h-4" />
            </button>
          </span>
        )}
      </div>

      {/* Фильтр по технике и GarageWidget — только для раздела «Запчасти и техника» */}
      {showMachineFilter && (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <label htmlFor="catalog-machine" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" aria-hidden />
              Техника:
            </label>
            <select
              id="catalog-machine"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="min-h-10 px-4 rounded-lg border border-gray-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
            >
              <option value="">Вся техника</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.model}
                </option>
              ))}
            </select>
            {selectedMachine && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold">
                Фильтр: {selectedMachine.brand} {selectedMachine.model}
                <button
                  type="button"
                  onClick={() => setMachineId("")}
                  className="p-0.5 rounded hover:bg-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  aria-label="Сбросить фильтр"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
          </div>

          {selectedMachine && (
            <div className="mb-6">
              <GarageWidget
                selectedMachine={selectedMachine}
                onClearFilter={() => setMachineId("")}
                onAddMachine={() => navigate("/garage")}
              />
            </div>
          )}
        </>
      )}

      {token && recommendations.length > 0 && (
        <section className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200" aria-labelledby="recommendations-heading">
          <h2 id="recommendations-heading" className="text-base font-semibold text-emerald-800 mb-3">
            Рекомендуем для вашей техники
          </h2>
          <ul className="list-none p-0 m-0 flex flex-wrap gap-4">
            {recommendations.map((rec) => (
              <li key={rec.product_id} className="min-w-0 flex-1 basis-48 max-w-xs">
                <Link
                  to={`/product/${rec.product_id}`}
                  className="block p-3 rounded-lg bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-sm transition-colors"
                >
                  <p className="font-medium text-slate-900 truncate">{rec.name}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{rec.article_number}</p>
                  <p className="mt-1 text-emerald-800 font-semibold">
                    {Number(rec.price).toLocaleString("ru-KZ")} ₸
                  </p>
                  <p className="text-xs text-slate-600 mt-1">{rec.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-red-700 font-medium">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            {error}
          </div>
          <button
            type="button"
            onClick={fetchProducts}
            className="min-h-10 px-4 rounded-lg border-2 border-red-500 text-red-600 font-semibold hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            Повторить
          </button>
        </div>
      )}

      {loading && <CatalogSkeleton />}

      {!loading && data != null && (
        <>
          {q.trim() && data.suggested_terms && data.suggested_terms.some((t) => t !== q.trim()) && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-slate-700">
              <span className="font-medium text-emerald-800">Умный поиск:</span>{" "}
              По запросу «{q.trim()}» также ищем: {data.suggested_terms.filter((t) => t !== q.trim()).join(", ")}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <p className="text-slate-600 font-medium">
              Найдено: <span className="font-semibold text-slate-900">{data.total}</span>
            </p>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              Сортировка:
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-9 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
              >
                <option value="default">По умолчанию</option>
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="name_asc">Название: А–Я</option>
                <option value="name_desc">Название: Я–А</option>
              </select>
            </label>
          </div>

          <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedItems.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  compatibleWithGarage={!!machineId}
                  onAddToCart={handleAddToCart}
                  addedToCart={addedProductId === p.id}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </PageLayout>
  );
}
