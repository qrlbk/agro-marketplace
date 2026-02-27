import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Building2, Tractor, ShoppingBag } from "lucide-react";
import { getRegions, postOnboarding, type OnboardingBody } from "../api/client";

type UserRole = "guest" | "user" | "farmer" | "vendor" | "admin";

type OnboardingStep = "role" | "form";

export default function Onboarding() {
  const [step, setStep] = useState<OnboardingStep>("role");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    region: "",
    bin: "",
    companyName: "",
    legalAddress: "",
    ceoName: "",
    bankIik: "",
    bankBik: "",
    contactPerson: "",
  });
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, refreshUser } = useAuth();
  const navigate = useNavigate();

  const roles = [
    {
      value: "user" as UserRole,
      title: "Покупатель",
      description: "Покупка товаров для личного использования",
      icon: ShoppingBag,
      color: "from-blue-500 to-cyan-500",
    },
    {
      value: "farmer" as UserRole,
      title: "Фермер",
      description: "Управление техникой и закупки для хозяйства",
      icon: Tractor,
      color: "from-green-500 to-emerald-500",
    },
    {
      value: "vendor" as UserRole,
      title: "Поставщик",
      description: "Продажа товаров на платформе",
      icon: Building2,
      color: "from-purple-500 to-pink-500",
    },
  ];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep("form");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getRegions();
        if (!cancelled) setRegions(list);
      } catch {
        // если не удалось загрузить регионы — оставляем список пустым, пользователь всё равно увидит select
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !token) return;
    setError(null);
    setLoading(true);

    const body: OnboardingBody = {
      role: selectedRole === "guest" ? "user" : selectedRole,
      name: formData.name || undefined,
      region: formData.region || undefined,
    };

    if (selectedRole === "farmer" || selectedRole === "vendor") {
      body.bin = formData.bin || undefined;
      body.company_name = formData.companyName || undefined;
      body.legal_address = formData.legalAddress || undefined;
      if (selectedRole === "farmer") {
        body.chairman_name = formData.ceoName || undefined;
      } else if (selectedRole === "vendor") {
        body.chairman_name = formData.ceoName || formData.contactPerson || undefined;
        body.bank_iik = formData.bankIik || undefined;
        body.bank_bik = formData.bankBik || undefined;
        body.contact_name = formData.contactPerson || undefined;
      }
    }

    try {
      await postOnboarding(body, token);
      await refreshUser();

      if (selectedRole === "farmer") {
        navigate("/garage", { replace: true });
      } else if (selectedRole === "vendor") {
        navigate("/vendor", { replace: true });
      } else {
        navigate("/catalog", { replace: true });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {step === "role" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Добро пожаловать!
              </h1>
              <p className="text-xl text-gray-600">Выберите вашу роль</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {roles.map((role, index) => (
                <motion.button
                  key={role.value}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRoleSelect(role.value)}
                  className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all text-center"
                >
                  <div
                    className={`w-20 h-20 bg-gradient-to-br ${role.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                  >
                    <role.icon size={40} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {role.title}
                  </h3>
                  <p className="text-gray-600">{role.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === "form" && selectedRole && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Заполните профиль
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Common Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Имя</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Регион</label>
                  <select
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value })
                    }
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                    required
                  >
                    <option value="">Выберите регион</option>
                    {(regions.length ? regions : [
                      "Алматинская область",
                      "Акмолинская область",
                      "Костанайская область",
                      "Северо-Казахстанская область",
                    ]).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Farmer/Vendor Fields */}
              {(selectedRole === "farmer" || selectedRole === "vendor") && (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">БИН</label>
                      <input
                        type="text"
                        value={formData.bin}
                        onChange={(e) =>
                          setFormData({ ...formData, bin: e.target.value })
                        }
                        placeholder="12 цифр"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">
                        Название компании
                      </label>
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) =>
                          setFormData({ ...formData, companyName: e.target.value })
                        }
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Юридический адрес
                    </label>
                    <input
                      type="text"
                      value={formData.legalAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, legalAddress: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                    />
                  </div>
                </>
              )}

              {/* Vendor Only Fields */}
              {selectedRole === "vendor" && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Банк ИИК
                    </label>
                    <input
                      type="text"
                      value={formData.bankIik}
                      onChange={(e) =>
                        setFormData({ ...formData, bankIik: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Банк БИК
                    </label>
                    <input
                      type="text"
                      value={formData.bankBik}
                      onChange={(e) =>
                        setFormData({ ...formData, bankBik: e.target.value })
                      }
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 mb-2">{error}</div>
              )}

              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setStep("role")}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Назад
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Сохраняем..." : "Завершить"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
