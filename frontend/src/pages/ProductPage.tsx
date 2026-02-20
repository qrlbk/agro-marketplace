import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { request, productImageUrl, Product, checkCompatibility, type CompatibilityVerification, type GarageItem } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useCartContext } from "../contexts/CartContext";
import { PageLayout } from "../components/PageLayout";
import { Button } from "../components/ui";
import { Wrench, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const PARTS_CATEGORY_SLUGS = ["zapchasti-tehnika", "filtry-i-to", "zapchasti-dvigatelya", "masla-i-smazki"];

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [garage, setGarage] = useState<GarageItem[]>([]);
  const [compatMachineId, setCompatMachineId] = useState<string>("");
  const [compatResult, setCompatResult] = useState<CompatibilityVerification | null>(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const { user, token } = useAuth();
  const { invalidateCart } = useCartContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    request<Product>(`/products/${id}`)
      .then((p) => {
        setProduct(p);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!token) {
      setGarage([]);
      return;
    }
    request<GarageItem[]>("/garage/machines", { token })
      .then(setGarage)
      .catch(() => setGarage([]));
  }, [token]);

  const addToCart = async () => {
    if (!user || !token) {
      navigate("/login");
      return;
    }
    setAdding(true);
    setAddedToCart(false);
    try {
      await request("/cart/items", {
        method: "POST",
        body: JSON.stringify({ product_id: Number(id), quantity: 1 }),
        token,
      });
      invalidateCart();
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } finally {
      setAdding(false);
    }
  };

  const runCompatCheck = async () => {
    if (!product || !compatMachineId) return;
    setCompatLoading(true);
    setCompatResult(null);
    try {
      const result = await checkCompatibility({
        product_id: product.id,
        machine_id: Number(compatMachineId),
      });
      setCompatResult(result);
    } catch {
      setCompatResult({
        compatible: false,
        confidence: 0,
        reason: "Сервис проверки временно недоступен.",
      });
    } finally {
      setCompatLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4 max-w-md" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-24 bg-gray-200 rounded w-full max-w-lg" />
        </div>
      </PageLayout>
    );
  }

  if (!product) {
    return (
      <PageLayout>
        <p className="text-slate-600">Товар не найден.</p>
        <Link to="/catalog" className="text-emerald-800 font-semibold hover:underline">
          Вернуться в каталог
        </Link>
      </PageLayout>
    );
  }

  const imageUrl = product.images?.[0] ? productImageUrl(product.images[0]) : null;

  return (
    <PageLayout>
      <nav className="text-sm text-slate-600 mb-4" aria-label="Хлебные крошки">
        <Link to="/catalog" className="hover:text-emerald-800">Каталог</Link>
        <span className="mx-2">→</span>
        <span className="text-slate-900 font-medium">{product.name}</span>
      </nav>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden max-w-2xl">
        <div className="p-6 sm:flex gap-6">
          {imageUrl && (
            <div className="w-full sm:w-48 h-48 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
              <img
                src={imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 mt-4 sm:mt-0">
            <p className="text-lg font-mono font-bold text-slate-700">Артикул: {product.article_number}</p>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{product.name}</h1>
            <p className="mt-2 text-slate-900 font-semibold">
              {Number(product.price).toLocaleString("ru-KZ")} ₸
              <span className="text-slate-600 font-normal ml-2">
                · {product.stock_quantity > 0 ? "В наличии" : "Под заказ"}
              </span>
            </p>
            {product.description && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-slate-800">Описание</h4>
                <p className="mt-1 text-slate-700 text-sm">{product.description}</p>
              </div>
            )}
            {product.characteristics && Object.keys(product.characteristics).length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-800">Характеристики</h4>
                <dl className="mt-1 text-sm text-slate-700 space-y-1">
                  {Object.entries(product.characteristics).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <dt className="font-medium text-slate-600 min-w-[8rem]">{key}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {product.composition && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-800">Состав</h4>
                <p className="mt-1 text-slate-700 text-sm whitespace-pre-wrap">{product.composition}</p>
              </div>
            )}
            <div className="mt-4">
              {user ? (
                addedToCart ? (
                  <p className="inline-flex items-center min-h-12 px-4 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                    Добавлено в корзину
                  </p>
                ) : (
                  <Button onClick={addToCart} loading={adding}>
                    В корзину
                  </Button>
                )
              ) : (
                <p className="text-slate-700">
                  <Link to="/login" className="text-emerald-800 font-semibold hover:underline">
                    Войдите
                  </Link>
                  , чтобы добавить в корзину.
                </p>
              )}
            </div>

            {user && garage.length > 0 && product.category_slug && PARTS_CATEGORY_SLUGS.includes(product.category_slug) && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Wrench className="w-4 h-4" aria-hidden />
                  Проверить совместимость с моей техникой
                </h3>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-xs font-medium text-slate-600">Техника из гаража</span>
                    <select
                      value={compatMachineId}
                      onChange={(e) => {
                        setCompatMachineId(e.target.value);
                        setCompatResult(null);
                      }}
                      className="min-h-10 pl-3 pr-8 rounded-lg border border-gray-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
                    >
                      <option value="">Выберите технику</option>
                      {Array.from(
                        new Map(garage.map((g) => [g.machine_id, g])).values()
                      ).map((g) => (
                        <option key={g.machine_id} value={g.machine_id}>
                          {[g.brand, g.model, g.year].filter(Boolean).join(" ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    onClick={runCompatCheck}
                    loading={compatLoading}
                    disabled={!compatMachineId}
                  >
                    Проверить
                  </Button>
                </div>
                {compatResult && (
                  <div
                    className={`mt-3 p-3 rounded-lg border text-sm ${
                      compatResult.compatible
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    }`}
                    role="status"
                  >
                    <div className="flex items-start gap-2">
                      {compatResult.compatible ? (
                        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
                      ) : compatResult.confidence === 0 && compatResult.reason.includes("недоступен") ? (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
                      ) : (
                        <XCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
                      )}
                      <div>
                        <p className="font-medium">
                          {compatResult.compatible
                            ? "Подходит для выбранной техники"
                            : compatResult.reason.includes("недоступен")
                              ? "Ошибка проверки"
                              : "Не рекомендуется или неясно"}
                        </p>
                        <p className="mt-1 text-slate-700">{compatResult.reason}</p>
                        {compatResult.confidence > 0 && (
                          <p className="mt-1 text-slate-600">
                            Уверенность: {Math.round(compatResult.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
