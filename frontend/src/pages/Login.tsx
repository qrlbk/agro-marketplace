import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { request } from "../api/client";
import { PageLayout } from "../components/PageLayout";
import { Input, Button } from "../components/ui";

export function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goAfterLogin = () => {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    navigate(from ?? "/catalog", { replace: true });
  };

  const phoneDigits = (s: string) => s.replace(/\D/g, "");
  const isPhoneValid = (s: string) => phoneDigits(s).length >= 10 && phoneDigits(s).length <= 15;
  const isOtpCodeValid = (s: string) => /^\d{4,6}$/.test(s.trim());

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
    try {
      const data = await request<{ access_token: string }>("/auth/demo-login", {
        method: "POST",
        body: JSON.stringify({ phone: phoneVal, password: passwordVal }),
      });
      login(data.access_token);
      goAfterLogin();
    } catch (e) {
      setError((e as Error).message);
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
        body: JSON.stringify({ phone }),
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
        body: JSON.stringify({ phone, code }),
      });
      login(data.access_token);
      goAfterLogin();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <PageLayout>
      <div className="max-w-md mx-auto">
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
          <h1 className="text-xl font-bold text-slate-900 mb-6">Вход по номеру телефона</h1>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">
              {error}
            </div>
          )}
          {step === "phone" ? (
            <div className="space-y-4">
              <Input
                type="tel"
                placeholder="+7..."
                label="Телефон"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Button onClick={sendOtp}>Получить код</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Код из SMS"
                label="Код"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={verifyOtp}>Войти</Button>
                <Button variant="secondary" onClick={() => setStep("phone")}>
                  Назад
                </Button>
              </div>
            </div>
          )}

          <hr className="my-6 border-gray-200" />
          <h2 className="text-base font-bold text-slate-900 mb-2">Демо-вход (без SMS)</h2>
          <p className="text-caption text-slate-600 mb-4">
            Admin: +77001112233 / admin. Farmer: +77009998877 / user
          </p>
          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="+77001112233"
              label="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              type="password"
              placeholder="admin или user"
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={demoLogin}>Войти по паролю</Button>
              <Button
                variant="secondary"
                onClick={() => { setPhone("+77001112233"); setPassword("admin"); }}
              >
                Подставить Admin
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setPhone("+77009998877"); setPassword("user"); }}
              >
                Подставить Farmer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
