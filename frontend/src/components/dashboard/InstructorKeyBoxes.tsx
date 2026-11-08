"use client";

import { BookOpen, GraduationCap, Users, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { formatMoney, formatMoneyCompact } from "@/lib/format-money";

export type InstructorKeyBox = {
  id: string;
  label: string;
  hint: string;
  href: string;
  kind: "int" | "money";
  value: number;
  featured?: boolean;
};

const ICONS: Record<string, LucideIcon> = {
  courses: BookOpen,
  enrollments: GraduationCap,
  learners: Users,
  revenue: Wallet,
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start == null) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, target]);

  return value;
}

function BoxValue({ kind, value }: { kind: "int" | "money"; value: number }) {
  const shown = useCountUp(value);
  if (kind === "money") {
    return (
      <p className="mt-3 text-[1.85rem] font-extrabold tabular-nums tracking-tight text-inherit sm:text-[2rem]" title={formatMoney(value)}>
        {formatMoneyCompact(shown)}
      </p>
    );
  }
  return (
    <p className="mt-3 text-[1.85rem] font-extrabold tabular-nums tracking-tight text-inherit sm:text-[2rem]">{shown.toLocaleString()}</p>
  );
}

export function InstructorKeyBoxes({ items }: { items: InstructorKeyBox[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const Icon = ICONS[item.id] ?? BookOpen;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`group relative overflow-hidden rounded-[5px] border px-5 py-5 transition duration-300 ease-out animate-fade-up hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(16,36,79,0.12)] ${
              item.featured
                ? "border-brand-accent/20 bg-[#10244F] text-white hover:border-brand-accent"
                : "border-brand-ink/10 bg-white hover:border-brand-accent/35 dark:border-white/10 dark:bg-[#10192f]"
            }`}
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span
              className={`pointer-events-none absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-brand-accent transition duration-300 group-hover:scale-y-100 ${
                item.featured ? "bg-[#7eb6ff]" : ""
              }`}
            />
            <span className="flex items-start justify-between gap-3">
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-[5px] transition duration-300 group-hover:scale-110 ${
                  item.featured ? "bg-white/10 text-white" : "bg-brand-sky text-brand-accent dark:bg-white/10"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-[0.16em] ${item.featured ? "text-white/55" : "text-[#011B33]/40"}`}>
                {item.label}
              </span>
            </span>
            <BoxValue kind={item.kind} value={item.value} />
            <p className={`mt-1.5 text-sm ${item.featured ? "text-white/70" : "text-[#011B33]/55"}`}>{item.hint}</p>
          </Link>
        );
      })}
    </section>
  );
}

export function instructorOverviewBoxes(totals: {
  total_courses: number;
  total_enrollments: number;
  unique_learners: number;
  revenue_completed_cents: number;
}): InstructorKeyBox[] {
  return [
    {
      id: "courses",
      label: "Courses",
      hint: "In your studio",
      href: "/instructor/studio",
      kind: "int",
      value: totals.total_courses,
    },
    {
      id: "enrollments",
      label: "Enrollments",
      hint: "Across every course",
      href: "/instructor/students",
      kind: "int",
      value: totals.total_enrollments,
    },
    {
      id: "learners",
      label: "Learners",
      hint: "Unique students",
      href: "/instructor/students",
      kind: "int",
      value: totals.unique_learners,
    },
    {
      id: "revenue",
      label: "Revenue",
      hint: "Completed payments",
      href: "/instructor/earnings",
      kind: "money",
      value: totals.revenue_completed_cents,
      featured: true,
    },
  ];
}
