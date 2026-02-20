import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCartContext } from "../contexts/CartContext";
import { request, type CartItem } from "../api/client";
import { PageLayout } from "../components/PageLayout";
import { Input, Button } from "../components/ui";
import { ShoppingCart, Trash2 } from "lucide-react";

export function Cart() {
  const { token } = useAuth();
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
      // keep list as is; user can retry
    }
  };

  const checkout = async () => {
    if (!token || items.length === 0) return;
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
      <PageLayout>
        <h1>Корзина</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-md" />
          <div className="h-20 bg-gray-200 rounded-md" />
        </div>
      </PageLayout>
    );
  }

  if (items.length === 0) {
    return (
      <PageLayout>
        <h1>Корзина</h1>
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-12 text-center">
          <ShoppingCart className="h-16 w-16 text-slate-300 mx-auto mb-4" aria-hidden />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Корзина пуста</h2>
          <p className="text-slate-600 mb-6">Добавьте товары из каталога, чтобы оформить заказ.</p>
          <Link
            to="/catalog"
            className="inline-flex items-center justify-center min-h-12 px-6 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            Перейти в каталог
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <nav className="text-sm text-slate-600 mb-4" aria-label="Хлебные крошки">
        <Link to="/catalog" className="hover:text-emerald-800">Каталог</Link>
        <span className="mx-2">→</span>
        <span className="text-slate-900 font-medium">Корзина</span>
      </nav>
      <h1>Корзина</h1>
      <ul className="list-none p-0 m-0 space-y-3">
        {items.map((i) => (
          <li
            key={i.product_id}
            className="bg-white border border-gray-200 rounded-md shadow-sm p-4 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <span className="font-semibold text-slate-900">{i.name}</span>
              <span className="text-slate-600 ml-2">· {i.article_number} × {i.quantity} = {(i.price * i.quantity).toLocaleString("ru-KZ")} ₸</span>
            </div>
            <Button
              variant="danger"
              className="shrink-0"
              onClick={() => remove(i.product_id)}
              aria-label={`Удалить ${i.name} из корзины`}
            >
              <Trash2 className="h-5 w-5" />
              Удалить
            </Button>
          </li>
        ))}
      </ul>
      <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6 mt-6 max-w-xl">
        <p className="text-lg font-bold text-slate-900 mb-4">Итого: {total.toLocaleString("ru-KZ")} ₸</p>
        {checkoutError && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">
            {checkoutError}
          </div>
        )}
        <Input
          label="Адрес доставки"
          placeholder="Укажите адрес доставки"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mb-4"
        />
        <Button onClick={checkout} loading={checkingOut}>
          Оформить заказ
        </Button>
      </div>
    </PageLayout>
  );
}
