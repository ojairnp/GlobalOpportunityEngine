// ------------------------------------------------------------------
// THESIS ENGINE — genera tesis estructurada por REGLAS (verificable).
// La IA puede ampliarla después; la base siempre viene de reglas + datos.
// Nunca inventa cifras: solo usa el snapshot técnico y scores reales.
// ------------------------------------------------------------------

import type { TechnicalResult } from "./technical";
import type { ScoreBundle } from "./scoring";

const TYPE_LABEL: Record<string, string> = {
  equity: "acción",
  crypto: "criptoactivo",
  commodity: "commodity",
  fx: "par de divisas",
  index: "índice",
};

const STATE_LABEL: Record<string, string> = {
  BASE: "BASE (rango estrecho, baja volatilidad)",
  ACCUMULATION: "ACUMULACIÓN (precio sobre medias, momentum mejorando)",
  BREAKOUT: "RUPTURA (cerca de máximos de 52 semanas con expansión de volumen)",
  DISTRIBUTION: "DISTRIBUCIÓN (zona alta con momentum deteriorándose)",
  DOWNTREND: "TENDENCIA BAJISTA",
  HIGH_VOLATILITY: "ALTA VOLATILIDAD",
  NO_TRADE: "SIN ESTRUCTURA OPERABLE",
};

function fmt(v: number | null | undefined, suffix = "", digits = 1): string {
  return v == null ? "DATA UNAVAILABLE" : `${v.toFixed(digits)}${suffix}`;
}

export interface AssetLike {
  symbol: string;
  name: string;
  type: string;
  market: string;
  country: string;
  sector: string;
  lastPrice: number | null;
}

export function buildThesis(asset: AssetLike, t: TechnicalResult, s: ScoreBundle): {
  whyAppeared: string;
  assetContext: string;
  improving: string;
  marketMissing: string;
  catalysts: string;
  risks: string;
  entryCondition: string;
  invalidation: string;
  horizon: string;
  confidence: string;
} {
  const label = TYPE_LABEL[asset.type] ?? "activo";
  const state = STATE_LABEL[t.state] ?? t.state;
  const floors = (s.payload.floorSignals as string[] | undefined) ?? [];
  const missing = (s.payload.missingComponents as string[] | undefined) ?? [];

  const whyBits: string[] = [];
  if (t.state === "BREAKOUT") whyBits.push(`ruptura técnica: precio en el ${fmt(t.pos52w, "%", 0)} superior de su rango de 52 semanas con ratio de volumen ${fmt(t.volumeRatio, "x", 2)}`);
  if (t.state === "ACCUMULATION") whyBits.push("estructura de acumulación sobre medias móviles");
  if (t.state === "BASE") whyBits.push("base de baja volatilidad tras consolidación");
  if ((s.fomoScore ?? 0) >= 55) whyBits.push(`alerta de extensión/FOMO (FOMO SCORE ${fmt(s.fomoScore, "", 0)}/100)`);
  if (s.earlyScore != null && s.earlyScore >= 60) whyBits.push(`señal temprana en cripto (EARLY SCORE ${fmt(s.earlyScore, "", 0)}/100)`);
  if (whyBits.length === 0) whyBits.push("cambio de estado técnico detectado por el escáner");

  const improving: string[] = [];
  if (t.macdHist != null && t.macdHistPrev != null && t.macdHist > t.macdHistPrev) improving.push(`histograma MACD mejorando (${fmt(t.macdHistPrev, "", 4)} → ${fmt(t.macdHist, "", 4)})`);
  if (t.rsi14 != null && t.rsiPrev5 != null && t.rsi14 > t.rsiPrev5) improving.push(`RSI(14) recuperando (${fmt(t.rsiPrev5, "", 0)} → ${fmt(t.rsi14, "", 0)})`);
  if (t.perf1m != null && t.perf1m > 0) improving.push(`rendimiento 1M positivo (${fmt(t.perf1m, "%")})`);
  if (t.perf3m != null && t.perf3m > 0) improving.push(`tendencia 3M positiva (${fmt(t.perf3m, "%")})`);
  if (improving.length === 0) improving.push("sin mejoras verificables en los datos disponibles");

  const risks: string[] = [];
  if (t.atrPct != null && t.atrPct > 4) risks.push(`volatilidad elevada: ATR(14) = ${fmt(t.atrPct, "%")} del precio`);
  if (t.pos52w != null && t.pos52w > 90) risks.push(`precio en zona alta del rango anual (${fmt(t.pos52w, "%", 0)} del rango 52w)`);
  if (t.state === "DOWNTREND") risks.push("tendencia bajista activa: operar contra tendencia exige confirmación de piso");
  if ((s.fomoScore ?? 0) >= 55) risks.push("extensión parabólica: riesgo de entrar tarde (FOMO)");
  if (missing.length > 0) risks.push(`componentes sin datos verificables: ${missing.join(", ")} — la tesis se basa solo en datos disponibles`);
  if (asset.type === "crypto") risks.push("riesgos on-chain (honeypot, taxes, concentración de holders, liquidez bloqueada) requieren verificación por contrato — no disponible en esta fase");
  if (risks.length === 0) risks.push("riesgo estándar de mercado; revisar correlaciones y eventos");

  const fv = s.payload.fairValue as { bear: number | null; base: number | null; bull: number | null; assumptions: string } | undefined;

  return {
    whyAppeared: `El escáner marcó ${asset.symbol} por: ${whyBits.join("; ")}. Estado técnico actual: ${state}.`,
    assetContext: `${asset.name} (${asset.symbol}) — ${label} en ${asset.market || "mercado global"}${asset.country ? `, ${asset.country}` : ""}${asset.sector ? `, sector ${asset.sector}` : ""}. Último precio verificado: ${asset.lastPrice ?? "DATA UNAVAILABLE"}.`,
    improving: improving.map((i) => `• ${i}`).join("\n"),
    marketMissing:
      asset.type === "equity"
        ? "El mercado podría no estar descontando aún la mejora de momentum/estructura si los fundamentales (ingresos, backlog, guidance) la confirman — esos datos requieren filings y no están disponibles en fuentes gratuitas para este activo en esta fase. La divergencia precio/fundamentales queda pendiente de verificación."
        : "En activos tácticos, lo que el mercado puede no descontar es un cambio de régimen (tendencia/volatilidad) antes de que el movimiento quede extendido. Confirmar con datos macro del motor correspondiente.",
    catalysts:
      asset.type === "equity"
        ? "Catalizadores a vigilar: próximos resultados (earnings), revisiones de estimaciones, guidance de CAPEX/backlog, rotación sectorial. SIN FECHAS VERIFICADAS en esta fase — registrar manualmente o esperar al News Engine (Fase 2)."
        : "Catalizadores a vigilar: datos macro (inflación, tasas), inventarios (energía/agros), flujos ETF y narrativa. Verificar calendario en fuentes oficiales.",
    risks: risks.map((r) => `• ${r}`).join("\n"),
    entryCondition:
      s.decision === "BUY_ZONE"
        ? `Entrada válida según ENTRY SCORE (${fmt(s.entryScore, "", 0)}/100). Confirmar con volumen en la apertura y definir stop bajo EMA50 o mínimo reciente.`
        : floors.length > 0
          ? `ESPERAR. Señales de piso presentes: ${floors.join(", ")}. Condición de entrada: ruptura de resistencia local con volumen, o ENTRY SCORE ≥ 62.`
          : "SIN CONDICIÓN DE ENTRADA todavía. Esperar suelo verificable (higher low + RSI recuperando + volumen estabilizándose) o ruptura confirmada.",
    invalidation:
      fv?.bear != null
        ? `La tesis se invalida si el precio cierra por debajo del escenario BEAR técnico (${fv.bear.toFixed(2)}) o si el estado técnico pasa a DOWNTREND con volumen vendedor. ${fv.assumptions}`
        : "Invalidación: cierre bajo EMA50 con volumen vendedor, o deterioro de RSI/MACD sin recuperación en 5 sesiones.",
    horizon: s.horizon,
    confidence: missing.length >= 3 ? "LOW" : missing.length >= 1 ? "MEDIUM" : "HIGH",
  };
}
