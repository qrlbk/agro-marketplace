import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { request, type User, setUserPassword } from "../api/client";
import { Phone, Lock, ArrowRight } from "lucide-react";
import { Button } from "../components/ui";

export function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [authMode, setAuthMode] = useState<"otp" | "password">("otp");
  const [error, setError] = useState("");
  const [createPassword, setCreatePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordLoginLoading, setPasswordLoginLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goAfterLogin = (user: User) => {
    if (user.role === "guest") {
      navigate("/onboarding", { replace: true });
      return;
    }
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    navigate(from ?? "/catalog", { replace: true });
  };

  const phoneDigits = (s: string) => s.replace(/\D/g, "");
  const isPhoneValid = (s: string) => phoneDigits(s).length >= 10 && phoneDigits(s).length <= 15;
  const isOtpCodeValid = (s: string) => /^\d{4,6}$/.test(s.trim());

  const normalizePhoneForApi = (s: string) => {
    const digits = phoneDigits(s);
    if (!digits) return s.trim();
    return `+${digits}`;
  };

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

  const demoLogin = async () => {
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
    setDemoLoading(true);
    const controller = new AbortController();
    const TIMEOUT_MS = 8000;
    const timeoutId = setTimeout(() => {
      controller.abort();
      setDemoLoading(false);
      setError("Сервер не отвечает. Запустите бэкенд: в папке backend выполните uvicorn app.main:app --reload");
    }, TIMEOUT_MS);
    try {
      const data = await request<{ access_token: string }>("/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ phone: normalizePhoneForApi(phoneVal), password: passwordVal }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      login(data.access_token);
      const me = await request<User>("/auth/me", { token: data.access_token });
      goAfterLogin(me);
    } catch (e) {
      clearTimeout(timeoutId);
      const message =
        e instanceof Error && e.name === "AbortError"
          ? "Сервер не отвечает. Запустите бэкенд: в папке backend выполните uvicorn app.main:app --reload"
          : e instanceof Error
            ? e.message
            : String(e);
      setError(message);
    } finally {
      setDemoLoading(false);
    }
  };

  const sendOtp = async () => {
    setError("");
    if (!isPhoneValid(phone.trim())) {
      setError("Неверный формат телефона");
      return;
    }
    try {
      await request("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ phone: normalizePhoneForApi(phone) }),
      });
      setStep("code");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const verifyOtp = async () => {
    setError("");
    if (!isOtpCodeValid(code)) {
      setError("Введите код из SMS (4–6 цифр)");
      return;
    }
    try {
      const data = await request<{ access_token: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ phone: normalizePhoneForApi(phone), code }),
      });
      const token = data.access_token;
      login(token);

      // Классическая регистрация: после первой авторизации сразу задаём пароль
      if (createPassword) {
        const pwd = newPassword.trim();
        const pwd2 = newPasswordConfirm.trim();
        if (!pwd || !pwd2) {
          setError("Введите пароль и его подтверждение");
          return;
        }
        if (pwd !== pwd2) {
          setError("Пароли не совпадают");
          return;
        }
        try {
          await setUserPassword(token, { new_password: pwd });
        } catch (e) {
          setError((e as Error).message);
          return;
        }
      }

      const me = await request<User>("/auth/me", { token });
      goAfterLogin(me);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const passwordLogin = async () => {
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
        body: JSON.stringify({ phone: normalizePhoneForApi(phoneVal), password: passwordVal }),
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

  const showDemo = import.meta.env.VITE_SHOW_DEMO === "true";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-3xl" aria-hidden>🌾</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Агро Маркетплейс</h1>
          <p className="text-gray-600">Вход в систему</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
              role="alert"
            >
              {error}
            </motion.div>
          )}

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

          {authMode === "otp" ? (
            step === "phone" ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Телефон</label>
                  <div className="relative">
                    <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
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
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Получить код по SMS
                  <ArrowRight size={20} aria-hidden />
                </motion.button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Код из SMS</label>
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
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Новый пароль</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Минимум 8 символов, буквы и цифры"
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Повторите пароль</label>
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
                  <Button variant="secondary" onClick={() => setStep("phone")} className="flex-1">
                    Назад
                  </Button>
                  <Button onClick={verifyOtp} className="flex-1">
                    Войти
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Телефон</label>
                <div className="relative">
                  <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">Пароль</label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ваш пароль"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>
              </div>
              <Button type="button" onClick={passwordLogin} loading={passwordLoginLoading} className="w-full">
                Войти по паролю
              </Button>
            </div>
          )}

          {showDemo && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Демо-вход (для локальной разработки)</p>
              <p className="text-xs text-gray-500 mb-4">
                Используйте тестовые данные из локальной документации или окружения.
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="+7700..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                  />
                </div>
                <Button type="button" onClick={demoLogin} loading={demoLoading} className="w-full">
                  Войти по паролю
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            <span>Нет аккаунта?</span>{" "}
            <button
              type="button"
              onClick={() => {
                setAuthMode("otp");
                setCreatePassword(true);
                setError("");
                // Если мы ещё на первом шаге, пробуем сразу отправить SMS (покажет ошибку, если телефон не введён)
                if (step === "phone") {
                  void sendOtp();
                } else {
                  setStep("code");
                }
              }}
              className="font-semibold text-green-600 hover:text-green-700"
            >
              Зарегистрироваться
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
