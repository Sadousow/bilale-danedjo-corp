import type { ReactNode } from "react";

export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-blue">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "gold" | "danger" | "success";
}) {
  const tones = {
    default: "text-brand-blue",
    gold: "text-brand-gold-dark",
    danger: "text-red-600",
    success: "text-emerald-600",
  };
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="text-center py-16 text-slate-400 text-sm">{children}</div>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "green" | "red" | "gold" | "blue";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-600",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    gold: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
