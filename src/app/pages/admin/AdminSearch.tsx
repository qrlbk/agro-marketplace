import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";
import { Search } from "lucide-react";

export default function AdminSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  // Mock search results
  const results = {
    users: [{ id: "1", phone: "+77001234567", name: "Иван Петров" }],
    orders: [{ id: "ORD-001", customer: "+77001234567", amount: 50000 }],
    products: [{ id: "1", name: "Азотное удобрение NPK", sku: "NPK-20-10-10" }],
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <Search size={36} className="text-gray-600" />
          <h1 className="text-4xl font-bold text-gray-900">Поиск: "{query}"</h1>
        </div>

        <div className="space-y-6">
          {/* Users */}
          {results.users.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4">Пользователи</h2>
              <div className="space-y-2">
                {results.users.map((user) => (
                  <div key={user.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {results.orders.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4">Заказы</h2>
              <div className="space-y-2">
                {results.orders.map((order) => (
                  <div key={order.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                    <p className="font-semibold">{order.id}</p>
                    <p className="text-sm text-gray-600">
                      {order.customer} • {order.amount.toLocaleString()} ₸
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-xl font-bold mb-4">Товары</h2>
              <div className="space-y-2">
                {results.products.map((product) => (
                  <div key={product.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-600">Артикул: {product.sku}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AdminLayout>
  );
}
