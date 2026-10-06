// ------------------------------------------------------------------
// PIPELINE — orquestador: UNIVERSE → collect → technical → scores →
// thesis → detections → performance. Registra dataQuality y auditLog.
// ------------------------------------------------------------------

import { eq, desc } from "drizzle-orm";
import { getDb } from "./queries/connection";
import {
  assets, prices, technicalSnapshots, scores, theses, detections,
  performanceRecords, auditLog, dataQuality, fundamentals,
} from "@db/schema";
import { UNIVERSE } from "./collectors/universe";
import {
  fetchNasdaqHistory, fetchNasdaqSummary, fetchEodhdHistory, fetchBlockchainBtc,
  fetchCoinloreTickers, fetchFrankfurterHistory, fetchCnbcQuotes, fetchCoingeckoMarket,
  fetchStooqHistory, fetchYahooHistory, fetchKrakenHistory, fetchCoinbaseHistory,
  fetchCoingeckoHistory, fetchDexscreenerQuote, type CollectorBarsResult, type QuoteResult,
} from "./collectors";
import { computeTechnical } from "./engines/technical";
import { computeScores } from "./engines/scoring";
import { buildThesis } from "./engines/thesis";
import type { Ohlcv } from "./engines/indicators";

function log(action: string, detail: string, actor = "system") {
  return getDb().insert(auditLog).values({ actor, action, detail });
}

function dq(source: string, assetId: number | null, field: string, status: string, message?: string) {
  return getDb().insert(dataQuality).values({ source, assetId, field, status, message: message?.slice(0, 500) });
}

export async function ensureUniverse(): Promise<number> {
  const db = getDb();
  let count = 0;
  for (const u of UNIVERSE) {
    await db
      .insert(assets)
      .values({
        symbol: u.symbol, name: u.name, type: u.type, market: u.market, country: u.country,
        currency: u.currency, sector: u.sector ?? "", industry: u.industry ?? "",
        themes: u.themes ?? [], sourceMeta: u.sources, isBenchmark: u.benchmark ?? false,
        sourceStatus: "PENDING",
      })
      .onDuplicateKeyUpdate({
        set: { name: u.name, market: u.market, country: u.country, themes: u.themes ?? [], sourceMeta: u.sources, updatedAt: new Date() },
      });
    count++;
  }
  return count;
}

// Orden de fuentes por tipo de activo
function sourceOrder(asset: { type: string; symbol: string; sourceMeta: Record<string, string> | null }): string[] {
  const meta = asset.sourceMeta ?? {};
  const avail = Object.keys(meta);
  const pref: Record<string, string[]> = {
    equity: ["nasdaq", "eodhd", "stooq", "yahoo"],
    crypto: ["kraken", "coinbase", "coingecko", "eodhd", "blockchain", "yahoo"],
    fx: ["frankfurter", "stooq", "yahoo"],
    commodity: ["stooq", "yahoo"],
    index: ["nasdaq", "stooq", "yahoo"],
  };
  const order = pref[asset.type] ?? [];
  return [...order.filter((s) => avail.includes(s)), ...avail.filter((s) => !order.includes(s))];
}

async function collectBars(asset: { id: number; symbol: string; type: string; sourceMeta: Record<string, string> | null }): Promise<CollectorBarsResult> {
  const meta = asset.sourceMeta ?? {};
  for (const src of sourceOrder(asset)) {
    const sym = meta[src];
    if (!sym) continue;
    let r: CollectorBarsResult = { ok: false, source: src, bars: [], error: "no implementado" };
    if (src === "nasdaq") r = await fetchNasdaqHistory(sym, asset.type === "index" ? "etf" : "stocks");
    else if (src === "eodhd") r = await fetchEodhdHistory(sym);
    else if (src === "blockchain") r = await fetchBlockchainBtc();
    else if (src === "kraken") r = await fetchKrakenHistory(sym);
    else if (src === "coinbase") r = await fetchCoinbaseHistory(sym);
    else if (src === "coingecko") r = await fetchCoingeckoHistory(sym);
    else if (src === "frankfurter") r = await fetchFrankfurterHistory(sym);
    else if (src === "stooq") r = await fetchStooqHistory(sym);
    else if (src === "yahoo") r = await fetchYahooHistory(sym);
    if (r.ok && r.bars.length >= 30) return r;
    if (!r.ok) await dq(src, asset.id, "prices", "DATA_UNAVAILABLE", r.error);
  }
  return { ok: false, source: "none", bars: [], error: "ninguna fuente disponible" };
}

async function upsertPrices(assetId: number, bars: Ohlcv[], source: string) {
  const db = getDb();
  // Solo insertamos los últimos 400 para eficiencia; dedupe por (assetId, date)
  for (const b of bars.slice(-400)) {
    await db
      .insert(prices)
      .values({ assetId, date: b.date, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, source })
      .onDuplicateKeyUpdate({ set: { open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume, source, fetchedAt: new Date() } });
  }
}

async function loadBars(assetId: number): Promise<Ohlcv[]> {
  const rows = await getDb().select().from(prices).where(eq(prices.assetId, assetId)).orderBy(prices.date).limit(500);
  return rows.map((r) => ({ date: new Date(r.date), open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }));
}

// Quotes rápidas por lote (cripto + commodities + índices)
async function refreshQuotes(allAssets: { id: number; symbol: string; type: string; sourceMeta: Record<string, string> | null }[]) {
  const db = getDb();
  const cryptoAssets = allAssets.filter((a) => a.type === "crypto");
  const coinloreMap = await fetchCoinloreTickers();
  const cgIds = cryptoAssets.map((a) => a.sourceMeta?.coingecko).filter(Boolean) as string[];
  const cgMap = await fetchCoingeckoMarket(cgIds);
  const cnbcSymbols = allAssets
    .filter((a) => (a.type === "commodity" || a.type === "index") && a.sourceMeta?.cnbc)
    .map((a) => a.sourceMeta!.cnbc!);
  const cnbcMap = await fetchCnbcQuotes(cnbcSymbols);

  for (const a of allAssets) {
    const meta = a.sourceMeta ?? {};
    let q: QuoteResult | null = null;
    if (a.type === "crypto") {
      q = (meta.coinlore ? coinloreMap.get(meta.coinlore) : null) ?? (meta.coingecko ? cgMap.get(meta.coingecko) : null) ?? null;
      if (!q?.ok && meta.dexscreener) {
        const dex = await fetchDexscreenerQuote(meta.dexscreener, a.symbol);
        if (dex.ok) q = dex;
      }
    } else if (meta.cnbc) q = cnbcMap.get(meta.cnbc) ?? null;
    if (q?.ok && q.price != null) {
      await db.update(assets).set({ lastPrice: q.price, lastPriceAt: q.at ?? new Date(), marketCap: q.marketCap ?? undefined, updatedAt: new Date() }).where(eq(assets.id, a.id));
      await db.insert(fundamentals)
        .values([
          { assetId: a.id, metric: "pct_change_24h", value: q.pct24h ?? null, hasData: q.pct24h != null, source: q.source },
          { assetId: a.id, metric: "pct_change_7d", value: q.pct7d ?? null, hasData: q.pct7d != null, source: q.source },
          { assetId: a.id, metric: "market_cap", value: q.marketCap ?? null, hasData: q.marketCap != null, source: q.source },
          { assetId: a.id, metric: "rank", value: q.rank ?? null, hasData: q.rank != null, source: q.source },
        ])
        .onDuplicateKeyUpdate({ set: { fetchedAt: new Date() } });
    }
  }
  return { coinlore: coinloreMap.size, coingecko: cgMap.size, cnbc: cnbcMap.size };
}

export async function refreshFundamentalsUs(allAssets: { id: number; symbol: string; type: string; sourceMeta: Record<string, string> | null }[]) {
  const db = getDb();
  for (const a of allAssets) {
    if (a.type !== "equity" || !a.sourceMeta?.nasdaq) continue;
    const assetClass = "stocks";
    const s = await fetchNasdaqSummary(a.sourceMeta.nasdaq, assetClass);
    if (!s.ok || !s.data) {
      await dq("nasdaq", a.id, "summary", "DATA_UNAVAILABLE", s.error);
      continue;
    }
    const d = s.data;
    const parse = (v?: string) => {
      if (!v || v === "N/A") return null;
      const n = parseFloat(v.replace(/[$,]/g, "").split("/")[0]);
      return Number.isFinite(n) ? n : null;
    };
    const mcRaw = d["MarketCap"]?.replace(/[$,]/g, "");
    const mc = mcRaw && Number.isFinite(parseFloat(mcRaw)) ? parseFloat(mcRaw) : null;
    const entries = [
      { metric: "sector", value: null as number | null, hasData: false },
      { metric: "market_cap", value: mc, hasData: mc != null },
      { metric: "analyst_target", value: parse(d["OneYrTarget"]), hasData: parse(d["OneYrTarget"]) != null },
      { metric: "avg_volume", value: parse(d["AverageVolume"]), hasData: parse(d["AverageVolume"]) != null },
    ];
    await db.insert(fundamentals)
      .values(entries.map((e) => ({ assetId: a.id, metric: e.metric, value: e.value, hasData: e.hasData, source: "nasdaq" })))
      .onDuplicateKeyUpdate({ set: { fetchedAt: new Date() } });
    if (d["Sector"] || d["Industry"]) {
      await db.update(assets).set({ sector: d["Sector"] ?? "", industry: d["Industry"] ?? "", marketCap: mc ?? undefined, updatedAt: new Date() }).where(eq(assets.id, a.id));
    }
  }
}

async function recomputeAsset(a: typeof assets.$inferSelect) {
  const db = getDb();
  const bars = await loadBars(a.id);
  const t = computeTechnical(bars);
  const closes = bars.map((b) => b.close);

  // estado técnico previo (antes de sobrescribir) para detectar cambios
  const prevTechRow = await db.select().from(technicalSnapshots).where(eq(technicalSnapshots.assetId, a.id)).limit(1);
  const prevTechState = prevTechRow[0]?.hasData ? prevTechRow[0]?.state : undefined;

  await db.insert(technicalSnapshots)
    .values({
      assetId: a.id, asOf: t.asOf, close: t.close, ema20: t.ema20, ema50: t.ema50, sma100: t.sma100, sma200: t.sma200,
      rsi14: t.rsi14, macd: t.macd, macdSignal: t.macdSignal, macdHist: t.macdHist, atr14: t.atr14, atrPct: t.atrPct,
      avgVol20: t.avgVol20, volumeRatio: t.volumeRatio, high52w: t.high52w, low52w: t.low52w, pos52w: t.pos52w,
      perf1w: t.perf1w, perf1m: t.perf1m, perf3m: t.perf3m, perf6m: t.perf6m, perf1y: t.perf1y,
      state: t.state, hasData: t.hasData,
    })
    .onDuplicateKeyUpdate({
      set: {
        asOf: t.asOf, close: t.close, ema20: t.ema20, ema50: t.ema50, sma100: t.sma100, sma200: t.sma200,
        rsi14: t.rsi14, macd: t.macd, macdSignal: t.macdSignal, macdHist: t.macdHist, atr14: t.atr14, atrPct: t.atrPct,
        avgVol20: t.avgVol20, volumeRatio: t.volumeRatio, high52w: t.high52w, low52w: t.low52w, pos52w: t.pos52w,
        perf1w: t.perf1w, perf1m: t.perf1m, perf3m: t.perf3m, perf6m: t.perf6m, perf1y: t.perf1y,
        state: t.state, hasData: t.hasData, computedAt: new Date(),
      },
    });

  // extras cripto para early score
  let extra: { marketCap?: number | null; pct24h?: number | null; pct7d?: number | null; rank?: number | null; hasFundamentals?: boolean } = { hasFundamentals: false };
  if (a.type === "crypto") {
    const fundRows = await db.select().from(fundamentals).where(eq(fundamentals.assetId, a.id));
    const get = (m: string) => fundRows.find((f) => f.metric === m && f.hasData)?.value ?? null;
    extra = { marketCap: get("market_cap"), pct24h: get("pct_change_24h"), pct7d: get("pct_change_7d"), rank: get("rank"), hasFundamentals: false };
  }
  if (a.type === "equity") {
    const fundRows = await db.select().from(fundamentals).where(eq(fundamentals.assetId, a.id));
    extra.hasFundamentals = fundRows.some((f) => f.hasData);
  }

  const s = computeScores(a.type, t, closes, extra);

  // decisión previa → detecciones de cambio
  const prevScore = await db.select().from(scores).where(eq(scores.assetId, a.id)).limit(1);
  const prevDecision = prevScore[0]?.decision ?? null;

  await db.insert(scores)
    .values({
      assetId: a.id, technicalScore: s.technicalScore, entryScore: s.entryScore, riskScore: s.riskScore,
      fomoScore: s.fomoScore, earlyScore: s.earlyScore, opportunityScore: s.opportunityScore,
      asymmetryScore: s.asymmetryScore, decision: s.decision, horizon: s.horizon, tacticalState: s.tacticalState, payload: s.payload,
    })
    .onDuplicateKeyUpdate({
      set: {
        ts: new Date(), technicalScore: s.technicalScore, entryScore: s.entryScore, riskScore: s.riskScore,
        fomoScore: s.fomoScore, earlyScore: s.earlyScore, opportunityScore: s.opportunityScore,
        asymmetryScore: s.asymmetryScore, decision: s.decision, horizon: s.horizon, tacticalState: s.tacticalState, payload: s.payload,
      },
    });

  // tesis (regenerar si decisión cambió o no existe)
  const existingThesis = await db.select().from(theses).where(eq(theses.assetId, a.id)).orderBy(desc(theses.ts)).limit(1);
  if (!existingThesis.length || prevDecision !== s.decision) {
    if (existingThesis.length && prevDecision !== s.decision) {
      await db.update(theses).set({ status: "EXPIRED" }).where(eq(theses.id, existingThesis[0].id));
    }
    const th = buildThesis(
      { symbol: a.symbol, name: a.name, type: a.type, market: a.market, country: a.country, sector: a.sector, lastPrice: t.close ?? a.lastPrice },
      t, s
    );
    await db.insert(theses).values({ assetId: a.id, ...th });
  }

  // detecciones por cambios relevantes (nunca se borran: sin sesgo de supervivencia)
  const price = t.close ?? a.lastPrice ?? null;
  const mk = (type: string, summary: string, payload: Record<string, unknown> = {}) =>
    db.insert(detections).values({ assetId: a.id, type, priceAtDetection: price, summary, payload });
  if (prevDecision && prevDecision !== s.decision) {
    await mk("DECISION_CHANGE", `${prevDecision} → ${s.decision}`, { from: prevDecision, to: s.decision, entryScore: s.entryScore, opportunityScore: s.opportunityScore });
    await log("decision_change", `${a.symbol}: ${prevDecision} → ${s.decision}`);
  }
  if (prevTechState && prevTechState !== t.state && (t.state === "BREAKOUT" || t.state === "ACCUMULATION")) {
    await mk(t.state === "BREAKOUT" ? "BREAKOUT" : "ACCUMULATION_START", `Estado técnico: ${prevTechState} → ${t.state}`, { rsi: t.rsi14, pos52w: t.pos52w });
  }
  if ((s.fomoScore ?? 0) >= 55 && prevScore[0] && (prevScore[0].fomoScore ?? 0) < 55) {
    await mk("FOMO_ALERT", `FOMO SCORE sube a ${s.fomoScore}/100 — posible entrada tardía`, { fomo: s.fomoScore });
  }
  if (!prevDecision && s.decision === "BUY_ZONE") {
    await mk("OPPORTUNITY", `Oportunidad inicial: ${s.decision} (score ${s.opportunityScore ?? "?"}). Precio de descubrimiento registrado.`, { opportunityScore: s.opportunityScore });
    if (a.discoveryPrice == null && price != null) {
      await db.update(assets).set({ discoveryPrice: price, discoveryAt: new Date() }).where(eq(assets.id, a.id));
    }
  }

  // actualizar estado del activo (nunca pisar una quote válida con null)
  await db.update(assets).set({
    hasData: t.hasData,
    sourceStatus: t.hasData ? "OK" : "DATA_UNAVAILABLE",
    ...(price != null ? { lastPrice: price, lastPriceAt: t.hasData ? t.asOf : (a.lastPriceAt ?? new Date()) } : {}),
    updatedAt: new Date(),
  }).where(eq(assets.id, a.id));
}

// Evaluar performance de detecciones pasadas (sin look-ahead: solo precios actuales)
export async function evaluatePerformance() {
  const db = getDb();
  const allDets = await db.select().from(detections).where(eq(detections.status, "ACTIVE")).limit(500);
  const bench = await db.select().from(assets).where(eq(assets.isBenchmark, true)).limit(1);
  const benchBars = bench.length ? await loadBars(bench[0].id) : [];
  const benchClose = benchBars.length ? benchBars[benchBars.length - 1].close : null;

  const horizonsByType: Record<string, { label: string; ms: number }[]> = {
    equity: [{ label: "1M", ms: 30 * 86400e3 }, { label: "3M", ms: 91 * 86400e3 }, { label: "6M", ms: 182 * 86400e3 }, { label: "1Y", ms: 365 * 86400e3 }],
    crypto: [{ label: "24H", ms: 86400e3 }, { label: "7D", ms: 7 * 86400e3 }, { label: "30D", ms: 30 * 86400e3 }],
    commodity: [{ label: "1D", ms: 86400e3 }, { label: "1W", ms: 7 * 86400e3 }],
    fx: [{ label: "1D", ms: 86400e3 }, { label: "1W", ms: 7 * 86400e3 }],
    index: [{ label: "1M", ms: 30 * 86400e3 }],
  };
  const now = Date.now();
  for (const d of allDets) {
    if (d.priceAtDetection == null) continue;
    const [asset] = await db.select().from(assets).where(eq(assets.id, d.assetId)).limit(1);
    if (!asset || asset.lastPrice == null) continue;
    const ageMs = now - new Date(d.ts).getTime();
    for (const h of horizonsByType[asset.type] ?? []) {
      if (ageMs < h.ms) continue;
      const existing = await db.select().from(performanceRecords).where(eq(performanceRecords.detectionId, d.id));
      if (existing.some((r) => r.horizon === h.label)) continue;
      const ret = (asset.lastPrice / d.priceAtDetection - 1) * 100;
      let benchRet: number | null = null;
      if (benchClose != null && bench.length && asset.type === "equity") {
        const benchAtDet = benchBars.filter((b) => b.date <= new Date(d.ts)).at(-1)?.close ?? null;
        if (benchAtDet) benchRet = (benchClose / benchAtDet - 1) * 100;
      }
      await db.insert(performanceRecords).values({
        detectionId: d.id, horizon: h.label, returnPct: ret,
        benchmarkReturnPct: benchRet, alpha: benchRet != null ? ret - benchRet : null,
      });
    }
  }
}

export async function runPipeline(opts: { skipQuotes?: boolean } = {}) {
  const started = Date.now();
  await ensureUniverse();
  const db = getDb();
  const all = await db.select().from(assets).where(eq(assets.active, true));

  let quotesInfo = { coinlore: 0, coingecko: 0, cnbc: 0 };
  if (!opts.skipQuotes) quotesInfo = await refreshQuotes(all);

  const stats = { assets: all.length, pricesOk: 0, pricesFail: 0, quotes: quotesInfo };
  for (const a of all) {
    if (a.isBenchmark && a.type === "index" && !a.sourceMeta?.nasdaq) continue;
    const r = await collectBars({ id: Number(a.id), symbol: a.symbol, type: a.type, sourceMeta: a.sourceMeta ?? {} });
    if (r.ok) {
      await upsertPrices(Number(a.id), r.bars, r.source);
      stats.pricesOk++;
      await dq(r.source, Number(a.id), "prices", "OK", `${r.bars.length} barras`);
    } else {
      stats.pricesFail++;
      // marcar DATA UNAVAILABLE si nunca tuvo datos
      if (!a.hasData) {
        await db.update(assets).set({ sourceStatus: "DATA_UNAVAILABLE", updatedAt: new Date() }).where(eq(assets.id, a.id));
      } else {
        await db.update(assets).set({ sourceStatus: "STALE", updatedAt: new Date() }).where(eq(assets.id, a.id));
      }
    }
  }

  // fundamentales ligeros (Nasdaq summary) para equities US
  await refreshFundamentalsUs(all.map((a) => ({ id: Number(a.id), symbol: a.symbol, type: a.type, sourceMeta: a.sourceMeta ?? {} })));

  for (const a of all) {
    await recomputeAsset(a);
  }

  await evaluatePerformance();
  await log("pipeline_run", `Pipeline completo en ${((Date.now() - started) / 1000).toFixed(1)}s — ${stats.pricesOk} con precios, ${stats.pricesFail} sin datos, quotes: coinlore=${quotesInfo.coinlore} coingecko=${quotesInfo.coingecko} cnbc=${quotesInfo.cnbc}`);
  return stats;
}
