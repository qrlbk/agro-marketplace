import React from "react";
import { Link } from "react-router-dom";
import { productImageUrl, type Product } from "../api/client";
import { Package } from "lucide-react";

export interface ProductCardProps {
  product: Product;
  compatibleWithGarage?: boolean;
  onAddToCart?: (productId: number) => void;
  addedToCart?: boolean;
}

function StockBadge({ status }: { status: string }) {
  const inStock = status === "In_Stock";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        inStock
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          inStock ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      {inStock ? "В наличии" : "Под заказ"}
    </span>
  );
}

export function ProductCard({ product, compatibleWithGarage, onAddToCart, addedToCart }: ProductCardProps) {
  const imageUrl = product.images?.[0] ? productImageUrl(product.images[0]) : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  return (
    <article className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col overflow-hidden">
      <Link to={`/products/${product.id}`} className="flex flex-col flex-1 min-h-0 text-inherit">
        {/* Блок изображения — фиксированная высота, всегда есть площадь */}
        <div className="relative w-full aspect-square bg-gray-100 flex-shrink-0 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package className="w-12 h-12" aria-hidden />
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1 min-h-0">
          {/* Название — главный акцент карточки */}
          <h2 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
            {product.name}
          </h2>
          <p className="mt-1 text-sm font-mono text-slate-500">{product.article_number}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StockBadge status={product.status} />
            {compatibleWithGarage && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                ✓ С вашей техникой
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Нижний блок: цена + CTA — чётко отделён */}
      <div className="p-5 pt-0 flex flex-col gap-4 border-t border-gray-100 mt-auto">
        <p className="text-2xl font-bold text-slate-900 tracking-tight">
          {Number(product.price).toLocaleString("ru-KZ")} ₸
        </p>
        {addedToCart ? (
          <div className="w-full min-h-[3.25rem] flex items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-semibold text-sm">
            Добавлено в корзину
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full min-h-[3.25rem] rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-900 font-bold text-base shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            aria-label={`Добавить ${product.name} в корзину`}
          >
            В корзину
          </button>
        )}
      </div>
    </article>
  );
}
