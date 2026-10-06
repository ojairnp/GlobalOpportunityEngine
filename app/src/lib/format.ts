// Formatters + helpers de presentación (nunca fabrican datos)
export const NA = "DATA UNAVAILABLE";

export function fmtNum(v: number | null | undefined, digits = 2): string {
  if (v == null || !Number.isFinite(v)) return NA;
  return v.toLocaleString("es-MX", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function fmtCompact(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return NA;
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + "K";
  return v.toFixed(2);
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return NA;
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export function fmtPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return NA;
  if (v >= 1000) return v.toLocaleString("es-MX", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toPrecision(3);
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function pctColor(v: number | null | undefined): string {
  if (v == null) return "text-muted-foreground";
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}

export function scoreColor(v: number | null | undefined): string {
  if (v == null) return "text-muted-foreground";
  if (v >= 75) return "text-emerald-400";
  if (v >= 55) return "text-amber-300";
  if (v >= 40) return "text-orange-400";
  return "text-red-400";
}

export const DECISION_STYLES: Record<string, { label: string; cls: string }> = {
  BUY_ZONE: { label: "ZONA DE COMPRA", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  WAIT_FOR_FLOOR: { label: "ESPERAR PISO", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  ACCUMULATION: { label: "ACUMULACIÓN", cls: "bg-blue-500/15 text-blue-300 border-blue-500/40" },
  WATCH_CATALYST: { label: "VIGILAR CATALIZADOR", cls: "bg-orange-500/15 text-orange-300 border-orange-500/40" },
  FOMO_EXTENDED: { label: "FOMO / EXTENDIDO", cls: "bg-red-500/15 text-red-300 border-red-500/40" },
  FUNDAMENTAL_RISK: { label: "RIESGO FUNDAMENTAL", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-400/40" },
  REJECT: { label: "DESCARTADO", cls: "bg-zinc-700/20 text-zinc-400 border-zinc-600/40" },
};

export const TECH_STATE_LABELS: Record<string, string> = {
  BASE: "BASE",
  ACCUMULATION: "ACUMULACIÓN",
  BREAKOUT: "RUPTURA",
  DISTRIBUTION: "DISTRIBUCIÓN",
  DOWNTREND: "BAJISTA",
  HIGH_VOLATILITY: "ALTA VOLATILIDAD",
  NO_TRADE: "NO TRADE",
};

export const SOURCE_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  OK: { label: "DATOS OK", cls: "text-emerald-400" },
  STALE: { label: "DATOS VIEJOS", cls: "text-amber-400" },
  PENDING: { label: "PENDIENTE", cls: "text-muted-foreground" },
  DATA_UNAVAILABLE: { label: "DATA UNAVAILABLE", cls: "text-red-400" },
  ERROR: { label: "ERROR", cls: "text-red-400" },
};

export const TYPE_LABELS: Record<string, string> = {
  equity: "ACCIÓN",
  crypto: "CRIPTO",
  commodity: "COMMODITY",
  fx: "FX",
  index: "ÍNDICE",
};
