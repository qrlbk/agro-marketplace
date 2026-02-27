import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { Search } from "lucide-react";

export default function StaffSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  // Mock search results
  const results = {
    users: [{ id: "1", phone: "+77001234567", name: "Иван Петров", role: "farmer" }],
    orders: [{ id: "ORD-2024-001", customer: "+77001234567", amount: 50000, status: "New" }],
    products: [{ id: "1", name: "Азотное удобрение NPK", sku: "NPK-20-10-10", vendor: "AgroTech KZ" }],
    companies: [{ id: "1", name: "AgroTech KZ", bin: "123456789012" }],
    feedback: [{ id: "T-001", subject: "Вопрос по заказу", status: "open" }],
  };

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-8">
          <Search size={36} className="text-gray-600" />
          <h1 className="text-4xl font-bold text-gray-900">Поиск: "{query}"</h1>
        </div>

        {!query ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-md">
            <p className="text-gray-500">Введите запрос в строку поиска</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Users */}
            {results.users.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h2 className="text-xl font-bold mb-4">Пользователи ({results.users.length})</h2>
                <div className="space-y-2">
                  {results.users.map((user) => (
                    <div key={user.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.phone} • {user.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Orders */}
            {results.orders.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h2 className="text-xl font-bold mb-4">Заказы ({results.orders.length})</h2>
                <div className="space-y-2">
                  {results.orders.map((order) => (
                    <div key={order.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <p className="font-semibold text-blue-600">{order.id}</p>
                      <p className="text-sm text-gray-600">
                        {order.customer} • {order.amount.toLocaleString()} ₸ • {order.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            {results.products.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-md">
                <h2 className="text-xl font-bold mb-4">Товары ({results.products.length})</h2>
                <div className="space-y-2">
                  {results.products.map((product) => (
                    <div key={product.id} className="p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        Артикул: {product.sku} • {product.vendor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </StaffLayout>
  );
}
