import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  request,
  productImageUrl,
  Product,
  checkCompatibility,
  getProductReviews,
  postProductReview,
  getVendorRating,
  type CompatibilityVerification,
  type GarageItem,
  type ProductReviewsResponse,
  type VendorRating,
} from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useCartContext } from "../contexts/CartContext";
import { PageLayout } from "../components/PageLayout";
import { Button } from "../components/ui";
import { Wrench, CheckCircle, XCircle, AlertCircle, Star, ShoppingCart } from "lucide-react";
import { toast } from "react-hot-toast";

const REVIEWS_PAGE_SIZE = 5;

function StarsDisplay({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`Рейтинг ${value} из 5`}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f-${i}`} className="h-5 w-5 fill-current" aria-hidden />
      ))}
      {half ? <Star className="h-5 w-5 fill-amber-200" aria-hidden /> : null}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e-${i}`} className="h-5 w-5 text-gray-200" aria-hidden />
      ))}
    </span>
  );
}

const PARTS_CATEGORY_SLUGS = ["zapchasti-tehnika", "filtry-i-to", "zapchasti-dvigatelya", "masla-i-smazki"];

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [garage, setGarage] = useState<GarageItem[]>([]);
  const [compatMachineId, setCompatMachineId] = useState<string>("");
  const [compatResult, setCompatResult] = useState<CompatibilityVerification | null>(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const [vendorRating, setVendorRating] = useState<VendorRating | null>(null);
  const [reviews, setReviews] = useState<ProductReviewsResponse | null>(null);
  const [reviewsOffset, setReviewsOffset] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
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
    if (!product?.vendor_id) {
      setVendorRating(null);
      return;
    }
    getVendorRating(product.vendor_id)
      .then(setVendorRating)
      .catch(() => setVendorRating(null));
  }, [product?.vendor_id]);

  const loadReviews = useCallback(
    (offset: number, append: boolean) => {
      if (!id) return;
      setReviewsLoading(true);
      getProductReviews(Number(id), { limit: REVIEWS_PAGE_SIZE, offset })
        .then((res) => {
          setReviews((prev) => {
            if (!append || !prev) return res;
            return {
              ...res,
              items: [...prev.items, ...res.items],
            };
          });
          setReviewsOffset(offset + res.items.length);
        })
        .catch(() => setReviews(null))
        .finally(() => setReviewsLoading(false));
    },
    [id]
  );

  useEffect(() => {
    if (!id) return;
    loadReviews(0, false);
  }, [id, loadReviews]);

  const loadMoreReviews = () => {
    loadReviews(reviewsOffset, true);
  };

  const submitReview = async () => {
    if (!id || !token) return;
    setReviewSubmitting(true);
    try {
      const res = await postProductReview(Number(id), { rating: reviewRating, text: reviewText || undefined }, token);
      setReviews(res);
      setReviewsOffset(res.items.length);
      if (product) {
        setProduct({ ...product, average_rating: res.average_rating ?? undefined, reviews_count: res.total_count });
      }
      toast.success("Спасибо за отзыв!");
      setReviewText("");
    } catch {
      toast.error("Не удалось отправить отзыв");
    } finally {
      setReviewSubmitting(false);
    }
  };

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
    try {
      await request("/cart/items", {
        method: "POST",
        body: JSON.stringify({ product_id: Number(id), quantity: 1 }),
        token,
      });
      invalidateCart();
      toast.success("Товар добавлен в корзину");
    } catch {
      toast.error("Не удалось добавить в корзину");
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
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden max-w-5xl animate-fade-in">
        <div className="p-6 lg:p-8 flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-10">
          <div className="w-full">
            {imageUrl ? (
              <div className="w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden group border border-gray-100">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="w-full aspect-square bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                <span className="text-gray-300">Нет фото</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <p className="text-lg font-mono font-bold text-slate-700">Артикул: {product.article_number}</p>
            <h1 className="text-3xl font-extrabold text-slate-900 mt-2">{product.name}</h1>
            <p className="mt-4 text-slate-900">
              <span className="text-3xl font-extrabold tracking-tight text-emerald-900">{Number(product.price).toLocaleString("ru-KZ")} ₸</span>
              <span className="text-slate-600 font-normal ml-2">
                · {product.status === "In_Stock" ? "В наличии" : "Под заказ"}
                {product.status === "In_Stock" && product.stock_quantity != null && (
                  <span className="ml-1">· Осталось: {product.stock_quantity} шт.</span>
                )}
              </span>
            </p>
            {(product.average_rating != null && product.reviews_count != null) || vendorRating ? (
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                {product.average_rating != null && product.reviews_count != null && product.reviews_count > 0 && (
                  <a href="#reviews" className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900">
                    <StarsDisplay value={product.average_rating} />
                    <span>{product.average_rating.toFixed(1)}</span>
                    <span className="text-slate-500">({product.reviews_count} отзывов)</span>
                  </a>
                )}
                {vendorRating && vendorRating.total_reviews > 0 && (
                  <span className="text-slate-600">
                    Рейтинг магазина: {vendorRating.average_rating.toFixed(1)} из 5 ({vendorRating.total_reviews} отзывов)
                  </span>
                )}
              </div>
            ) : null}
            {product.description && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-slate-800">Описание</h4>
                <p className="mt-1 text-slate-700 text-sm">{product.description}</p>
              </div>
            )}
            {product.characteristics && Object.keys(product.characteristics).length > 0 && (
              <div className="mt-8">
                <h4 className="text-base font-bold text-slate-900 mb-3">Характеристики</h4>
                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                  <dl className="text-sm text-slate-700">
                    {Object.entries(product.characteristics).map(([key, value], i) => (
                      <div key={key} className={`flex gap-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white' : ''}`}>
                        <dt className="font-semibold text-slate-900 w-1/3 min-w-[8rem]">{key}</dt>
                        <dd className="w-2/3">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            )}
            {product.composition && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-800">Состав</h4>
                <p className="mt-1 text-slate-700 text-sm whitespace-pre-wrap">{product.composition}</p>
              </div>
            )}
            <div className="mt-6">
              {user ? (
                <Button onClick={addToCart} loading={adding} className="w-full sm:w-1/2 min-h-[3.25rem] text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-95">
                  <ShoppingCart className="w-5 h-5 mr-2" aria-hidden />
                  В корзину
                </Button>
              ) : (
                <p className="text-slate-700 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <Link to="/login" className="text-emerald-800 font-semibold hover:underline">
                    Войдите
                  </Link>
                  , чтобы добавить в корзину.
                </p>
              )}
            </div>

            {user && garage.length > 0 && product.category_slug && PARTS_CATEGORY_SLUGS.includes(product.category_slug) && (
              <div className="mt-8 p-5 bg-emerald-50 border border-emerald-100 rounded-2xl animate-fade-in">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-600" aria-hidden />
                  Проверить совместимость с моей техникой
                </h3>
                <div className="mt-4 flex flex-col sm:flex-row items-end gap-3">
                  <label className="flex flex-col gap-1.5 w-full sm:flex-1">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Техника из гаража</span>
                    <select
                      value={compatMachineId}
                      onChange={(e) => {
                        setCompatMachineId(e.target.value);
                        setCompatResult(null);
                      }}
                      className="w-full min-h-[3rem] px-4 rounded-xl border border-emerald-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">Выберите технику...</option>
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
                    className="w-full sm:w-auto min-h-[3rem] px-6 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900"
                  >
                    Проверить
                  </Button>
                </div>
                {compatResult && (
                  <div
                    className={`mt-4 p-4 rounded-xl border flex items-start gap-3 transition-all duration-300 animate-slide-up ${
                      compatResult.compatible
                        ? "bg-white border-emerald-300 text-emerald-800 shadow-sm"
                        : "bg-white border-amber-300 text-amber-800 shadow-sm"
                    }`}
                    role="status"
                  >
                    {compatResult.compatible ? (
                      <CheckCircle className="w-6 h-6 shrink-0 text-emerald-500" aria-hidden />
                    ) : compatResult.confidence === 0 && compatResult.reason.includes("недоступен") ? (
                      <AlertCircle className="w-6 h-6 shrink-0 text-slate-400" aria-hidden />
                    ) : (
                      <XCircle className="w-6 h-6 shrink-0 text-amber-500" aria-hidden />
                    )}
                    <div>
                      <p className="font-bold text-base">
                        {compatResult.compatible
                          ? "Идеально подходит!"
                          : compatResult.reason.includes("недоступен")
                            ? "Ошибка проверки"
                            : "Возможна несовместимость"}
                      </p>
                      <p className="mt-1 text-slate-700 text-sm">{compatResult.reason}</p>
                      {compatResult.confidence > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${compatResult.compatible ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                              style={{ width: `${Math.round(compatResult.confidence * 100)}%` }} 
                            />
                          </div>
                          <p className="text-xs font-semibold text-slate-500">
                            Уверенность: {Math.round(compatResult.confidence * 100)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <section id="reviews" className="mt-12 max-w-5xl animate-fade-in">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Отзывы</h2>
          
          <div className="lg:grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-1 mb-8 lg:mb-0">
              {reviewsLoading && !reviews && <p className="text-slate-500 text-sm animate-pulse">Загрузка отзывов…</p>}
              {!reviewsLoading && !reviews && id && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">Не удалось загрузить отзывы.</p>}
              {reviews && (
                <>
                  <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100 mb-6">
                    {reviews.total_count > 0 ? (
                      <>
                        {reviews.average_rating != null && (
                          <div className="text-4xl font-extrabold text-slate-900 mb-2">
                            {reviews.average_rating.toFixed(1)}
                          </div>
                        )}
                        <div className="flex justify-center mb-2 scale-110">
                          <StarsDisplay value={reviews.average_rating || 0} />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">
                          На основе {reviews.total_count} {reviews.total_count === 1 ? "отзыва" : reviews.total_count < 5 ? "отзывов" : "отзывов"}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 text-sm">Пока нет оценок.</p>
                    )}
                  </div>

                  {user && (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
                      <h3 className="text-base font-bold text-emerald-900 mb-4">Написать отзыв</h3>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setReviewRating(r)}
                            className="p-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 transition-transform hover:scale-110"
                            aria-label={`Оценка ${r}`}
                          >
                            <Star
                              className={`h-8 w-8 transition-colors ${reviewRating >= r ? "text-amber-500 fill-amber-500" : "text-gray-300 hover:text-gray-400"}`}
                              aria-hidden
                            />
                          </button>
                        ))}
                      </div>
                      <div className="mb-4">
                        <textarea
                          id="review-text"
                          placeholder="Ваши впечатления о товаре"
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 resize-none shadow-sm"
                        />
                      </div>
                      <Button onClick={submitReview} loading={reviewSubmitting} className="w-full font-bold">
                        Отправить отзыв
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="lg:col-span-2">
              {reviews && (
                <>
                  <ul className="list-none p-0 m-0 space-y-6">
                    {reviews.items.map((rev) => (
                      <li
                        key={rev.id}
                        className="bg-white border-b border-gray-100 pb-6 last:border-0 last:pb-0"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                              {rev.author_display.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="block text-sm font-bold text-slate-900">{rev.author_display}</span>
                              <span className="block text-xs text-slate-500 mt-0.5">
                                {new Date(rev.created_at).toLocaleDateString("ru-KZ", { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          <StarsDisplay value={rev.rating} />
                        </div>
                        {rev.text && <p className="text-slate-700 text-base leading-relaxed pl-13 mt-2">{rev.text}</p>}
                      </li>
                    ))}
                  </ul>
                  {reviews.items.length < reviews.total_count && (
                    <div className="mt-8 text-center">
                      <Button variant="secondary" onClick={loadMoreReviews} loading={reviewsLoading} className="px-8 font-semibold rounded-full">
                        Показать ещё отзывы
                      </Button>
                    </div>
                  )}
                  {reviews.total_count === 0 && !user && (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-slate-600 font-medium">Об этом товаре еще нет отзывов.</p>
                      <p className="text-sm text-slate-500 mt-1">Войдите, чтобы стать первым.</p>
                      <Link to="/login" className="inline-block mt-4 text-emerald-800 font-bold hover:underline">
                        Войти в аккаунт
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
