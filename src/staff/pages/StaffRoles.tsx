import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { Permission } from "../context/StaffAuthContext";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Role {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: Permission[];
}

const allPermissions: { code: Permission; name: string }[] = [
  { code: "dashboard.view", name: "Просмотр дашборда" },
  { code: "orders.view", name: "Просмотр заказов" },
  { code: "orders.edit", name: "Редактирование заказов" },
  { code: "vendors.view", name: "Просмотр поставщиков" },
  { code: "vendors.approve", name: "Одобрение поставщиков" },
  { code: "feedback.view", name: "Просмотр обращений" },
  { code: "feedback.edit", name: "Редактирование обращений" },
  { code: "users.view", name: "Просмотр пользователей" },
  { code: "users.edit", name: "Редактирование пользователей" },
  { code: "audit.view", name: "Просмотр журнала действий" },
  { code: "search.view", name: "Глобальный поиск" },
  { code: "staff.manage", name: "Управление сотрудниками" },
  { code: "roles.manage", name: "Управление ролями" },
];

const mockRoles: Role[] = [
  {
    id: "1",
    name: "Super Admin",
    slug: "super_admin",
    isSystem: true,
    permissions: allPermissions.map((p) => p.code),
  },
  {
    id: "2",
    name: "Admin",
    slug: "admin",
    isSystem: true,
    permissions: [
      "dashboard.view",
      "orders.view",
      "orders.edit",
      "vendors.view",
      "vendors.approve",
      "feedback.view",
      "feedback.edit",
      "users.view",
      "audit.view",
      "search.view",
    ],
  },
  {
    id: "3",
    name: "Support",
    slug: "support",
    isSystem: true,
    permissions: ["feedback.view", "feedback.edit", "search.view"],
  },
];

export default function StaffRoles() {
  const [roles, setRoles] = useState(mockRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    permissions: [] as Permission[],
  });

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({ name: "", slug: "", permissions: [] });
    setIsModalOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      slug: role.slug,
      permissions: role.permissions,
    });
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permission: Permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRole) {
      setRoles(
        roles.map((role) =>
          role.id === editingRole.id
            ? { ...role, name: formData.name, slug: formData.slug, permissions: formData.permissions }
            : role
        )
      );
    } else {
      const newRole: Role = {
        id: Date.now().toString(),
        name: formData.name,
        slug: formData.slug,
        isSystem: false,
        permissions: formData.permissions,
      };
      setRoles([...roles, newRole]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Удалить эту роль?")) {
      setRoles(roles.filter((role) => role.id !== id));
    }
  };

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Роли</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            <Plus size={20} />
            Создать роль
          </motion.button>
        </div>

        {/* Roles Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Название</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Slug</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Системная</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Разрешений</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Действия</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{role.name}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{role.slug}</td>
                    <td className="px-6 py-4">
                      {role.isSystem ? (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          Да
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                          Нет
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{role.permissions.length}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(role)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        {!role.isSystem && (
                          <button
                            onClick={() => handleDelete(role.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl p-8 max-w-2xl w-full my-8"
              >
                <h2 className="text-2xl font-bold mb-6">
                  {editingRole ? "Редактировать роль" : "Создать роль"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Название</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                        required
                        disabled={editingRole?.isSystem}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Slug</label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
                        required
                        disabled={editingRole?.isSystem}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-3">Разрешения</h3>
                    <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-xl">
                      {allPermissions.map((permission) => (
                        <label
                          key={permission.code}
                          className="flex items-start gap-2 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.code)}
                            onChange={() => handleTogglePermission(permission.code)}
                            className="mt-1 rounded text-blue-500"
                            disabled={editingRole?.slug === "super_admin"}
                          />
                          <div>
                            <span className="text-sm font-semibold block">{permission.name}</span>
                            <span className="text-xs text-gray-500 font-mono">{permission.code}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
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
                      {editingRole ? "Сохранить" : "Создать"}
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
