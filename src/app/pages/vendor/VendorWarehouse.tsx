import { useState } from "react";
import { motion } from "motion/react";
import { ImprovedHeader } from "../../components/ImprovedHeader";
import { AIAssistant } from "../../components/AIAssistant";
import { Warehouse, AlertTriangle, XCircle } from "lucide-react";

const mockProducts = [
  { id: "1", name: "Азотное удобрение NPK 20-10-10, 50кг", sku: "NPK-20-10-10", quantity: 45, image: "https://images.unsplash.com/photo-1696371269544-e2601fd835f5?w=200" },
  { id: "2", name: "Гербицид широкого спектра, 10л", sku: "HERB-WS-10L", quantity: 3, image: "https://images.unsplash.com/photo-1696010619929-493071e82b0d?w=200" },
  { id: "3", name: "Семена пшеницы 'Московская 39', 1т", sku: "SEEDS-WHEAT-M39", quantity: 0, image: "https://images.unsplash.com/photo-1663025293688-322e16b6cb66?w=200" },
];

export default function VendorWarehouse() {
  const [isAIOpen, setIsAIOpen] = useState(false);

  const inStock = mockProducts.filter((p) => p.quantity > 5);
  const lowStock = mockProducts.filter((p) => p.quantity > 0 && p.quantity <= 5);
  const outOfStock = mockProducts.filter((p) => p.quantity === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <ImprovedHeader onAIAssistantOpen={() => setIsAIOpen(true)} cartItemsCount={0} notificationsCount={2} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Warehouse size={36} className="text-green-600" />
            Склад
          </h1>
          <p className="text-gray-600">Контроль остатков товаров</p>
        </motion.div>

        {/* Summary */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">В наличии</p>
                <p className="text-3xl font-bold text-green-600">{inStock.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Warehouse size={24} className="text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Низкий остаток</p>
                <p className="text-3xl font-bold text-yellow-600">{lowStock.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-yellow-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Нет в наличии</p>
                <p className="text-3xl font-bold text-red-600">{outOfStock.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h2 className="text-2xl font-bold mb-6">Товары на складе</h2>
          <div className="space-y-4">
            {mockProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-xl" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600">Артикул: {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold mb-1">{product.quantity} шт</p>
                  {product.quantity === 0 ? (
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                      Нет в наличии
                    </span>
                  ) : product.quantity <= 5 ? (
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                      Низкий остаток
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      В наличии
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
