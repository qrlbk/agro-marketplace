import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";

const mockTickets = [
  { id: "T001", user: "+77001234567", subject: "Вопрос по заказу", status: "open", date: "2024-02-23" },
  { id: "T002", user: "+77009876543", subject: "Проблема с доставкой", status: "in_progress", date: "2024-02-22" },
  { id: "T003", user: "+77005555555", subject: "Вопрос по товару", status: "resolved", date: "2024-02-20" },
];

export default function AdminFeedback() {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredTickets = statusFilter === "all" ? mockTickets : mockTickets.filter((t) => t.status === statusFilter);

  const statusColors: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
  };

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Обращения</h1>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
          >
            <option value="all">Все</option>
            <option value="open">Открыты</option>
            <option value="in_progress">В работе</option>
            <option value="resolved">Решены</option>
          </select>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Пользователь</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Тема</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Статус</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Дата</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium">{ticket.id}</td>
                  <td className="px-6 py-4 text-sm">{ticket.user}</td>
                  <td className="px-6 py-4 text-sm">{ticket.subject}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[ticket.status]}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{ticket.date}</td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/admin/feedback/${ticket.id}`}
                      className="text-green-600 hover:text-green-700 font-semibold text-sm"
                    >
                      Открыть
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
