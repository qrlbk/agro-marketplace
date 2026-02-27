import React from "react";
import { Link } from "react-router-dom";
import { productImageUrl, type Product } from "../api/client";
import { Package, Star, ShoppingCart } from "lucide-react";

export interface ProductCardProps {
  product: Product;
  compatibleWithGarage?: boolean;
  onAddToCart?: (productId: number) => void;
}

function StockBadge({ status }: { status: string }) {
  const inStock = status === "In_Stock";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        inStock
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          inStock ? "bg-green-500" : "bg-amber-500"
        }`}
      />
      {inStock ? "В наличии" : "Под заказ"}
    </span>
  );
}

export function ProductCard({ product, compatibleWithGarage, onAddToCart }: ProductCardProps) {
  const imageUrl = product.images?.[0] ? productImageUrl(product.images[0]) : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  return (
    <article className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-green-200 transition-all duration-300 flex flex-col overflow-hidden">
      <Link to={`/products/${product.id}`} className="flex flex-col flex-1 min-h-0 text-inherit">
        <div className="relative w-full aspect-[3/4] sm:aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package className="w-16 h-16 opacity-50" aria-hidden />
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 flex flex-col flex-1 min-h-0">
          <h2 className="font-semibold text-gray-900 text-xs sm:text-base leading-snug line-clamp-2">
            {product.name}
          </h2>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-sm font-mono text-gray-500 line-clamp-1">
            {product.article_number}
          </p>
          {product.average_rating != null && product.reviews_count != null && product.reviews_count > 0 && (
            <p className="hidden sm:inline-flex mt-1.5 text-sm text-gray-600 items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" aria-hidden />
              <span>{product.average_rating.toFixed(1)}</span>
              <span className="text-gray-500">({product.reviews_count})</span>
            </p>
          )}

          <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <StockBadge status={product.status} />
            {product.status === "In_Stock" && product.stock_quantity != null && (
              <span className="text-[10px] sm:text-xs text-gray-600 font-medium">
                Осталось: {product.stock_quantity} шт.
              </span>
            )}
            {compatibleWithGarage && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] sm:text-xs font-semibold">
                ✓ С вашей техникой
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-3 sm:p-4 pt-0 flex flex-col gap-2 sm:gap-3 border-t border-gray-100 mt-auto">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm sm:text-lg font-bold text-green-600">
            {Number(product.price).toLocaleString("ru-KZ")} ₸
          </p>
          <button
            type="button"
            onClick={handleAddToCart}
            className="inline-flex items-center justify-center min-h-8 sm:min-h-12 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 gap-1.5 sm:gap-2"
            aria-label={`Добавить ${product.name} в корзину`}
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
            <span className="hidden xs:inline sm:inline">В корзину</span>
          </button>
        </div>
      </div>
    </article>
  );
}
