import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAdminSearch, type AdminSearchResult } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { AlertCircle, Users, ShoppingBag, Package, Building, MessageSquare } from "lucide-react";

export function StaffSearch() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { getTokenForAdminApi, hasPermission } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [result, setResult] = useState<AdminSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !q.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getAdminSearch(q, token)
      .then(setResult)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Ошибка поиска");
        setResult(null);
      })
      .finally(() => setLoading(false));
  }, [token, q]);

  if (!q.trim()) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск</h1>
        <p className="text-slate-600">Введите запрос в строку поиска и нажмите Enter.</p>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск: {q}</h1>
        <div className="animate-pulse h-48 bg-gray-200 rounded-md" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск: {q}</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </>
    );
  }

  if (!result) return null;

  const hasAny =
    result.users.length > 0 ||
    result.orders.length > 0 ||
    result.products.length > 0 ||
    result.companies.length > 0 ||
    result.feedback.length > 0;

  if (!hasAny) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск: {q}</h1>
        <p className="text-slate-600">Ничего не найдено.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск: {q}</h1>
      <div className="space-y-6">
        {result.users.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
              <Users className="h-5 w-5" />
              Пользователи
            </h2>
            <ul className="list-none p-0 m-0 space-y-1">
              {result.users.map((u) => (
                <li key={u.id}>
                  {hasPermission("users.view") ? (
                    <Link to={`/staff/users?phone=${encodeURIComponent(u.phone)}`} className="text-emerald-800 hover:underline">
                      {u.phone}
                      {u.name && ` — ${u.name}`}
                    </Link>
                  ) : (
                    <>
                      <span className="text-slate-700">{u.phone}</span>
                      {u.name && <span className="text-slate-600 ml-2">{u.name}</span>}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {result.orders.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
              <ShoppingBag className="h-5 w-5" />
              Заказы
            </h2>
            <ul className="list-none p-0 m-0 space-y-1">
              {result.orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/staff/orders/${o.id}`} className="text-emerald-800 hover:underline">
                    {o.order_number ?? `Заказ #${o.id}`}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {result.products.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
              <Package className="h-5 w-5" />
              Товары
            </h2>
            <ul className="list-none p-0 m-0 space-y-1">
              {result.products.map((p) => (
                <li key={p.id}>
                  <Link to={`/products/${p.id}`} className="text-emerald-800 hover:underline">
                    {p.name}
                  </Link>
                  {p.article_number && (
                    <span className="text-slate-500 ml-2">{p.article_number}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        {result.companies.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
              <Building className="h-5 w-5" />
              Компании
            </h2>
            <ul className="list-none p-0 m-0 space-y-1">
              {result.companies.map((c) => (
                <li key={c.id}>
                  <span className="text-slate-700">{c.name ?? "—"}</span>
                  <span className="text-slate-500 ml-2">БИН {c.bin}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {result.feedback.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
              <MessageSquare className="h-5 w-5" />
              Обращения
            </h2>
            <ul className="list-none p-0 m-0 space-y-1">
              {result.feedback.map((f) => (
                <li key={f.id}>
                  <Link to={`/staff/feedback/${f.id}`} className="text-emerald-800 hover:underline">
                    #{f.id} — {f.subject}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
