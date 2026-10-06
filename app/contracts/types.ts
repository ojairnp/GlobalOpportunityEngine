export * from "./errors";

// ============================================================
// GLOBAL OPPORTUNITY ENGINE — shared contracts (frontend ↔ backend)
// ============================================================

export const ASSET_TYPES = ["equity", "crypto", "commodity", "fx", "index"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  equity: "Acciones",
  crypto: "Cripto",
  commodity: "Commodities",
  fx: "Divisas",
  index: "Índices",
};

// Technical states (Technical Engine)
export const TECHNICAL_STATES = [
  "BASE",
  "ACCUMULATION",
  "BREAKOUT",
  "DISTRIBUTION",
  "DOWNTREND",
  "HIGH_VOLATILITY",
  "NO_TRADE",
] as const;
export type TechnicalState = (typeof TECHNICAL_STATES)[number];

// Entry states (Entry Engine)
export const ENTRY_STATES = [
  "BUY_ZONE",
  "WAIT_FOR_FLOOR",
  "ACCUMULATION",
  "WATCH_CATALYST",
  "EXTENDED",
  "FOMO",
  "NO_ENTRY",
] as const;
export type EntryState = (typeof ENTRY_STATES)[number];

// Final decisions (Final Equity Decision)
export const DECISIONS = [
  "BUY_ZONE",
  "WAIT_FOR_FLOOR",
  "ACCUMULATION",
  "WATCH_CATALYST",
  "FOMO_EXTENDED",
  "FUNDAMENTAL_RISK",
  "REJECT",
] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_META: Record<Decision, { label: string; color: string; dot: string }> = {
  BUY_ZONE: { label: "ZONA DE COMPRA", color: "#34d399", dot: "🟢" },
  WAIT_FOR_FLOOR: { label: "ESPERAR PISO", color: "#fbbf24", dot: "🟡" },
  ACCUMULATION: { label: "ACUMULACIÓN", color: "#60a5fa", dot: "🔵" },
  WATCH_CATALYST: { label: "VIGILAR CATALIZADOR", color: "#fb923c", dot: "🟠" },
  FOMO_EXTENDED: { label: "FOMO / EXTENDIDO", color: "#f87171", dot: "🔴" },
  FUNDAMENTAL_RISK: { label: "RIESGO FUNDAMENTAL", color: "#a1a1aa", dot: "⚫" },
  REJECT: { label: "DESCARTADO", color: "#71717a", dot: "❌" },
};

// Crypto FOMO states
export const CRYPTO_FOMO_STATES = ["EARLY", "ACCEPTABLE", "EXTENDED", "FOMO", "NO_CHASE"] as const;
export type CryptoFomoState = (typeof CRYPTO_FOMO_STATES)[number];

// Tactical states (CFD / Tactical Radar)
export const TACTICAL_STATES = [
  "STRONG_LONG",
  "LONG_WATCH",
  "STRONG_SHORT",
  "SHORT_WATCH",
  "BREAKOUT",
  "MEAN_REVERSION",
  "HIGH_VOLATILITY",
  "NO_TRADE",
] as const;
export type TacticalState = (typeof TACTICAL_STATES)[number];

// Data source status — verifiability principle
export const SOURCE_STATUSES = ["OK", "STALE", "DATA_UNAVAILABLE", "PENDING", "ERROR"] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const HORIZONS = ["TACTICAL", "SWING", "POSITION", "LONG"] as const;
export type Horizon = (typeof HORIZONS)[number];

export const CONFIDENCE_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const DATA_UNAVAILABLE = "DATA UNAVAILABLE";
