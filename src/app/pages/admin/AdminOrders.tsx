import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";

const mockOrders = [
  { id: "ORD-001", customer: "+77001234567", vendor: "AgroTech KZ", amount: 50000, status: "New", date: "2024-02-23" },
  { id: "ORD-002", customer: "+77009876543", vendor: "FarmSupply", amount: 15000, status: "Paid", date: "2024-02-22" },
  { id: "ORD-003", customer: "+77001112233", vendor: "AgroTech KZ", amount: 89000, status: "Shipped", date: "2024-02-20" },
];

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredOrders = statusFilter === "all" ? mockOrders : mockOrders.filter((o) => o.status === statusFilter);

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Заказы</h1>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
          >
            <option value="all">Все</option>
            <option value="New">Новые</option>
            <option value="Paid">Оплачены</option>
            <option value="Shipped">Отправлены</option>
            <option value="Delivered">Доставлены</option>
          </select>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
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
                  <td className="px-6 py-4 text-sm font-medium">{order.id}</td>
                  <td className="px-6 py-4 text-sm">{order.customer}</td>
                  <td className="px-6 py-4 text-sm">{order.vendor}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{order.amount.toLocaleString()} ₸</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{order.date}</td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-green-600 hover:text-green-700 font-semibold text-sm"
                    >
                      Подробнее
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
