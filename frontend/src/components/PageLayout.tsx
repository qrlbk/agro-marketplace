import React from "react";

export function PageLayout({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`max-w-6xl mx-auto px-0 sm:px-2 space-y-8 font-sans ${className}`}>
      {children}
    </div>
  );
}
