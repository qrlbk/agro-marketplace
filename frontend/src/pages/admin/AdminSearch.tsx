import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAdminSearch, type AdminSearchResult } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { PageLayout } from "../../components/PageLayout";
import { AlertCircle, Users, ShoppingBag, Package, Building, MessageSquare } from "lucide-react";

export function AdminSearch() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const { token } = useAuth();
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
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск</h1>
        <p className="text-slate-600">Введите запрос в строку поиска и нажмите Enter.</p>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск: {q}</h1>
        <div className="animate-pulse h-48 bg-gray-200 rounded-md" />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск: {q}</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </PageLayout>
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
      <PageLayout>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поиск: {q}</h1>
        <p className="text-slate-600">Ничего не найдено.</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
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
                  <Link
                    to={`/admin/users/${u.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    {u.phone} {u.name ? `· ${u.name}` : ""} (id: {u.id})
                  </Link>
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
                  <Link to={`/admin/orders/${o.id}`} className="text-emerald-800 hover:underline">
                    Заказ #{o.id}
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
                  <Link
                    to={`/products/${p.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    {p.name} ({p.article_number}) — id: {p.id}
                  </Link>
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
                  <span className="text-slate-900">
                    {c.name ?? "—"} БИН {c.bin} (id: {c.id})
                  </span>
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
                  <Link
                    to={`/admin/feedback/${f.id}`}
                    className="text-emerald-800 hover:underline"
                  >
                    #{f.id}: {f.subject}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
