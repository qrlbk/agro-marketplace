import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaffAuth } from "../context/StaffAuthContext";

export function StaffLogin() {
  const { login } = useStaffAuth();
  const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginValue, password);
      navigate("/staff", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неверный логин или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-6">Вход в портал сотрудников</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="staff-login" className="block text-sm font-medium text-slate-700 mb-1">
              Логин
            </label>
            <input
              id="staff-login"
              type="text"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
            />
          </div>
          <div>
            <label htmlFor="staff-password" className="block text-sm font-medium text-slate-700 mb-1">
              Пароль
            </label>
            <input
              id="staff-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded border border-gray-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-emerald-800 text-white font-medium hover:bg-emerald-900 disabled:opacity-50"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-500 text-center">
          Демо: admin / admin (если backend не настроен)
        </p>
      </div>
    </div>
  );
}
