import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { useStaffAuth } from "../context/StaffAuthContext";
import { Package, DollarSign, TrendingUp, Users, Check } from "lucide-react";

const stats = [
  { label: "Заказов", value: "156", icon: Package, color: "blue", bg: "bg-blue-100", text: "text-blue-600" },
  { label: "Выручка", value: "2.4M ₸", icon: DollarSign, color: "green", bg: "bg-green-100", text: "text-green-600" },
  { label: "Новых", value: "23", icon: TrendingUp, color: "purple", bg: "bg-purple-100", text: "text-purple-600" },
  { label: "Пользователей", value: "842", icon: Users, color: "orange", bg: "bg-orange-100", text: "text-orange-600" },
];

const recentOrders = [
  { id: "ORD-2024-001", customer: "+77001234567", vendor: "AgroTech KZ", amount: 50000, status: "New" },
  { id: "ORD-2024-002", customer: "+77009876543", vendor: "FarmSupply Ltd", amount: 15000, status: "Paid" },
  { id: "ORD-2024-003", customer: "+77001112233", vendor: "АгроХим ТОО", amount: 89000, status: "Shipped" },
];

const pendingVendors = [
  { id: "1", company: "FarmSupply Ltd", bin: "123456789012", phone: "+77008888888", contact: "Сергей Иванов" },
  { id: "2", company: "АгроХим ТОО", bin: "987654321098", phone: "+77007777777", contact: "Марина Смирнова" },
];

export default function StaffDashboard() {
  const { hasPermission } = useStaffAuth();

  return (
    <StaffLayout>
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
                <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                  <stat.icon size={24} className={stat.text} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <h2 className="text-2xl font-bold mb-6">Последние заказы</h2>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-600">{order.id}</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Покупатель: {order.customer}</p>
                  <p className="text-sm text-gray-600 mb-1">Поставщик: {order.vendor}</p>
                  <p className="text-lg font-bold text-green-600">{order.amount.toLocaleString()} ₸</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Vendors */}
          {hasPermission("vendors.view") && (
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold mb-6">Заявки поставщиков</h2>
              {pendingVendors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет заявок на рассмотрении</p>
              ) : (
                <div className="space-y-4">
                  {pendingVendors.map((vendor) => (
                    <div key={vendor.id} className="p-4 border border-gray-100 rounded-xl">
                      <h3 className="font-semibold text-lg mb-2">{vendor.company}</h3>
                      <p className="text-sm text-gray-600 mb-1">БИН: {vendor.bin}</p>
                      <p className="text-sm text-gray-600 mb-1">Телефон: {vendor.phone}</p>
                      <p className="text-sm text-gray-600 mb-3">Контакт: {vendor.contact}</p>
                      {hasPermission("vendors.approve") && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                        >
                          <Check size={18} />
                          Одобрить
                        </motion.button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </StaffLayout>
  );
}
