"use client";

import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useId, useState } from "react";

export function PasswordField({
  label,
  autoComplete,
  required,
  value,
  onChange,
  placeholder,
  icon: Icon = Lock,
  variant = "default",
}: {
  label: string;
  autoComplete?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  variant?: "default" | "console";
}) {
  const baseId = useId();
  const id = `${baseId}-pw`;
  const [show, setShow] = useState(false);

  const consoleField = variant === "console";

  return (
    <div>
      <label htmlFor={id} className={`block text-sm font-semibold ${consoleField ? "admin-ink" : "text-brand-ink"}`}>
        {label}
      </label>
      <div className="relative mt-1.5">
        <Icon
          className={`pointer-events-none absolute left-3.5 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2 ${consoleField ? "admin-muted" : "text-brand-ink/40"}`}
          strokeWidth={2}
          aria-hidden
        />
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={
            consoleField
              ? "w-full rounded-lg border border-[var(--admin-line,#e3ebf5)] bg-[var(--admin-bg,#fff)] py-3 pl-11 pr-12 text-sm admin-ink outline-none transition placeholder:text-[var(--admin-muted,rgba(16,36,79,0.4))] focus:border-[#1457D0] focus:ring-2 focus:ring-[#1457D0]/25"
              : "w-full rounded-md border border-brand-ink/15 bg-brand-surface py-3 pl-11 pr-12 text-sm text-brand-ink outline-none transition placeholder:text-brand-ink/40 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          }
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md transition ${consoleField ? "admin-muted hover:bg-[var(--admin-soft,#e7f1fc)]" : "text-brand-ink/50 hover:bg-brand-muted hover:text-brand-ink"}`}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
