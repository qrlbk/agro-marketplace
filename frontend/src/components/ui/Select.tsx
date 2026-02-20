import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  id?: string;
}

export function Select({
  label,
  error,
  options,
  id: idProp,
  ...props
}: SelectProps) {
  const id = idProp ?? `select-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-slate-700 mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full min-h-12 px-4 rounded-md border bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 transition-colors ${
          error
            ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
            : "border-gray-200"
        }`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-sm text-red-600 font-medium"
        >
          {error}
        </p>
      )}
    </div>
  );
}
