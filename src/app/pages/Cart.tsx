import { useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { AIAssistant } from "../components/AIAssistant";
import { ShoppingCart, Trash2, ChevronRight, Package } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export default function Cart() {
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [items, setItems] = useState<CartItem[]>([
    {
      id: "1",
      name: "Азотное удобрение NPK 20-10-10, 50кг",
      price: 2500,
      quantity: 2,
      image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=200",
    },
    {
      id: "2",
      name: "Семена пшеницы 'Московская 39', 1т",
      price: 45000,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1663025293688-322e16b6cb66?w=200",
    },
  ]);

  const navigate = useNavigate();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleCheckout = () => {
    if (!address.trim()) {
      alert("Укажите адрес доставки");
      return;
    }
    // Mock checkout
    navigate("/orders");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={0} />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Package size={80} className="text-gray-300 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Корзина пуста</h1>
            <p className="text-gray-600 mb-8">Добавьте товары из каталога</p>
            <Link to="/catalog">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                Перейти в каталог
              </motion.button>
            </Link>
          </motion.div>
        </div>
        <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader
        onAIAssistantOpen={() => setIsAIOpen(true)}
        cartItemsCount={items.length}
      />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/catalog" className="hover:text-green-600">
            Каталог
          </Link>
          <ChevronRight size={16} />
          <span className="text-gray-900">Корзина</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <ShoppingCart size={36} className="text-green-600" />
            Корзина
          </h1>
          <p className="text-gray-600">{items.length} товар(ов)</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md flex items-center gap-4"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-xl"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                  <p className="text-green-600 font-bold text-xl">
                    {item.price.toLocaleString()} ₸
                  </p>
                  <p className="text-sm text-gray-600">
                    Количество: {item.quantity} шт
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                >
                  <Trash2 size={20} />
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* Checkout Summary */}
          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-md sticky top-24"
            >
              <h2 className="text-2xl font-bold mb-6">Оформление заказа</h2>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">
                  Адрес доставки
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                  rows={3}
                  placeholder="Введите адрес доставки..."
                  required
                />
              </div>

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Товары:</span>
                  <span className="font-semibold">{total.toLocaleString()} ₸</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Доставка:</span>
                  <span className="font-semibold text-green-600">Бесплатно</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-4 border-t border-gray-200">
                  <span>Итого:</span>
                  <span className="text-green-600">{total.toLocaleString()} ₸</span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                className="w-full px-6 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                Оформить заказ
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
