import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<
  ButtonVariant,
  string
> = {
  primary:
    "bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold disabled:opacity-60 disabled:pointer-events-none",
  secondary:
    "border-2 border-gray-300 bg-white text-slate-700 font-semibold hover:bg-gray-50 hover:border-gray-400 disabled:opacity-60 disabled:pointer-events-none",
  danger:
    "border-2 border-red-500 bg-white text-red-600 font-semibold hover:bg-red-50 hover:border-red-600 disabled:opacity-60 disabled:pointer-events-none",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`min-h-12 px-4 rounded-md inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span>Загрузка…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
