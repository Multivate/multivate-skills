"use client";

import { PersonMark } from "@/components/dashboard/PersonMark";

type PersonRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  instructor: "Instructor",
  mentor: "Mentor",
  admin: "Admin",
};

const ROLE_PILL: Record<string, string> = {
  student: "bg-[#E7F1FC] text-[#1457D0]",
  instructor: "bg-[#EEE9FF] text-[#5B45D6]",
  mentor: "bg-[#E5F6EC] text-[#1F8A4C]",
  admin: "bg-[#FFF1E4] text-[#C56A1A]",
};

const EDUCATION: Record<string, string> = {
  secondary: "Secondary school",
  vocational: "Vocational / technical training",
  bachelors: "Bachelor's degree",
  masters: "Master's degree",
  phd: "Doctorate / PhD",
  other: "Other",
};

const WEEKLY: Record<string, string> = {
  under5: "Under 5 hours",
  "5to10": "5–10 hours",
  "10to15": "10–15 hours",
  "15plus": "15+ hours",
};

const YEARS: Record<string, string> = {
  under3: "Under 3 years",
  "3to5": "3–5 years",
  "5to10": "5–10 years",
  "10plus": "10+ years",
};

const LANGUAGE: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
};

export function profileLabel(kind: "education" | "weekly" | "years" | "language", value: string | null) {
  if (!value) return value;
  if (kind === "education") return EDUCATION[value] ?? value;
  if (kind === "weekly") return WEEKLY[value] ?? value;
  if (kind === "years") return YEARS[value] ?? value;
  const spoken = value.match(/^(Learn|Teach) with ([a-z]{2})$/i);
  if (spoken && LANGUAGE[spoken[2].toLowerCase()]) return `${spoken[1]} with ${LANGUAGE[spoken[2].toLowerCase()]}`;
  const note = value.match(/^learn_with:([a-z]{2})$/i);
  if (note) return LANGUAGE[note[1]] ?? value;
  return value;
}

function timeAgo(value: string) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminPeopleTable({
  rows,
  empty,
  showRole = true,
}: {
  rows: PersonRow[];
  empty: string;
  showRole?: boolean;
}) {
  return (
    <section className="admin-card overflow-hidden rounded-2xl">
      <p className="admin-muted px-5 py-4 text-sm">
        {rows.length} {rows.length === 1 ? "person" : "people"}
      </p>
      {rows.length === 0 ? (
        <p className="admin-muted px-5 pb-6 text-sm">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="admin-muted border-y border-[var(--admin-line)] text-[11px] font-semibold uppercase tracking-[0.12em]">
                <th className="px-5 py-2 font-semibold">Person</th>
                {showRole ? <th className="px-3 py-2 font-semibold">Role</th> : null}
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-5 py-2 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--admin-line)] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <PersonMark name={row.name || row.email} className="h-9 w-9 text-xs" />
                      <span className="font-semibold">{row.name}</span>
                    </div>
                  </td>
                  {showRole ? (
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_PILL[row.role] ?? "bg-[#E7F1FC] text-[#1457D0]"}`}>
                        {ROLE_LABEL[row.role] ?? row.role}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.is_active ? "bg-[#E5F6EC] text-[#1F8A4C]" : "bg-[#FDECEC] text-[#C2414A]"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="admin-muted px-3 py-3">{row.email}</td>
                  <td className="admin-muted px-5 py-3">{timeAgo(row.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Answer({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
  if (value == null || value.trim() === "") return null;
  return (
    <div className={`rounded-xl bg-[var(--admin-soft,#e7f1fc)] px-4 py-3 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="admin-muted text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

type ProfileCard = {
  user_id: string;
  user_name: string;
  user_email: string;
  updated_at: string;
  answers: { label: string; value: string | null; wide?: boolean }[];
};

export function AdminProfileCards({ rows, empty }: { rows: ProfileCard[]; empty: string }) {
  if (rows.length === 0) {
    return (
      <section className="admin-card rounded-2xl px-5 py-8">
        <p className="admin-muted text-sm">{empty}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <article key={row.user_id} className="admin-card rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <PersonMark name={row.user_name || row.user_email} className="h-12 w-12 text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{row.user_name}</p>
              <p className="admin-muted truncate text-sm">{row.user_email}</p>
            </div>
            <p className="admin-muted text-xs">Updated {timeAgo(row.updated_at)}</p>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {row.answers.map((answer) => (
              <Answer key={answer.label} label={answer.label} value={answer.value} wide={answer.wide} />
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}
