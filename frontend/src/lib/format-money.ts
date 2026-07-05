function trimTrailingZero(value: string): string {
  return value.replace(/\.0$/, "");
}

export function formatMoneyCompact(cents: number, currency = "NGN"): string {
  const amount = cents / 100;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const compact = trimTrailingZero((abs / 1_000_000_000).toFixed(1));
    return `${sign}${currency} ${compact}B`;
  }
  if (abs >= 1_000_000) {
    const compact = trimTrailingZero((abs / 1_000_000).toFixed(1));
    return `${sign}${currency} ${compact}M`;
  }
  if (abs >= 1_000) {
    const compact = trimTrailingZero((abs / 1_000).toFixed(1));
    return `${sign}${currency} ${compact}K`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoney(cents: number, currency = "NGN"): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}
