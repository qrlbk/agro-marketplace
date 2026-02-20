import { Link } from "react-router-dom";
import { Wrench, XCircle, Plus } from "lucide-react";
import type { Machine } from "../api/client";

export interface GarageWidgetProps {
  selectedMachine: Machine | null;
  onClearFilter: () => void;
  onAddMachine?: () => void;
}

export function GarageWidget({
  selectedMachine,
  onClearFilter,
  onAddMachine,
}: GarageWidgetProps) {
  if (!selectedMachine) return null;

  const label = [selectedMachine.brand, selectedMachine.model]
    .filter(Boolean)
    .join(" ");
  const withYear =
    selectedMachine.year != null
      ? `${label} ${selectedMachine.year}`
      : label;

  return (
    <div className="border-2 border-emerald-800 rounded-md bg-emerald-50 p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-emerald-800">
        <Wrench className="h-5 w-5 shrink-0" />
        <span className="font-semibold text-slate-900">Текущая техника:</span>
        <span className="font-bold text-slate-900">{withYear}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <button
          type="button"
          onClick={onClearFilter}
          className="min-h-12 px-4 rounded-md border-2 border-gray-300 bg-white text-slate-700 font-semibold hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          aria-label="Сбросить фильтр по технике"
        >
          <XCircle className="h-5 w-5" aria-hidden />
          Сбросить фильтр
        </button>
        {onAddMachine ? (
          <button
            type="button"
            onClick={onAddMachine}
            className="min-h-12 px-4 rounded-md bg-white border-2 border-emerald-800 text-emerald-800 font-semibold hover:bg-emerald-100 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
            aria-label="Добавить технику в гараж"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Добавить технику
          </button>
        ) : (
          <Link
            to="/garage"
            className="min-h-12 px-4 rounded-md bg-white border-2 border-emerald-800 text-emerald-800 font-semibold hover:bg-emerald-100 flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Добавить технику
          </Link>
        )}
      </div>
    </div>
  );
}
