"use client";

import { DonutChart } from "@/components/dashboard/admin-analytics-charts";
import { Loader2, Plus, Tag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readApiError } from "@/lib/api-error";

type DiscountRow = {
  id: string;
  code: string;
  label: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  course_id: string | null;
  course_title: string | null;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

function formatDiscount(row: DiscountRow) {
  if (row.discount_type === "percent") return `${row.discount_value}% off`;
  return `₦${(row.discount_value / 100).toLocaleString("en-NG")} off`;
}

const formLabelClass = "block text-sm font-semibold admin-ink";
const formInputClass =
  "mt-1.5 w-full rounded-lg border border-[var(--admin-line)] bg-[var(--admin-bg)] px-4 py-2.5 text-sm admin-ink outline-none placeholder:text-[var(--admin-muted)] focus:border-[#1457D0] focus:ring-2 focus:ring-[#1457D0]/25";

export function AdminDiscountCodes() {
  const [rows, setRows] = useState<DiscountRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState(10);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/discount-codes", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(readApiError(data, "We couldn't load discount codes."));
      setRows([]);
      return;
    }
    setRows(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        label: label.trim() || null,
        discount_type: discountType,
        discount_value: discountValue,
        max_uses_per_user: 1,
        is_active: true,
      };
      if (code.trim()) body.code = code.trim().toUpperCase();
      if (maxUses.trim()) body.max_uses = Number(maxUses);
      if (expiresAt) body.expires_at = new Date(expiresAt).toISOString();

      const res = await fetch("/api/admin/discount-codes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "We couldn't create that code."));
        return;
      }
      setMsg(`Code created: ${(data as DiscountRow).code}`);
      setShowForm(false);
      setLabel("");
      setCode("");
      setDiscountValue(10);
      setMaxUses("");
      setExpiresAt("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: DiscountRow) {
    setBusy(true);
    setErr(null);
    try {
      const action = row.is_active ? "deactivate" : "activate";
      const res = await fetch(`/api/admin/discount-codes/${encodeURIComponent(row.id)}/${action}`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(readApiError(data, "We couldn't update that code."));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) {
    return <p className="admin-muted text-sm">Loading discount codes…</p>;
  }

  const activeCount = rows.filter((row) => row.is_active).length;
  const inactiveCount = rows.length - activeCount;
  const usedTotal = rows.reduce((sum, row) => sum + row.used_count, 0);
  const showStatus = activeCount > 0 && inactiveCount > 0;
  const usedRows = rows.filter((row) => row.used_count > 0).sort((a, b) => b.used_count - a.used_count);
  const usedMax = Math.max(...usedRows.map((row) => row.used_count), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="admin-muted text-sm">Students enter these at checkout.</p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E3F9E]"
        >
          <Plus className="h-4 w-4" />
          New code
        </button>
      </div>

      {showStatus || usedRows.length > 0 ? (
        <div className={`grid gap-4 ${showStatus && usedRows.length > 0 ? "xl:grid-cols-2" : ""}`}>
          {showStatus ? (
            <section className="admin-card rounded-2xl p-5 sm:p-6">
              <h2 className="text-base font-semibold">Active and paused</h2>
              <div className="mt-4">
                <DonutChart
                  segments={[
                    { label: "Active", value: activeCount, color: "#1F8A4C" },
                    { label: "Inactive", value: inactiveCount, color: "#A56B00" },
                  ]}
                  centerLabel={String(rows.length)}
                />
              </div>
            </section>
          ) : null}
          {usedRows.length > 0 ? (
            <section className="admin-card rounded-2xl p-5 sm:p-6">
              <h2 className="text-base font-semibold">Codes that have been used</h2>
              <p className="admin-muted mt-1 text-xs">{usedTotal} redemption{usedTotal === 1 ? "" : "s"}</p>
              <ul className="mt-4 space-y-3">
                {usedRows.map((row) => (
                  <li key={row.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="font-mono font-semibold">{row.code}</span>
                      <span className="tabular-nums">
                        {row.used_count}
                        {row.max_uses != null ? ` / ${row.max_uses}` : ""}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--admin-soft)]">
                      <div
                        className="h-full rounded-full bg-[#1457D0]"
                        style={{ width: `${Math.max(8, Math.round((row.used_count / usedMax) * 100))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {msg ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {err}
        </p>
      ) : null}

      {showForm ? (
        <form onSubmit={(e) => void createCode(e)} className="admin-card rounded-2xl p-6">
          <h2 className="text-base font-semibold">Create a discount code</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={formLabelClass}>
              Label (optional)
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Launch week"
                className={formInputClass}
              />
            </label>
            <label className={formLabelClass}>
              Code (leave blank to auto-generate)
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SAVE20"
                className={`${formInputClass} font-mono uppercase`}
              />
            </label>
            <label className={formLabelClass}>
              Discount type
              <select
                value={discountType}
                onChange={(e) => {
                  const next = e.target.value as "percent" | "fixed";
                  setDiscountType(next);
                  setDiscountValue(next === "fixed" ? 100000 : 10);
                }}
                className={formInputClass}
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off (NGN)</option>
              </select>
            </label>
            <label className={formLabelClass}>
              {discountType === "percent" ? "Percent (1-100)" : "Amount off (NGN)"}
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={discountType === "percent" ? 100 : undefined}
                value={discountType === "fixed" ? Math.round(discountValue / 100) || "" : discountValue || ""}
                onChange={(e) => {
                  const n = Number(e.target.value) || 0;
                  setDiscountValue(discountType === "fixed" ? Math.max(0, Math.round(n) * 100) : n);
                }}
                className={formInputClass}
              />
            </label>
            <label className={formLabelClass}>
              Max total uses (optional)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className={formInputClass}
              />
            </label>
            <label className={formLabelClass}>
              Expires on (optional)
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={formInputClass}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1457D0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0E3F9E] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create code
          </button>
        </form>
      ) : null}

      <div className="admin-card overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="admin-muted border-b border-[var(--admin-line)] text-[11px] font-semibold uppercase tracking-[0.12em]">
              <th className="px-5 py-3 font-semibold">Code</th>
              <th className="px-3 py-3 font-semibold">Discount</th>
              <th className="px-3 py-3 font-semibold">Uses</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-muted px-5 py-10 text-center">
                  No discount codes yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-[var(--admin-line)] last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-[#1457D0]" />
                      <div>
                        <p className="font-mono font-semibold">{row.code}</p>
                        {row.label ? <p className="admin-muted text-xs">{row.label}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-semibold">{formatDiscount(row)}</td>
                  <td className="admin-muted px-3 py-3">
                    {row.used_count}
                    {row.max_uses != null ? ` / ${row.max_uses}` : " / ∞"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        row.is_active ? "bg-[#E5F6EC] text-[#1F8A4C]" : "bg-[#FFF4DE] text-[#A56B00]"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(row)}
                      className="text-sm font-semibold text-[#1457D0] disabled:opacity-60"
                    >
                      {row.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
