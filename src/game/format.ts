const SUFFIXES = [
  "",
  "K",
  "M",
  "B",
  "T",
  "Qa",
  "Qi",
  "Sx",
  "Sp",
  "Oc",
  "No",
  "Dc",
  "UDc",
  "DDc",
  "TDc",
  "QaDc",
  "QiDc",
];

/** Format a token-ish quantity: 1.23K, 4.5M, … then scientific past the list. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return "∞";
  if (n < 0) return "-" + fmt(-n);
  if (n < 1000) {
    return Number.isInteger(n) ? n.toString() : n.toFixed(1);
  }
  const tier = Math.floor(Math.log10(n) / 3);
  if (tier < SUFFIXES.length) {
    const scaled = n / Math.pow(10, tier * 3);
    const str = scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(2);
    return `${str}${SUFFIXES[tier]}`;
  }
  return n.toExponential(2).replace("e+", "e");
}

/** Whole-number formatting with thin separators (for counts). */
export function fmtInt(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}

/** Compact rate, e.g. "1.3K Tk/s". */
export function fmtRate(n: number): string {
  return `${fmt(n)} Tk/s`;
}

export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
