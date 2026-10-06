// ------------------------------------------------------------------
// SCORING / ENTRY / RISK / FOMO / DECISION ENGINE
// Reglas explícitas y auditables. Nunca inventa datos: los componentes
// sin información se excluyen y se reportan en payload.missing.
// ------------------------------------------------------------------

import { clamp } from "./indicators";
import { floorSignals, type TechnicalResult } from "./technical";

export interface ScoreBundle {
  technicalScore: number | null;
  entryScore: number | null;
  riskScore: number | null; // 0-100, mayor = más riesgo
  fomoScore: number | null; // 0-100, mayor = más FOMO/extensión
  earlyScore: number | null; // cripto: qué tan temprana es la oportunidad
  opportunityScore: number | null;
  asymmetryScore: number | null;
  decision: string;
  horizon: string;
  tacticalState: string | null;
  payload: Record<string, unknown>;
}

// ---- ENTRY SCORE: calidad de la entrada (separada de calidad del activo)
export function entryScoreOf(t: TechnicalResult, closes: number[]): number | null {
  if (!t.hasData || t.close == null || t.ema50 == null) return null;
  let s = 50;
  // Extensión sobre EMA50 en múltiplos de ATR: cerca = mejor entrada
  if (t.atr14 != null && t.atr14 > 0) {
    const ext = (t.close - t.ema50) / t.atr14;
    if (ext < -1) s += 6; // sobrevendido bajo la media
    else if (ext <= 1.5) s += 18; // zona de entrada
    else if (ext <= 3) s += 4;
    else s -= Math.min(25, (ext - 3) * 8); // extendido
  }
  if (t.rsi14 != null) {
    if (t.rsi14 >= 40 && t.rsi14 <= 60) s += 14;
    else if (t.rsi14 > 70) s -= 14;
    else if (t.rsi14 < 35) s += 4; // posible piso
  }
  s += floorSignals(t, closes).length * 4;
  if (t.pos52w != null) {
    if (t.pos52w < 40) s += 6;
    else if (t.pos52w > 90) s -= 10;
  }
  if (t.state === "HIGH_VOLATILITY") s -= 15;
  if (t.state === "DOWNTREND") s -= 10;
  return Math.round(clamp(s));
}

// ---- FOMO SCORE: detecta extensión parabólica / persecución
export function fomoScoreOf(t: TechnicalResult): number | null {
  if (!t.hasData || t.close == null) return null;
  let f = 0;
  if (t.atr14 != null && t.ema50 != null && t.atr14 > 0) {
    const ext = (t.close - t.ema50) / t.atr14; // extensión desde medias
    if (ext > 3) f += Math.min(40, (ext - 3) * 12);
  }
  if (t.rsi14 != null && t.rsi14 > 72) f += Math.min(25, (t.rsi14 - 72) * 2.5);
  if (t.perf1w != null && t.perf1w > 12) f += Math.min(20, (t.perf1w - 12) * 1.5);
  if (t.perf1m != null && t.perf1m > 30) f += 15;
  if (t.volumeRatio != null && t.volumeRatio > 2.5 && (t.perf1w ?? 0) > 8) f += 15; // spike de volumen en subida
  if (t.pos52w != null && t.pos52w > 95) f += 8;
  return Math.round(clamp(f));
}

// ---- RISK SCORE: volatilidad, drawdown desde máximos, ausencia de datos
export function riskScoreOf(t: TechnicalResult, assetType: string, fundamentalsAvailable: boolean): number | null {
  if (!t.hasData) return null;
  let r = assetType === "crypto" ? 55 : assetType === "equity" ? 40 : 45;
  if (t.atrPct != null) r += clamp((t.atrPct - 2) * 8, -10, 25);
  if (t.pos52w != null && t.pos52w < 20) r += 8; // cerca de mínimos = riesgo
  if (t.state === "HIGH_VOLATILITY") r += 15;
  if (t.state === "DOWNTREND") r += 8;
  if (!fundamentalsAvailable && assetType === "equity") r += 6; // riesgo por falta de verificación fundamental
  return Math.round(clamp(r, 5, 95));
}

// ---- EARLY SCORE (cripto): temprano vs FOMO usando cambios reales 24h/7d/mcap
export function earlyScoreOf(opts: {
  marketCap?: number | null;
  pct24h?: number | null;
  pct7d?: number | null;
  rank?: number | null;
}): number | null {
  const { marketCap, pct24h, pct7d, rank } = opts;
  if (marketCap == null && pct7d == null) return null;
  let s = 50;
  if (marketCap != null) {
    if (marketCap < 50_000_000) s += 25;
    else if (marketCap < 500_000_000) s += 15;
    else if (marketCap > 50_000_000_000) s -= 10;
  }
  if (rank != null && rank > 200) s += 10;
  // aceleración reciente sin extensión: 7d positivo moderado, 24h no parabólico
  if (pct7d != null) {
    if (pct7d > 3 && pct7d < 40) s += 15;
    else if (pct7d > 100) s -= 25; // ya extendido
  }
  if (pct24h != null && pct24h > 20) s -= 20; // pump del día = tarde
  return Math.round(clamp(s));
}

// ---- TACTICAL STATE (CFD / commodities / FX / índices)
export function tacticalStateOf(t: TechnicalResult): string | null {
  if (!t.hasData) return null;
  if (t.state === "HIGH_VOLATILITY") return "HIGH_VOLATILITY";
  if (t.state === "NO_TRADE") return "NO_TRADE";
  if (t.state === "BREAKOUT") return "BREAKOUT";
  const bull = t.close != null && t.ema20 != null && t.ema50 != null && t.close > t.ema20 && t.ema20 > t.ema50;
  const bear = t.close != null && t.ema20 != null && t.ema50 != null && t.close < t.ema20 && t.ema20 < t.ema50;
  const momUp = (t.macdHist ?? 0) > 0 && (t.rsi14 ?? 50) > 55;
  const momDown = (t.macdHist ?? 0) < 0 && (t.rsi14 ?? 50) < 45;
  if (bull && momUp) return "STRONG_LONG";
  if (bull) return "LONG_WATCH";
  if (bear && momDown) return "STRONG_SHORT";
  if (bear) return "SHORT_WATCH";
  if (t.rsi14 != null && t.rsi14 < 32 && (t.pos52w ?? 50) < 25) return "MEAN_REVERSION";
  return "NO_TRADE";
}

// ---- FAIR VALUE técnico (BEAR / BASE / BULL) — supuestos explícitos
export function fairValueScenarios(t: TechnicalResult): { bear: number | null; base: number | null; bull: number | null; assumptions: string } {
  if (!t.hasData || t.close == null || t.atr14 == null) {
    return { bear: null, base: null, bull: null, assumptions: "Sin datos suficientes para escenarios (DATA UNAVAILABLE)." };
  }
  const atr = t.atr14;
  const drift3m = t.perf3m != null ? t.perf3m / 100 : 0;
  const base = t.close * (1 + drift3m * 0.5);
  return {
    bear: t.close - 6 * atr,
    base,
    bull: base + 8 * atr,
    assumptions:
      "Modelo técnico (no DCF): BEAR = precio − 6×ATR(14); BASE = proyección de la mitad del momentum de 3M; BULL = BASE + 8×ATR(14). Horizonte ~3-6 meses. Sin fundamentales verificables, estos escenarios miden rango probable, no valor intrínseco.",
  };
}

// ---- ASYMMETRY: upside/downside desde escenarios + calidad de entrada
export function asymmetryScoreOf(fv: { bear: number | null; bull: number | null }, close: number | null, entry: number | null, fomo: number | null): number | null {
  if (fv.bear == null || fv.bull == null || close == null || close <= 0) return null;
  const up = (fv.bull - close) / close;
  const down = (close - fv.bear) / close;
  if (down <= 0) return null;
  const ratio = up / down;
  let s = clamp(50 + (ratio - 1) * 35);
  if (entry != null) s += (entry - 50) * 0.3;
  if (fomo != null) s -= fomo * 0.3;
  return Math.round(clamp(s));
}

// ---- DECISION FINAL
export function decide(input: {
  t: TechnicalResult;
  closes: number[];
  entry: number | null;
  fomo: number | null;
  risk: number | null;
  assetType: string;
  hasFundamentals: boolean;
}): { decision: string; horizon: string } {
  const { t, entry, fomo, risk, assetType } = input;
  if (!t.hasData) return { decision: "REJECT", horizon: "SWING" };
  const horizon = assetType === "crypto" || assetType === "commodity" || assetType === "fx" ? "TACTICAL" : "POSITION";
  if ((fomo ?? 0) >= 55) return { decision: "FOMO_EXTENDED", horizon };
  if ((risk ?? 0) >= 80) return { decision: "FUNDAMENTAL_RISK", horizon };
  if (t.state === "NO_TRADE" || t.state === "HIGH_VOLATILITY") return { decision: "REJECT", horizon };
  if (t.state === "DOWNTREND") {
    const floors = floorSignals(t, input.closes).length;
    return { decision: floors >= 2 ? "WAIT_FOR_FLOOR" : "REJECT", horizon };
  }
  if (t.state === "DISTRIBUTION") return { decision: "WAIT_FOR_FLOOR", horizon };
  if ((entry ?? 0) >= 62 && (t.state === "BREAKOUT" || t.state === "ACCUMULATION")) return { decision: "BUY_ZONE", horizon };
  if (t.state === "BASE" || t.state === "ACCUMULATION") return { decision: "ACCUMULATION", horizon };
  return { decision: "WATCH_CATALYST", horizon };
}

// ---- OPPORTUNITY SCORE global (pesos renormalizados con datos disponibles)
export function opportunityScoreOf(parts: {
  technical: number | null;
  entry: number | null;
  fomo: number | null;
  risk: number | null;
  fundamental: number | null;
  valuation: number | null;
  early: number | null;
}): { score: number | null; missing: string[] } {
  const components: { key: string; value: number; weight: number }[] = [];
  const missing: string[] = [];
  const add = (key: string, v: number | null, weight: number) => {
    if (v == null) missing.push(key);
    else components.push({ key, value: v, weight });
  };
  add("technical", parts.technical, 0.25);
  add("entry", parts.entry, 0.25);
  add("fundamental", parts.fundamental, 0.2);
  add("valuation", parts.valuation, 0.1);
  if (parts.early != null) add("early", parts.early, 0.2);
  if (parts.fomo != null) components.push({ key: "fomo_inv", value: 100 - parts.fomo, weight: 0.1 });
  if (parts.risk != null) components.push({ key: "risk_inv", value: 100 - parts.risk, weight: 0.1 });
  if (components.length === 0) return { score: null, missing };
  const wsum = components.reduce((a, c) => a + c.weight, 0);
  const score = components.reduce((a, c) => a + c.value * c.weight, 0) / wsum;
  return { score: Math.round(clamp(score)), missing };
}

export function computeScores(assetType: string, t: TechnicalResult, closes: number[], extra?: {
  marketCap?: number | null; pct24h?: number | null; pct7d?: number | null; rank?: number | null;
  hasFundamentals?: boolean;
}): ScoreBundle {
  const hasFund = extra?.hasFundamentals ?? false;
  const technical = technicalScoreOfSafe(t);
  const entry = entryScoreOf(t, closes);
  const fomo = fomoScoreOf(t);
  const risk = riskScoreOf(t, assetType, hasFund);
  const early = assetType === "crypto" ? earlyScoreOf(extra ?? {}) : null;
  const fv = fairValueScenarios(t);
  const asymmetry = asymmetryScoreOf(fv, t.close, entry, fomo);
  const tactical = assetType === "equity" ? null : tacticalStateOf(t);
  const { decision, horizon } = decide({ t, closes, entry, fomo, risk, assetType, hasFundamentals: hasFund });
  const opp = opportunityScoreOf({
    technical, entry, fomo, risk,
    fundamental: null, valuation: null,
    early: assetType === "crypto" ? early : null,
  });
  return {
    technicalScore: technical,
    entryScore: entry,
    riskScore: risk,
    fomoScore: fomo,
    earlyScore: early,
    opportunityScore: opp.score,
    asymmetryScore: asymmetry,
    decision,
    horizon,
    tacticalState: tactical,
    payload: {
      missingComponents: opp.missing,
      floorSignals: floorSignals(t, closes),
      fairValue: fv,
      dataNote:
        "Fundamentales profundos (ingresos, EPS, backlog, guidance) no disponibles en fuentes gratuitas para este activo: FUNDAMENTAL/VALUATION SCORE = DATA UNAVAILABLE. El Opportunity Score renormaliza pesos solo con componentes verificables.",
    },
  };
}

import { technicalScoreOf } from "./technical";
function technicalScoreOfSafe(t: TechnicalResult) {
  return technicalScoreOf(t);
}
