import { useState } from "react";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";

const mockAuditLogs = [
  { id: "1", action: "Загрузка прайс-листа", company: "AgroTech KZ", user: "vendor@agro.kz", date: "2024-02-23 14:30", details: "23 товара обработано" },
  { id: "2", action: "Изменение статуса заказа", company: "—", user: "admin", date: "2024-02-23 12:15", details: "ORD-2024-001: New → Paid" },
  { id: "3", action: "Одобрение поставщика", company: "FarmSupply Ltd", user: "super_admin", date: "2024-02-22 16:45", details: "Компания одобрена" },
  { id: "4", action: "Создание товара", company: "АгроХим ТОО", user: "vendor2@agro.kz", date: "2024-02-22 10:20", details: "SKU: HERB-WS-10L" },
];

export default function StaffAudit() {
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = actionFilter === "all" ? mockAuditLogs : mockAuditLogs.filter((log) => log.action === actionFilter);

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Журнал действий</h1>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="all">Все действия</option>
            <option value="Загрузка прайс-листа">Загрузка прайс-листа</option>
            <option value="Изменение статуса заказа">Изменение статуса заказа</option>
            <option value="Одобрение поставщика">Одобрение поставщика</option>
            <option value="Создание товара">Создание товара</option>
          </select>
        </div>

        {/* Audit Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Дата и время</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Действие</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Компания</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Пользователь</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Детали</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{log.date}</td>
                    <td className="px-6 py-4 text-sm font-medium">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.company}</td>
                    <td className="px-6 py-4 text-sm text-blue-600">{log.user}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </StaffLayout>
  );
}
