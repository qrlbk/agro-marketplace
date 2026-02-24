import { useState } from "react";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";

const mockUsers = [
  { id: "1", phone: "+77001234567", name: "Иван Петров", role: "farmer", region: "Алматинская область", date: "2024-01-15" },
  { id: "2", phone: "+77009876543", name: "Алия Касымова", role: "user", region: "Костанайская область", date: "2024-01-20" },
  { id: "3", phone: "+77005555555", name: "АгроТех ТОО", role: "vendor", region: "Акмолинская область", date: "2024-02-01" },
  { id: "4", phone: "+77003333333", name: "Сергей Михайлов", role: "farmer", region: "Северо-Казахстанская область", date: "2024-02-10" },
];

const roleNames: Record<string, string> = {
  user: "Покупатель",
  farmer: "Фермер",
  vendor: "Поставщик",
  admin: "Администратор",
};

export default function StaffUsers() {
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredUsers = roleFilter === "all" ? mockUsers : mockUsers.filter((u) => u.role === roleFilter);

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Пользователи</h1>

        {/* Filter */}
        <div className="mb-6">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
          >
            <option value="all">Все роли</option>
            <option value="user">Покупатели</option>
            <option value="farmer">Фермеры</option>
            <option value="vendor">Поставщики</option>
            <option value="admin">Администраторы</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Телефон</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Имя</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Роль</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Регион</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Дата регистрации</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{user.id}</td>
                    <td className="px-6 py-4 text-sm font-medium">{user.phone}</td>
                    <td className="px-6 py-4 text-sm">{user.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {roleNames[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.region}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.date}</td>
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
