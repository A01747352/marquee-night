/** Formats a score with a real minus sign (U+2212), e.g. −300. */
export function formatScore(n: number): string {
  return n < 0 ? `−${Math.abs(n).toLocaleString("en-US")}` : n.toLocaleString("en-US");
}

/** Formats a score change with an explicit sign: +400, −400, ±0. */
export function formatDelta(n: number): string {
  if (n === 0) return "±0";
  return n > 0 ? `+${n.toLocaleString("en-US")}` : formatScore(n);
}

/** Formats milliseconds as m:ss, rounding up so "0:01" shows until time is out. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
