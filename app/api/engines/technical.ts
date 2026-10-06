// ------------------------------------------------------------------
// TECHNICAL ENGINE — snapshot + clasificación de estado
// Estados: BASE, ACCUMULATION, BREAKOUT, DISTRIBUTION, DOWNTREND,
//          HIGH_VOLATILITY, NO_TRADE
// ------------------------------------------------------------------

import { sma, ema, rsi, rsiSeries, macd, atr, pctChange, clamp, type Ohlcv } from "./indicators";

export interface TechnicalResult {
  asOf: Date;
  close: number | null;
  ema20: number | null;
  ema50: number | null;
  sma100: number | null;
  sma200: number | null;
  rsi14: number | null;
  rsiPrev5: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  macdHistPrev: number | null;
  atr14: number | null;
  atrPct: number | null;
  avgVol20: number | null;
  volumeRatio: number | null;
  high52w: number | null;
  low52w: number | null;
  pos52w: number | null;
  perf1w: number | null;
  perf1m: number | null;
  perf3m: number | null;
  perf6m: number | null;
  perf1y: number | null;
  state: string;
  hasData: boolean;
}

const MIN_BARS = 30;

export function computeTechnical(bars: Ohlcv[]): TechnicalResult {
  const empty: TechnicalResult = {
    asOf: new Date(), close: null, ema20: null, ema50: null, sma100: null, sma200: null,
    rsi14: null, rsiPrev5: null, macd: null, macdSignal: null, macdHist: null, macdHistPrev: null,
    atr14: null, atrPct: null, avgVol20: null, volumeRatio: null,
    high52w: null, low52w: null, pos52w: null,
    perf1w: null, perf1m: null, perf3m: null, perf6m: null, perf1y: null,
    state: "NO_TRADE", hasData: false,
  };
  if (!bars || bars.length < MIN_BARS) return empty;

  const closes = bars.map((b) => b.close);
  const vols = bars.map((b) => b.volume ?? 0);
  const close = closes[closes.length - 1];
  const a = atr(bars, 14);
  const m = macd(closes);
  const rs = rsiSeries(closes, 14);
  const hi52 = Math.max(...closes.slice(-252));
  const lo52 = Math.min(...closes.slice(-252));
  const avgVol20 = sma(vols, 20);
  const lastVol = vols[vols.length - 1];
  const macdHistSeries: (number | null)[] = [];
  // histograma previo para detectar mejora
  if (closes.length > 40) {
    const prev = macd(closes.slice(0, -5));
    macdHistSeries.push(prev.hist);
  }

  const out: TechnicalResult = {
    asOf: bars[bars.length - 1].date,
    close,
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    sma100: sma(closes, 100),
    sma200: sma(closes, 200),
    rsi14: rsi(closes, 14),
    rsiPrev5: rs.length > 5 ? rs[rs.length - 6] : null,
    macd: m.macd,
    macdSignal: m.signal,
    macdHist: m.hist,
    macdHistPrev: macdHistSeries[0] ?? null,
    atr14: a,
    atrPct: a != null && close ? (a / close) * 100 : null,
    avgVol20,
    volumeRatio: avgVol20 && lastVol ? lastVol / avgVol20 : null,
    high52w: hi52,
    low52w: lo52,
    pos52w: hi52 > lo52 ? ((close - lo52) / (hi52 - lo52)) * 100 : null,
    perf1w: pctChange(closes, 5),
    perf1m: pctChange(closes, 21),
    perf3m: pctChange(closes, 63),
    perf6m: pctChange(closes, 126),
    perf1y: pctChange(closes, 252),
    state: "NO_TRADE",
    hasData: true,
  };

  out.state = classifyState(out);
  return out;
}

function classifyState(t: Omit<TechnicalResult, "state" | "hasData">): string {
  const { close, ema20, ema50, sma200, rsi14, atrPct, volumeRatio, pos52w, perf1m, macdHist, macdHistPrev } = t;
  if (close == null || ema20 == null || ema50 == null) return "NO_TRADE";

  // Alta volatilidad domina el resto
  if (atrPct != null && atrPct > 7) return "HIGH_VOLATILITY";

  const aboveEma20 = close > ema20;
  const aboveEma50 = close > ema50;
  const emaAlign = ema20 > ema50;
  const aboveSma200 = sma200 != null ? close > sma200 : null;

  // BREAKOUT: cerca de máximos 52w + volumen expandiendo + momentum positivo
  if (pos52w != null && pos52w > 92 && (volumeRatio ?? 0) > 1.4 && (perf1m ?? 0) > 3 && aboveEma20) {
    return "BREAKOUT";
  }
  // DISTRIBUTION: en zona alta, momentum se deteriora, volumen alto en caídas
  if (pos52w != null && pos52w > 70 && !aboveEma20 && (macdHist ?? 0) < 0 && (volumeRatio ?? 0) > 1.2) {
    return "DISTRIBUTION";
  }
  // DOWNTREND: bajo medias clave y RSI débil
  if (!aboveEma20 && !aboveEma50 && (aboveSma200 === false || (rsi14 ?? 50) < 40) && (perf1m ?? 0) < -3) {
    return "DOWNTREND";
  }
  // BASE: rango estrecho (baja vol), cerca de medias, sin tendencia fuerte
  if (atrPct != null && atrPct < 3 && Math.abs(perf1m ?? 0) < 6 && pos52w != null && pos52w > 25 && pos52w < 75) {
    return "BASE";
  }
  // ACCUMULATION: sobre medias o recuperando, RSI 45-65, MACD mejorando
  const macdImproving = macdHist != null && macdHistPrev != null && macdHist > macdHistPrev;
  if ((aboveEma50 || (aboveEma20 && emaAlign)) && (rsi14 ?? 50) >= 42 && (rsi14 ?? 50) <= 68 && (macdImproving || (macdHist ?? 0) > 0)) {
    return "ACCUMULATION";
  }
  if (aboveEma20 && emaAlign) return "ACCUMULATION";
  return "NO_TRADE";
}

// Señales de piso (Entry Engine): menor presión vendedora, higher low, RSI recuperando...
export function floorSignals(t: TechnicalResult, closes: number[]): string[] {
  const sigs: string[] = [];
  if (t.rsi14 != null && t.rsiPrev5 != null && t.rsi14 > t.rsiPrev5 && t.rsi14 < 55) sigs.push("RSI recuperando");
  if (t.macdHist != null && t.macdHistPrev != null && t.macdHist > t.macdHistPrev) sigs.push("MACD mejorando");
  if (closes.length > 10) {
    const recentLow = Math.min(...closes.slice(-5));
    const priorLow = Math.min(...closes.slice(-15, -5));
    if (recentLow > priorLow) sigs.push("Mínimo más alto (higher low)");
  }
  if (t.volumeRatio != null && t.volumeRatio < 1.0 && (t.perf1w ?? 0) > -2) sigs.push("Estabilización de volumen");
  if (t.pos52w != null && t.pos52w < 30) sigs.push("Cerca de soporte 52 semanas");
  return sigs;
}

export function technicalScoreOf(t: TechnicalResult): number | null {
  if (!t.hasData || t.close == null || t.ema20 == null || t.ema50 == null) return null;
  let s = 50;
  if (t.close > t.ema20) s += 8; else s -= 8;
  if (t.close > t.ema50) s += 8; else s -= 8;
  if (t.sma200 != null) s += t.close > t.sma200 ? 6 : -6;
  if (t.ema20 > t.ema50) s += 6; else s -= 6;
  if (t.rsi14 != null) {
    if (t.rsi14 >= 45 && t.rsi14 <= 65) s += 8;
    else if (t.rsi14 > 75) s -= 6;
    else if (t.rsi14 < 35) s -= 6;
  }
  if (t.macdHist != null) s += t.macdHist > 0 ? 6 : -6;
  if (t.perf3m != null) s += clamp(t.perf3m, -15, 15) * 0.6;
  if (t.volumeRatio != null && t.volumeRatio > 1.3 && (t.perf1w ?? 0) > 0) s += 4;
  return Math.round(clamp(s));
}
