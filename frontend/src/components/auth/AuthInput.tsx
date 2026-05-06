import type { LucideIcon } from "lucide-react";

export function AuthInput({
  id,
  label,
  type = "text",
  icon: Icon,
  autoComplete,
  required,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  id: string;
  label: string;
  type?: string;
  icon: LucideIcon;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-slate-400"
          strokeWidth={2}
          aria-hidden
        />
        <input
          id={id}
          name={id}
          type={type}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-brand-ink outline-none transition placeholder:text-slate-400 focus:border-brand-panel focus:ring-2 focus:ring-brand-panel/25"
        />
      </div>
    </div>
  );
}
