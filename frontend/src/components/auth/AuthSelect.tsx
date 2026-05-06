import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export function AuthSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  children,
  required,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-slate-400"
          strokeWidth={2}
          aria-hidden
        />
        <select
          id={id}
          name={id}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm outline-none transition focus:border-brand-panel focus:ring-2 focus:ring-brand-panel/25 ${value ? "text-brand-ink" : "text-slate-400"}`}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={2}
          aria-hidden
        />
      </div>
    </div>
  );
}
