import { useState, useEffect } from "react";
import { request } from "../../api/client";
import { useStaffAuth } from "../context/StaffAuthContext";
import { Button } from "../../components/ui";
import { AlertCircle } from "lucide-react";

export interface PendingVendor {
  company_id: number;
  bin: string;
  company_name: string | null;
  legal_address: string | null;
  chairman_name: string | null;
  bank_iik: string | null;
  bank_bik: string | null;
  user_id: number;
  user_phone: string;
  user_name: string | null;
}

export function StaffVendors() {
  const { getTokenForAdminApi, hasPermission } = useStaffAuth();
  const token = getTokenForAdminApi();
  const [pendingVendors, setPendingVendors] = useState<PendingVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ companyId: number; companyName: string } | null>(null);

  const load = () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    request<PendingVendor[]>("/admin/vendors/pending", { token })
      .then(setPendingVendors)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token]);

  const approveVendor = async (companyId: number) => {
    if (!token || !hasPermission("vendors.approve")) return;
    setError(null);
    setApprovingId(companyId);
    try {
      await request(`/admin/vendors/${companyId}/approve`, { method: "POST", token });
      setPendingVendors((prev) => prev.filter((v) => v.company_id !== companyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка одобрения");
    } finally {
      setApprovingId(null);
    }
  };

  const rejectVendor = async (companyId: number) => {
    if (!token || !hasPermission("vendors.approve")) return;
    setError(null);
    setRejectingId(companyId);
    setRejectConfirm(null);
    try {
      await request(`/admin/vendors/${companyId}/reject`, { method: "POST", token });
      setPendingVendors((prev) => prev.filter((v) => v.company_id !== companyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отклонения");
    } finally {
      setRejectingId(null);
    }
  };

  if (loading) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поставщики</h1>
        <div className="animate-pulse h-64 bg-gray-200 rounded-md" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1 className="text-xl font-bold text-slate-900 mb-4">Поставщики</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Заявки поставщиков (ожидают одобрения)</h1>
      {pendingVendors.length === 0 ? (
        <p className="text-slate-600">Нет заявок на рассмотрении.</p>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-md overflow-hidden">
          <ul className="list-none p-0 m-0 divide-y divide-amber-200">
            {pendingVendors.map((v) => (
              <li key={v.company_id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-slate-900">{v.company_name || "—"}</span>
                  <span className="text-slate-600 ml-2">БИН {v.bin}</span>
                  <p className="text-sm text-slate-600 mt-1">
                    {v.user_phone} · {v.user_name || "—"}
                  </p>
                </div>
                {hasPermission("vendors.approve") && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => approveVendor(v.company_id)}
                      loading={approvingId === v.company_id}
                    >
                      Одобрить
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setRejectConfirm({ companyId: v.company_id, companyName: v.company_name || "—" })}
                      disabled={!!rejectingId}
                    >
                      Отклонить
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rejectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Отклонить заявку?</h3>
            <p className="text-slate-600 mb-4">
              Поставщик «{rejectConfirm.companyName}» будет отклонён. Вы уверены?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRejectConfirm(null)}>
                Отмена
              </Button>
              <Button
                variant="danger"
                onClick={() => rejectVendor(rejectConfirm.companyId)}
                loading={rejectingId === rejectConfirm.companyId}
              >
                Отклонить
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
