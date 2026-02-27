import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";
import { Package, DollarSign, TrendingUp, Users } from "lucide-react";

const stats = [
  { label: "Всего заказов", value: "156", icon: Package, color: "blue" },
  { label: "Выручка", value: "2.4M ₸", icon: DollarSign, color: "green" },
  { label: "Новые заказы", value: "23", icon: TrendingUp, color: "purple" },
  { label: "Пользователи", value: "842", icon: Users, color: "orange" },
];

const recentOrders = [
  { id: "ORD-001", customer: "+77001234567", vendor: "AgroTech KZ", amount: 50000, status: "New" },
  { id: "ORD-002", customer: "+77009876543", vendor: "FarmSupply", amount: 15000, status: "Paid" },
  { id: "ORD-003", customer: "+77001112233", vendor: "AgroTech KZ", amount: 89000, status: "Shipped" },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Дашборд</h1>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                  <stat.icon size={24} className={`text-${stat.color}-600`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl p-6 shadow-md">
          <h2 className="text-2xl font-bold mb-6">Последние заказы</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Покупатель</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Поставщик</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Сумма</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Статус</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{order.id}</td>
                    <td className="px-4 py-3 text-sm">{order.customer}</td>
                    <td className="px-4 py-3 text-sm">{order.vendor}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{order.amount.toLocaleString()} ₸</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
