import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ImprovedHeader } from "../components/ImprovedHeader";
import { AIAssistant } from "../components/AIAssistant";
import { Package, ChevronRight } from "lucide-react";

interface Order {
  id: string;
  date: string;
  status: "New" | "Paid" | "Shipped" | "Delivered";
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}

const mockOrders: Order[] = [
  {
    id: "ORD-2024-001",
    date: "2024-02-20",
    status: "Delivered",
    total: 50000,
    items: [
      { name: "Азотное удобрение NPK 20-10-10, 50кг", quantity: 2, price: 2500 },
      { name: "Семена пшеницы 'Московская 39', 1т", quantity: 1, price: 45000 },
    ],
  },
  {
    id: "ORD-2024-002",
    date: "2024-02-18",
    status: "Shipped",
    total: 8900,
    items: [{ name: "Гербицид широкого спектра, 10л", quantity: 1, price: 8900 }],
  },
];

const statusColors: Record<Order["status"], string> = {
  New: "bg-blue-100 text-blue-700",
  Paid: "bg-yellow-100 text-yellow-700",
  Shipped: "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
};

const statusNames: Record<Order["status"], string> = {
  New: "Новый",
  Paid: "Оплачен",
  Shipped: "Отправлен",
  Delivered: "Доставлен",
};

export default function Orders() {
  const [isAIOpen, setIsAIOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={3} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Package size={36} className="text-green-600" />
            Мои заказы
          </h1>
          <p className="text-gray-600">История ваших заказов</p>
        </motion.div>

        {mockOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <Package size={64} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">У вас пока нет заказов</p>
            <Link to="/catalog">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
              >
                В каталог
              </motion.button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {mockOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-md"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Заказ #{order.id}</h2>
                    <p className="text-sm text-gray-600">{order.date}</p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full font-semibold ${
                      statusColors[order.status]
                    }`}
                  >
                    {statusNames[order.status]}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        {item.name} × {item.quantity}
                      </span>
                      <span className="font-semibold">
                        {(item.price * item.quantity).toLocaleString()} ₸
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-lg font-bold">Итого:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {order.total.toLocaleString()} ₸
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
