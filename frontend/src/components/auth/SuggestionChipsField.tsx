"use client";

import type { LucideIcon } from "lucide-react";

type Props = {
  id: string;
  label: string;
  icon?: LucideIcon;
  required?: boolean;
  hint?: string;
  suggestions: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function parseSelected(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinSelected(items: string[]): string {
  return items.join(", ");
}

export function SuggestionChipsField({
  id,
  label,
  icon: Icon,
  required,
  hint,
  suggestions,
  value,
  onChange,
  className = "",
}: Props) {
  const selected = parseSelected(value);

  function toggle(suggestion: string) {
    const next = selected.includes(suggestion)
      ? selected.filter((s) => s !== suggestion)
      : [...selected, suggestion];
    onChange(joinSelected(next));
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {Icon ? <Icon className="h-4 w-4 text-brand-primary" aria-hidden /> : null}
        {label}
        {required ? <span className="text-red-600">*</span> : null}
      </label>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      <div
        id={id}
        role="group"
        aria-label={label}
        className="mt-2 flex flex-wrap gap-2"
      >
        {suggestions.map((suggestion) => {
          const active = selected.includes(suggestion);
          return (
            <button
              key={suggestion}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(suggestion)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                active
                  ? "border-brand-secondary/60 bg-brand-secondary/15 text-brand-ink shadow-sm ring-1 ring-brand-secondary/30"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-secondary/40 hover:bg-brand-secondary/5 hover:text-brand-ink"
              }`}
            >
              {suggestion}
            </button>
          );
        })}
      </div>
      {selected.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">
          {selected.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
