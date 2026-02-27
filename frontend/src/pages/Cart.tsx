import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { useCartContext } from "../contexts/CartContext";
import { request, type CartItem } from "../api/client";
import { ShoppingCart, Trash2, ChevronRight, Package } from "lucide-react";

export function Cart() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const { invalidateCart } = useCartContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    request<CartItem[]>("/cart", { token })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  const remove = async (productId: number) => {
    if (!token) return;
    if (!window.confirm("Удалить товар из корзины?")) return;
    try {
      await request(`/cart/items/${productId}`, { method: "DELETE", token });
      setItems((prev) => prev.filter((i) => i.product_id !== productId));
      invalidateCart();
    } catch {
      /* keep list */
    }
  };

  const checkout = async () => {
    if (!token || items.length === 0) return;
    if (user?.role === "guest") {
      navigate("/onboarding", { replace: true });
      return;
    }
    if (!address.trim()) {
      setCheckoutError("Укажите адрес доставки");
      return;
    }
    setCheckoutError(null);
    setCheckingOut(true);
    try {
      await request("/checkout", {
        method: "POST",
        body: JSON.stringify({ delivery_address: address || null, comment: null }),
        token,
      });
      setItems([]);
      invalidateCart();
      navigate("/orders");
    } catch (e) {
      setCheckoutError((e as Error).message);
    } finally {
      setCheckingOut(false);
    }
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="page-container py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-white rounded-2xl shadow-md" />
            <div className="h-24 bg-white rounded-2xl shadow-md" />
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="page-container py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Package size={80} className="text-gray-300 mx-auto mb-6" aria-hidden />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Корзина пуста</h1>
            <p className="text-gray-600 mb-8">Добавьте товары из каталога</p>
            <Link to="/catalog">
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block px-8 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                Перейти в каталог
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="page-container py-6 sm:py-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/catalog" className="hover:text-green-600 transition-colors">
            Каталог
          </Link>
          <ChevronRight size={16} aria-hidden />
          <span className="text-gray-900 font-medium">Корзина</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ShoppingCart size={30} className="text-green-600" aria-hidden />
            Корзина
          </h1>
          <p className="text-gray-600">{items.length} товар(ов)</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-4 sm:p-6 shadow-md flex items-center gap-3 sm:gap-4"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" aria-hidden />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-lg text-gray-900 mb-1 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-green-600 font-bold text-lg sm:text-xl">
                    {item.price.toLocaleString("ru-KZ")} ₸
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Количество: {item.quantity} шт · {(item.price * item.quantity).toLocaleString("ru-KZ")} ₸
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => remove(item.product_id)}
                  className="p-2 sm:p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors shrink-0"
                  aria-label={`Удалить ${item.name} из корзины`}
                >
                  <Trash2 size={18} className="sm:w-5 sm:h-5" aria-hidden />
                </motion.button>
              </motion.div>
            ))}
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-md sticky top-24"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Оформление заказа</h2>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Адрес доставки
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  rows={3}
                  placeholder="Введите адрес доставки..."
                />
              </div>

              {checkoutError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium" role="alert">
                  {checkoutError}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Товары:</span>
                  <span className="font-semibold">{total.toLocaleString("ru-KZ")} ₸</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Доставка:</span>
                  <span className="font-semibold text-green-600">Бесплатно</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-4 border-t border-gray-200">
                  <span>Итого:</span>
                  <span className="text-green-600">{total.toLocaleString("ru-KZ")} ₸</span>
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={checkout}
                disabled={checkingOut}
                className="w-full px-6 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingOut ? "Оформление..." : "Оформить заказ"}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
