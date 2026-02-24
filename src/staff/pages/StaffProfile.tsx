import { useState } from "react";
import { motion } from "motion/react";
import { StaffLayout } from "../components/StaffLayout";
import { useStaffAuth } from "../context/StaffAuthContext";
import { User, Lock } from "lucide-react";

export default function StaffProfile() {
  const { user } = useStaffAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Новые пароли не совпадают");
      return;
    }

    if (newPassword.length < 6) {
      setError("Пароль должен быть не менее 6 символов");
      return;
    }

    // Mock password change
    setSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    setTimeout(() => setSuccess(false), 3000);
  };

  if (!user) return null;

  return (
    <StaffLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Профиль</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* User Info */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={40} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-gray-600">{user.role.name}</p>
              </div>
            </div>

            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600 mb-1">Логин:</dt>
                <dd className="font-semibold font-mono">{user.login}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Роль:</dt>
                <dd>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                    {user.role.name}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600 mb-1">Количество разрешений:</dt>
                <dd className="font-semibold">{user.role.permissions.length}</dd>
              </div>
            </dl>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-2 mb-6">
              <Lock size={24} className="text-gray-700" />
              <h2 className="text-2xl font-bold">Изменить пароль</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Текущий пароль</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Подтвердите новый пароль</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
                  Пароль успешно изменён!
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
              >
                Изменить пароль
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </StaffLayout>
  );
}
