import { useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Phone, Lock, ArrowRight } from "lucide-react";
import { request, type User, setUserPassword } from "../api/client";

type Step = "phone" | "code";
type AuthMode = "otp" | "password";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [authMode, setAuthMode] = useState<AuthMode>("otp");
  const [error, setError] = useState("");
  const [passwordLoginLoading, setPasswordLoginLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [createPassword, setCreatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goAfterLogin = (user: User) => {
    if (user.role === "guest") {
      navigate("/onboarding", { replace: true });
      return;
    }
    if (user.role === "vendor") {
      navigate("/vendor", { replace: true });
      return;
    }
    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    navigate(from ?? "/catalog", { replace: true });
  };

  const phoneDigits = (s: string) => s.replace(/\D/g, "");
  const isPhoneValid = (s: string) => {
    const d = phoneDigits(s);
    return d.length >= 10 && d.length <= 15;
  };
  const isOtpCodeValid = (s: string) => /^\d{4,6}$/.test(s.trim());

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    const rest = digits.startsWith("7") ? digits.slice(1) : digits;
    let res = "+7";
    if (rest.length > 0) res += " (" + rest.slice(0, 3);
    if (rest.length >= 3) res += ") " + rest.slice(3, 6);
    if (rest.length >= 6) res += "-" + rest.slice(6, 8);
    if (rest.length >= 8) res += "-" + rest.slice(8, 10);
    return res;
  };

  const sendOtp = async () => {
    setError("");
    if (!isPhoneValid(phone.trim())) {
      setError("Неверный формат телефона");
      return;
    }
    try {
      setOtpLoading(true);
      await request("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (!isOtpCodeValid(code)) {
      setError("Введите код из SMS (4–6 цифр)");
      return;
    }
    try {
      setOtpLoading(true);
      const data = await request<{ access_token: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      });
      login(data.access_token);

      // Классическая регистрация: сразу задаём пароль, если пользователь включил опцию
      if (createPassword) {
        const pwd = newPassword.trim();
        const pwd2 = newPasswordConfirm.trim();
        if (!pwd || pwd !== pwd2) {
          setError("Пароли не совпадают");
          return;
        }
        try {
          await setUserPassword(data.access_token, { new_password: pwd });
        } catch (err) {
          setError((err as Error).message);
          return;
        }
      }

      const me = await request<User>("/auth/me", { token: data.access_token });
      goAfterLogin(me);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOtpLoading(false);
    }
  };

  const passwordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const phoneVal = phone.trim();
    const passwordVal = password.trim();
    if (!phoneVal || !passwordVal) {
      setError("Введите телефон и пароль");
      return;
    }
    if (!isPhoneValid(phoneVal)) {
      setError("Неверный формат телефона");
      return;
    }
    setPasswordLoginLoading(true);
    try {
      const data = await request<{ access_token: string }>("/auth/login-password", {
        method: "POST",
        body: JSON.stringify({ phone: phoneVal, password: passwordVal }),
      });
      login(data.access_token);
      const me = await request<User>("/auth/me", { token: data.access_token });
      goAfterLogin(me);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPasswordLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-3xl">🌾</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">AgroMarket</h1>
          <p className="text-gray-600">Вход в систему</p>
        </div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {/* Tabs: SMS vs Password */}
          <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setStep("phone");
                setError("");
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                authMode === "otp" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              По коду из SMS
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("password");
                setError("");
              }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                authMode === "password" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              По паролю
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
            >
              {error}
            </motion.div>
          )}

          {authMode === "otp" ? (
            step === "phone" ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Телефон</label>
                  <div className="relative">
                    <Phone
                      size={20}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="+7 (___) ___-__-__"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={sendOtp}
                  disabled={otpLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {otpLoading ? "Отправка..." : "Получить код по SMS"}
                  <ArrowRight size={20} />
                </motion.button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Код из SMS</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="4–6 цифр"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={createPassword}
                      onChange={(e) => setCreatePassword(e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span>Создать пароль для последующих входов</span>
                  </label>
                  {createPassword && (
                    <div className="grid gap-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Новый пароль</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Минимум 8 символов, буквы и цифры"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">
                          Повторите пароль
                        </label>
                        <input
                          type="password"
                          value={newPasswordConfirm}
                          onChange={(e) => setNewPasswordConfirm(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("phone")}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={verifyOtp}
                    disabled={otpLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {otpLoading ? "Вход..." : "Войти"}
                  </button>
                </div>
              </div>
            )
          ) : (
            <form onSubmit={passwordLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Телефон</label>
                <div className="relative">
                  <Phone
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="+7 (___) ___-__-__"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Пароль</label>
                <div className="relative">
                  <Lock
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ваш пароль"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={passwordLoginLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {passwordLoginLoading ? "Вход..." : "Войти по паролю"}
                <ArrowRight size={20} />
              </motion.button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
