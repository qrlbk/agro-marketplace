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
    <article className="group bg-white rounded-2xl border border-gray-200 shadow-md hover:shadow-xl hover:-translate-y-1 hover:border-green-200 transition-all duration-300 flex flex-col overflow-hidden">
      <Link to={`/products/${product.id}`} className="flex flex-col flex-1 min-h-0 text-inherit">
        <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex-shrink-0 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Package className="w-16 h-16 opacity-50" aria-hidden />
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1 min-h-0">
          <h2 className="font-semibold text-gray-900 text-base leading-snug line-clamp-2">
            {product.name}
          </h2>
          <p className="mt-1 text-sm font-mono text-gray-500">{product.article_number}</p>
          {product.average_rating != null && product.reviews_count != null && product.reviews_count > 0 && (
            <p className="mt-1.5 text-sm text-gray-600 inline-flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" aria-hidden />
              <span>{product.average_rating.toFixed(1)}</span>
              <span className="text-gray-500">({product.reviews_count})</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StockBadge status={product.status} />
            {product.status === "In_Stock" && product.stock_quantity != null && (
              <span className="text-xs text-gray-600 font-medium">
                Осталось: {product.stock_quantity} шт.
              </span>
            )}
            {compatibleWithGarage && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                ✓ С вашей техникой
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="p-4 pt-0 flex flex-col gap-3 border-t border-gray-100 mt-auto">
        <p className="text-lg font-bold text-green-600">
          {Number(product.price).toLocaleString("ru-KZ")} ₸
        </p>
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full min-h-12 rounded-xl bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white font-semibold shadow-sm hover:shadow transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 flex items-center justify-center gap-2"
          aria-label={`Добавить ${product.name} в корзину`}
        >
          <ShoppingCart className="w-5 h-5" aria-hidden />
          В корзину
        </button>
      </div>
    </article>
  );
}
