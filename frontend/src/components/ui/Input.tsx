import React from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  error?: string;
  id?: string;
  className?: string;
}

export function Input({
  label,
  error,
  id: idProp,
  className = "",
  ...props
}: InputProps) {
  const id = idProp ?? `input-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-slate-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full min-h-12 px-4 rounded-md border bg-white text-slate-900 font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:border-emerald-800 transition-colors ${
          error
            ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
            : "border-gray-200"
        }`}
        {...props}
      />
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
