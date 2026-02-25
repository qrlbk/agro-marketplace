import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { Plus, Edit, UserX, UserCheck } from "lucide-react";

interface Employee {
  id: string;
  login: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const mockEmployees: Employee[] = [
  { id: "1", login: "admin", name: "Главный администратор", role: "Super Admin", isActive: true, createdAt: "2024-01-01" },
  { id: "2", login: "support1", name: "Анна Петрова", role: "Support", isActive: true, createdAt: "2024-01-15" },
  { id: "3", login: "manager", name: "Сергей Иванов", role: "Admin", isActive: false, createdAt: "2024-02-01" },
];

export default function StaffEmployees() {
  const [employees, setEmployees] = useState(mockEmployees);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    login: "",
    name: "",
    role: "support",
    password: "",
    isActive: true,
  });

  const handleCreate = () => {
    setEditingEmployee(null);
    setFormData({ login: "", name: "", role: "support", password: "", isActive: true });
    setIsModalOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      login: employee.login,
      name: employee.name,
      role: employee.role.toLowerCase().replace(" ", "_"),
      password: "",
      isActive: employee.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEmployee) {
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee.id
            ? { ...emp, login: formData.login, name: formData.name, role: formData.role, isActive: formData.isActive }
            : emp
        )
      );
    } else {
      const newEmployee: Employee = {
        id: Date.now().toString(),
        login: formData.login,
        name: formData.name,
        role: formData.role,
        isActive: formData.isActive,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setEmployees([...employees, newEmployee]);
    }
    setIsModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, isActive: !emp.isActive } : emp)));
  };

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Сотрудники</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Добавить сотрудника
          </motion.button>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Логин</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Имя</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Роль</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Дата создания</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Действия</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{employee.login}</td>
                    <td className="px-6 py-4 text-sm">{employee.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {employee.isActive ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <UserCheck size={16} />
                          Активен
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <UserX size={16} />
                          Деактивирован
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{employee.createdAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(employee.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            employee.isActive
                              ? "text-red-600 hover:bg-red-50"
                              : "text-green-600 hover:bg-green-50"
                          }`}
                        >
                          {employee.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full"
              >
                <h2 className="text-2xl font-bold mb-6">
                  {editingEmployee ? "Редактировать сотрудника" : "Создать сотрудника"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Логин</label>
                    <input
                      type="text"
                      value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Имя</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Роль</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="support">Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Пароль {editingEmployee && "(оставьте пустым для сохранения текущего)"}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                      required={!editingEmployee}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-blue-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-semibold">Активен</label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                    >
                      {editingEmployee ? "Сохранить" : "Создать"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </StaffLayout>
  );
}
