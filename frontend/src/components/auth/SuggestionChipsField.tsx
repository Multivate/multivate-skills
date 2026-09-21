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
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
        {Icon ? <Icon className="h-4 w-4 text-brand-accent" aria-hidden /> : null}
        {label}
        {required ? <span className="text-red-600">*</span> : null}
      </label>
      {hint ? <p className="mt-1 text-sm text-brand-ink/55">{hint}</p> : null}
      <div id={id} role="group" aria-label={label} className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => {
          const active = selected.includes(suggestion);
          return (
            <button
              key={suggestion}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(suggestion)}
              className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? "border-brand-navy bg-brand-navy text-brand-paper"
                  : "border-brand-ink/15 bg-white text-brand-ink/80 hover:border-brand-navy/40 hover:text-brand-ink"
              }`}
            >
              {suggestion}
            </button>
          );
        })}
      </div>
    </div>
  );
}
