"use client";

import { Loader2, Plus, Sparkles, Tag } from "lucide-react";
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

const formLabelClass = "block text-sm font-semibold text-slate-800 dark:text-slate-200";
const formInputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-brand-ink outline-none placeholder:text-slate-400 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";

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
    return <p className="text-sm text-slate-600">Loading discount codes…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 px-4 py-3 text-sm text-slate-700 dark:border-brand-accent/25 dark:bg-brand-accent/10 dark:text-slate-300">
            Create codes students can use at checkout. Share the code by email, social, or campaigns.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary-brand inline-flex !min-w-0 items-center gap-2 !py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" />
          New code
        </button>
      </div>

      {msg ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {err}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={(e) => void createCode(e)}
          className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-brand-ink dark:text-slate-100">
            <Sparkles className="h-5 w-5 text-brand-accent" />
            Create a discount code
          </h2>
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
                onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                className={formInputClass}
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off (kobo)</option>
              </select>
            </label>
            <label className={formLabelClass}>
              {discountType === "percent" ? "Percent (1–100)" : "Amount off in kobo"}
              <input
                type="number"
                min={1}
                max={discountType === "percent" ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                className={formInputClass}
              />
            </label>
            <label className={formLabelClass}>
              Max total uses (optional)
              <input
                type="number"
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
            className="btn-primary-brand mt-5 inline-flex !min-w-0 items-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create code
          </button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                  No discount codes yet. Create one to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-brand-accent" />
                      <div>
                        <p className="font-mono font-bold text-brand-ink dark:text-slate-100">{row.code}</p>
                        {row.label ? <p className="text-xs text-slate-500 dark:text-slate-400">{row.label}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{formatDiscount(row)}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {row.used_count}
                    {row.max_uses != null ? ` / ${row.max_uses}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        row.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {row.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleActive(row)}
                      className="text-sm font-semibold text-brand-primary hover:underline disabled:opacity-60"
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
