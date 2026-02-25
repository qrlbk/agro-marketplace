import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { Search } from "lucide-react";

const mockOrders = [
  { id: "ORD-2024-001", customer: "+77001234567", vendor: "AgroTech KZ", amount: 50000, status: "New", date: "2024-02-23" },
  { id: "ORD-2024-002", customer: "+77009876543", vendor: "FarmSupply Ltd", amount: 15000, status: "Paid", date: "2024-02-22" },
  { id: "ORD-2024-003", customer: "+77001112233", vendor: "АгроХим ТОО", amount: 89000, status: "Shipped", date: "2024-02-20" },
  { id: "ORD-2024-004", customer: "+77005555555", vendor: "AgroTech KZ", amount: 120000, status: "Delivered", date: "2024-02-18" },
];

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Paid: "bg-yellow-100 text-yellow-700",
  Shipped: "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
};

export default function StaffOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Заказы</h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по номеру заказа..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="all">Все статусы</option>
            <option value="New">Новые</option>
            <option value="Paid">Оплачены</option>
            <option value="Shipped">Отправлены</option>
            <option value="Delivered">Доставлены</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Номер заказа</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Покупатель</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Поставщик</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Сумма</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Дата</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{order.id}</td>
                    <td className="px-6 py-4 text-sm">{order.customer}</td>
                    <td className="px-6 py-4 text-sm">{order.vendor}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{order.amount.toLocaleString()} ₸</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{order.date}</td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/staff/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                      >
                        Подробнее
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              Заказы не найдены
            </div>
          )}
        </div>
      </motion.div>
    </StaffLayout>
  );
}
