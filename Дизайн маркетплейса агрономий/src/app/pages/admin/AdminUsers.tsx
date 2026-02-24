import { useState } from "react";
import { motion } from "motion/react";
import { AdminLayout } from "../../components/AdminLayout";

const mockUsers = [
  { id: "1", phone: "+77001234567", name: "Иван Петров", role: "farmer", region: "Алматинская область" },
  { id: "2", phone: "+77009876543", name: "Алия Касымова", role: "user", region: "Костанайская область" },
  { id: "3", phone: "+77005555555", name: "АгроТех ТОО", role: "vendor", region: "Акмолинская область", company: "AgroTech KZ" },
];

export default function AdminUsers() {
  const [filter, setFilter] = useState("all");

  const filteredUsers = filter === "all" ? mockUsers : mockUsers.filter((u) => u.role === filter);

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Пользователи</h1>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
          >
            <option value="all">Все</option>
            <option value="user">Покупатели</option>
            <option value="farmer">Фермеры</option>
            <option value="vendor">Поставщики</option>
            <option value="admin">Администраторы</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Телефон</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Имя</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Роль</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Регион</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Компания</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{user.phone}</td>
                  <td className="px-6 py-4 text-sm">{user.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{user.region}</td>
                  <td className="px-6 py-4 text-sm">{user.company || "—"}</td>
                  <td className="px-6 py-4">
                    <select className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500">
                      <option>user</option>
                      <option>farmer</option>
                      <option>vendor</option>
                      <option>admin</option>
                    </select>
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
