import type { InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export function AuthInput({
  id,
  label,
  type = "text",
  icon: Icon,
  autoComplete,
  inputMode,
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
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-brand-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 text-neutral-400"
          strokeWidth={2}
          aria-hidden
        />
        <input
          id={id}
          name={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-brand-ink/15 bg-brand-surface py-3 pl-11 pr-4 text-sm text-brand-ink outline-none transition placeholder:text-brand-ink/40 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
        />
      </div>
    </div>
  );
}
