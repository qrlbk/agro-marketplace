import { useState, useEffect } from "react";
import { request, Machine, GarageItem, getMaintenanceAdvice, type MaintenanceAdvice } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { PageLayout } from "../components/PageLayout";
import { Input, Button, Select } from "../components/ui";
import { Wrench, Trash2, ClipboardList } from "lucide-react";

export function Garage() {
  const { token } = useAuth();
  const [garage, setGarage] = useState<GarageItem[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceAdvice, setMaintenanceAdvice] = useState<MaintenanceAdvice[] | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [serial, setSerial] = useState("");
  const [motoHours, setMotoHours] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadGarage = () => {
    if (!token) return;
    setLoading(true);
    request<GarageItem[]>("/garage/machines", { token })
      .then(setGarage)
      .catch(() => setGarage([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadGarage();
  }, [token]);

  useEffect(() => {
    request<Machine[]>("/machines").then(setMachines).catch(() => setMachines([]));
  }, []);

  useEffect(() => {
    if (!token || garage.length === 0) {
      setMaintenanceAdvice(null);
      return;
    }
    setMaintenanceLoading(true);
    getMaintenanceAdvice(token)
      .then(setMaintenanceAdvice)
      .catch(() => setMaintenanceAdvice(null))
      .finally(() => setMaintenanceLoading(false));
  }, [token, garage.length]);

  const add = async () => {
    if (!token || !selectedMachine) return;
    setError(null);
    const motoVal = motoHours.trim();
    if (motoVal) {
      const parsed = parseInt(motoVal, 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 999_999) {
        setError("Моточасы: введите число от 0 до 999999");
        return;
      }
    }
    try {
      await request("/garage/machines", {
        method: "POST",
        body: JSON.stringify({
          machine_id: Number(selectedMachine),
          serial_number: serial || null,
          moto_hours: motoVal ? parseInt(motoVal, 10) : null,
        }),
        token,
      });
      const next = await request<GarageItem[]>("/garage/machines", { token });
      setGarage(next);
      setSelectedMachine("");
      setSerial("");
      setMotoHours("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (garageId: number) => {
    if (!token) return;
    if (!window.confirm("Удалить технику из гаража?")) return;
    setError(null);
    try {
      await request(`/garage/machines/${garageId}`, { method: "DELETE", token });
      setGarage((g) => g.filter((x) => x.id !== garageId));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const machineOptions = [
    { value: "", label: "Выберите технику" },
    ...machines.map((m) => ({
      value: String(m.id),
      label: [m.brand, m.model, m.year].filter(Boolean).join(" "),
    })),
  ];

  return (
    <PageLayout>
      <h1>Мой Гараж</h1>
      <p className="text-slate-600 mb-6">
        Добавьте технику — в каталоге можно будет фильтровать запчасти под вашу технику.
      </p>

      <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Добавить технику</h2>
        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium" role="alert">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px] flex-1">
            <Select
              label="Техника"
              options={machineOptions}
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            />
          </div>
          <div className="min-w-[180px] flex-1">
            <Input
              label="Серийный номер"
              placeholder="Необязательно"
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
            />
          </div>
          <div className="min-w-[120px]">
            <Input
              type="number"
              label="Моточасы"
              placeholder="0–999999"
              value={motoHours}
              onChange={(e) => setMotoHours(e.target.value)}
            />
          </div>
          <Button onClick={add} disabled={!selectedMachine}>
            Добавить
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded-md" />
          <div className="h-16 bg-gray-200 rounded-md" />
        </div>
      ) : garage.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-12 text-center">
          <Wrench className="h-16 w-16 text-slate-300 mx-auto mb-4" aria-hidden />
          <h2 className="text-xl font-bold text-slate-900 mb-2">В гараже пока нет техники</h2>
          <p className="text-slate-600 mb-6">
            Добавьте технику выше — затем в каталоге можно будет отфильтровать запчасти под неё.
          </p>
        </div>
      ) : (
        <>
          <ul className="list-none p-0 m-0 space-y-3 mb-6">
            {garage.map((g) => (
              <li
                key={g.id}
                className="bg-white border border-gray-200 rounded-md shadow-sm p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench className="h-5 w-5 text-emerald-700 shrink-0" aria-hidden />
                  <span className="font-medium text-slate-900">
                    {g.brand} {g.model} {g.year != null ? g.year : ""}
                    {g.serial_number ? ` · ${g.serial_number}` : ""}
                    {g.moto_hours != null ? ` · ${g.moto_hours} м/ч` : ""}
                  </span>
                </div>
                <Button
                  variant="danger"
                  className="shrink-0"
                  onClick={() => remove(g.id)}
                  aria-label={`Удалить ${g.brand} ${g.model} из гаража`}
                >
                  <Trash2 className="h-5 w-5" />
                  Удалить
                </Button>
              </li>
            ))}
          </ul>

          {maintenanceLoading ? (
            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-700" aria-hidden />
                Рекомендации по ТО
              </h2>
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-gray-200 rounded-md" />
                <div className="h-12 bg-gray-200 rounded-md" />
              </div>
            </div>
          ) : maintenanceAdvice && maintenanceAdvice.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-700" aria-hidden />
                Рекомендации по ТО (AI)
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                Рекомендации по обслуживанию на основе моточасов и типовых интервалов (500ч, 1000ч и т.д.).
              </p>
              {maintenanceAdvice.some((adv) => adv.error_message) && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Рекомендации временно недоступны для части техники.
                </div>
              )}
              <div className="space-y-4">
                {maintenanceAdvice.map((adv) => (
                  <div
                    key={adv.garage_id}
                    className="border border-gray-100 rounded-md p-4 bg-slate-50/50"
                  >
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {adv.brand} {adv.model}
                      {adv.year != null ? ` ${adv.year}` : ""}
                      {adv.moto_hours != null ? ` · ${adv.moto_hours} м/ч` : ""}
                    </h3>
                    {adv.error_message ? (
                      <p className="text-sm text-amber-700 mt-2">{adv.error_message}</p>
                    ) : (
                      <ul className="list-none p-0 m-0 space-y-2 mt-2">
                        {adv.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-slate-700">
                            {rec.interval_h != null ? (
                              <span className="font-medium text-emerald-700">{rec.interval_h} ч: </span>
                            ) : null}
                            {rec.items.length > 0 ? rec.items.join(", ") : rec.reason}
                            {rec.items.length > 0 && rec.reason ? ` — ${rec.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </PageLayout>
  );
}
