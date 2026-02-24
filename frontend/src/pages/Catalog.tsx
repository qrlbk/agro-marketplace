import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { request, getCategoryTree, getRecommendations, ProductList, Machine, type Product, type CategoryTree, type RecommendationOut } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useCartContext } from "../contexts/CartContext";
import { ProductCard } from "../components/ProductCard";
import { GarageWidget } from "../components/GarageWidget";
import { motion } from "framer-motion";
import { AlertCircle, X, SlidersHorizontal } from "lucide-react";
import { toast } from "react-hot-toast";

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
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <li key={i} className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden flex flex-col">
          <div className="aspect-square bg-gray-100 animate-pulse" />
          <div className="p-4 space-y-3 flex-1 flex flex-col">
            <div className="h-5 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
            <div className="mt-auto pt-3 border-t border-gray-100 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
              <div className="h-12 bg-gray-100 rounded-xl w-full animate-pulse" />
            </div>
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
  const machineIdParam = searchParams.get("machine_id") ?? "";
  const [categoryId, setCategoryId] = useState(categoryIdParam);
  const [machineId, setMachineId] = useState<string>(machineIdParam);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [data, setData] = useState<ProductList | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryTree[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    setMachineId(machineIdParam);
  }, [machineIdParam]);

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
        toast.success("Товар добавлен в корзину");
      } catch {
        toast.error("Не удалось добавить товар в корзину");
      }
    },
    [token, navigate, invalidateCart]
  );

  const categoryName = categoryId && categoryTree.length
    ? (() => {
        for (const r of categoryTree) {
          if (String(r.id) === categoryId) return r.name;
          const child = r.children.find((c) => String(c.id) === categoryId);
          if (child) return child.name;
        }
        return "Каталог";
      })()
    : "Каталог";
  const totalCount = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Дизайн: градиентный заголовок страницы */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{categoryName}</h1>
            <p className="text-lg sm:text-xl opacity-90">
              {loading ? "Загрузка..." : data != null ? `Найдено ${totalCount} товаров` : "Запчасти и техника, семена, удобрения, СЗР"}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Блок «Разделы» — быстрые ссылки */}
      {categoryTree.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {categoryTree.map((root) => (
            <Link
              key={root.id}
              to={`/catalog?category=${root.id}`}
              className={`block p-4 rounded-2xl border-2 text-center font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 ${
                categoryId === String(root.id)
                  ? "border-green-500 bg-green-50 text-green-900"
                  : "border-gray-200 bg-white text-gray-800 hover:border-green-500 hover:bg-green-50/50"
              }`}
            >
              {root.name}
            </Link>
          ))}
        </div>
      )}

      {/* Фильтр по категории */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label htmlFor="catalog-category" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          Раздел:
        </label>
        <select
          id="catalog-category"
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="min-h-10 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none cursor-pointer"
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
            Категория выбрана
            <button
              type="button"
              onClick={() => handleCategoryChange("")}
              className="p-0.5 rounded hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
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
            <label htmlFor="catalog-machine" className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" aria-hidden />
              Техника:
            </label>
            <select
              id="catalog-machine"
              value={machineId}
              onChange={(e) => {
                const value = e.target.value;
                setMachineId(value);
                setSearchParams((prev) => {
                  const p = new URLSearchParams(prev);
                  if (value) p.set("machine_id", value);
                  else p.delete("machine_id");
                  return p;
                });
              }}
              className="min-h-10 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none cursor-pointer"
            >
              <option value="">Вся техника</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.model}
                </option>
              ))}
            </select>
            {selectedMachine && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-semibold">
                Фильтр: {selectedMachine.brand} {selectedMachine.model}
                <button
                  type="button"
                  onClick={() => {
                    setMachineId("");
                    setSearchParams((prev) => {
                      const p = new URLSearchParams(prev);
                      p.delete("machine_id");
                      return p;
                    });
                  }}
                  className="p-0.5 rounded hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
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
                onClearFilter={() => {
                  setMachineId("");
                  setSearchParams((prev) => {
                    const p = new URLSearchParams(prev);
                    p.delete("machine_id");
                    return p;
                  });
                }}
                onAddMachine={() => navigate("/garage")}
              />
            </div>
          )}
        </>
      )}

      {token && recommendations.length > 0 && (
        <section className="mb-6 p-4 rounded-2xl bg-purple-50 border border-purple-200" aria-labelledby="recommendations-heading">
          <h2 id="recommendations-heading" className="text-base font-semibold text-purple-800 mb-3 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">AI</span>
            Рекомендуем для вашей техники
          </h2>
          <ul className="list-none p-0 m-0 flex flex-wrap gap-4">
            {recommendations.map((rec) => (
              <li key={rec.product_id} className="min-w-0 flex-1 basis-48 max-w-xs">
                <Link
                  to={`/products/${rec.product_id}`}
                  className="block p-3 rounded-xl bg-white border border-purple-200 hover:border-purple-400 hover:shadow-md transition-all"
                >
                  <p className="font-medium text-gray-900 truncate">{rec.name}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{rec.article_number}</p>
                  <p className="mt-1 text-green-600 font-semibold">
                    {Number(rec.price).toLocaleString("ru-KZ")} ₸
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{rec.message}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-700 font-medium">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
              {error}
            </div>
            <button
              type="button"
              onClick={fetchProducts}
              className="min-h-10 px-4 rounded-xl border-2 border-red-500 text-red-600 font-semibold hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
            >
              Повторить
            </button>
          </div>
          <p className="text-sm text-red-600/90">
            Если вы только запустили проект: запустите Docker Desktop, затем в корне проекта выполните{" "}
            <code className="bg-red-100 px-1.5 py-0.5 rounded">docker compose -f docker/docker-compose.yml up -d</code>
            {" "}и{" "}
            <code className="bg-red-100 px-1.5 py-0.5 rounded">npm run db:init</code>.
          </p>
        </div>
      )}

      {loading && <CatalogSkeleton />}

      {!loading && data != null && (
        <>
          {q.trim() && data.suggested_terms && data.suggested_terms.some((t) => t !== q.trim()) && (
            <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-gray-700">
              <span className="font-medium text-green-800">Умный поиск:</span>{" "}
              По запросу «{q.trim()}» также ищем: {data.suggested_terms.filter((t) => t !== q.trim()).join(", ")}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <p className="text-gray-600 font-medium">
              Показано <span className="font-semibold text-gray-900">{data.total}</span> товаров
            </p>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              Сортировка:
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-9 pl-3 pr-8 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none cursor-pointer"
              >
                <option value="default">По умолчанию</option>
                <option value="price_asc">Цена: по возрастанию</option>
                <option value="price_desc">Цена: по убыванию</option>
                <option value="name_asc">Название: А–Я</option>
                <option value="name_desc">Название: Я–А</option>
              </select>
            </label>
          </div>

          <ul className="list-none p-0 m-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
            {sortedItems.map((p) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  compatibleWithGarage={!!machineId}
                  onAddToCart={handleAddToCart}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      </div>
    </div>
  );
}
