// ------------------------------------------------------------------
// COLLECTORS — fuentes gratuitas / públicas, sin API keys obligatorias.
// Cada fetcher devuelve { ok, bars?, quote?, source, error? } y NUNCA
// inventa datos: si la fuente falla, ok=false y el pipeline marca
// DATA UNAVAILABLE en dataQuality.
// ------------------------------------------------------------------

import type { Ohlcv } from "../engines/indicators";

export interface CollectorBarsResult {
  ok: boolean;
  source: string;
  bars: Ohlcv[];
  error?: string;
}

export interface QuoteResult {
  ok: boolean;
  source: string;
  price?: number;
  at?: Date;
  marketCap?: number;
  pct24h?: number;
  pct7d?: number;
  rank?: number;
  name?: string;
  error?: string;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function getJson(url: string, headers: Record<string, string> = {}, timeoutMs = 12000): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json,*/*", ...headers }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// ---------------- NASDAQ (acciones y ETFs de EE. UU.) ----------------

export async function fetchNasdaqHistory(symbol: string, assetClass: "stocks" | "etf" = "stocks"): Promise<CollectorBarsResult> {
  const to = new Date();
  const from = new Date(to.getTime() - 370 * 86400e3);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/historical?assetclass=${assetClass}&fromdate=${fmt(from)}&todate=${fmt(to)}&limit=9999`;
  try {
    const j = (await getJson(url, { Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" })) as {
      data?: { tradesTable?: { rows?: { date: string; close: string; volume: string; open: string; high: string; low: string }[] } };
    };
    const rows = j?.data?.tradesTable?.rows ?? [];
    const bars: Ohlcv[] = rows
      .map((r) => ({
        date: new Date(r.date),
        open: num(r.open),
        high: num(r.high),
        low: num(r.low),
        close: num(r.close) ?? 0,
        volume: num(r.volume),
      }))
      .filter((b) => b.close > 0 && !isNaN(b.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (!bars.length) return { ok: false, source: "nasdaq", bars: [], error: "sin filas" };
    return { ok: true, source: "nasdaq", bars };
  } catch (e) {
    return { ok: false, source: "nasdaq", bars: [], error: String(e).slice(0, 200) };
  }
}

export async function fetchNasdaqSummary(symbol: string, assetClass: "stocks" | "etf" = "stocks"): Promise<{ ok: boolean; data?: Record<string, string>; error?: string }> {
  try {
    const j = (await getJson(
      `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/summary?assetclass=${assetClass}`,
      { Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" }
    )) as { data?: { summaryData?: Record<string, { value: string }> } };
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(j?.data?.summaryData ?? {})) out[k] = v?.value ?? "";
    return { ok: true, data: out };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

// ---------------- EODHD (demo token: cobertura limitada, datos reales) ----------------

export async function fetchEodhdHistory(symbol: string): Promise<CollectorBarsResult> {
  try {
    const j = (await getJson(`https://eodhd.com/api/eod/${encodeURIComponent(symbol)}?api_token=demo&fmt=json`)) as {
      date: string; open: number; high: number; low: number; close: number; volume: number;
    }[];
    if (!Array.isArray(j)) return { ok: false, source: "eodhd", bars: [], error: "formato inesperado" };
    const bars: Ohlcv[] = j
      .map((r) => ({ date: new Date(r.date), open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }))
      .filter((b) => b.close > 0)
      .slice(-400);
    if (!bars.length) return { ok: false, source: "eodhd", bars: [], error: "sin filas" };
    return { ok: true, source: "eodhd", bars };
  } catch (e) {
    return { ok: false, source: "eodhd", bars: [], error: String(e).slice(0, 200) };
  }
}

// ---------------- BLOCKCHAIN.INFO (BTC histórico, sin volumen) ----------------

export async function fetchBlockchainBtc(): Promise<CollectorBarsResult> {
  try {
    const j = (await getJson("https://api.blockchain.info/charts/market-price?timespan=1year&format=json")) as {
      values?: { x: number; y: number }[];
    };
    const vals = j?.values ?? [];
    const bars: Ohlcv[] = vals.map((v) => ({ date: new Date(v.x * 1000), open: null, high: null, low: null, close: v.y, volume: null }));
    if (!bars.length) return { ok: false, source: "blockchain.info", bars: [], error: "sin valores" };
    return { ok: true, source: "blockchain.info", bars };
  } catch (e) {
    return { ok: false, source: "blockchain.info", bars: [], error: String(e).slice(0, 200) };
  }
}

// ---------------- COINLORE (cotizaciones cripto top 100) ----------------

export async function fetchCoinloreTickers(): Promise<Map<string, QuoteResult>> {
  const map = new Map<string, QuoteResult>();
  try {
    const j = (await getJson("https://api.coinlore.net/api/tickers/?start=0&limit=100")) as {
      data?: { id: string; symbol: string; name: string; rank: number; price_usd: string; percent_change_24h: string; percent_change_7d: string; market_cap_usd: string }[];
    };
    for (const c of j?.data ?? []) {
      map.set(c.id, {
        ok: true,
        source: "coinlore",
        price: num(c.price_usd) ?? undefined,
        at: new Date(),
        marketCap: num(c.market_cap_usd) ?? undefined,
        pct24h: num(c.percent_change_24h) ?? undefined,
        pct7d: num(c.percent_change_7d) ?? undefined,
        rank: c.rank,
        name: c.name,
      });
    }
  } catch {
    /* devuelve mapa vacío */
  }
  return map;
}

// ---------------- FRANKFURTER (FX oficial, tipos BCE) ----------------

export async function fetchFrankfurterHistory(ccy: string): Promise<CollectorBarsResult> {
  try {
    const j = (await getJson(`https://api.frankfurter.app/2025-01-01..?from=USD&to=${encodeURIComponent(ccy)}`)) as {
      rates?: Record<string, Record<string, number>>;
    };
    const rates = j?.rates ?? {};
    const bars: Ohlcv[] = Object.entries(rates)
      .map(([d, r]) => {
        const usdPerCcy = r[ccy];
        // Para pares XXXUSD (EUR, GBP) invertimos: precio = unidades de USD por unidad de divisa
        const close = ccy === "EUR" || ccy === "GBP" ? 1 / usdPerCcy : usdPerCcy;
        return { date: new Date(d), open: null, high: null, low: null, close, volume: null };
      })
      .filter((b) => b.close > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (!bars.length) return { ok: false, source: "frankfurter", bars: [], error: "sin tasas" };
    return { ok: true, source: "frankfurter", bars };
  } catch (e) {
    return { ok: false, source: "frankfurter", bars: [], error: String(e).slice(0, 200) };
  }
}

// ---------------- CNBC (cotizaciones actuales: commodities, índices) ----------------

export async function fetchCnbcQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
  const map = new Map<string, QuoteResult>();
  if (!symbols.length) return map;
  try {
    const url = `https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=${symbols
      .map((s) => encodeURIComponent(s))
      .join("|")}&requestMethod=itv&noform=1&partnerId=2&fund=1&output=json`;
    const j = (await getJson(url)) as {
      FormattedQuoteResult?: { FormattedQuote?: { symbol: string; code: number; name?: string; last?: string; last_time?: string }[] };
    };
    for (const q of j?.FormattedQuoteResult?.FormattedQuote ?? []) {
      if (q.code !== 0 || !q.last) continue;
      const price = num(q.last);
      if (price == null) continue;
      map.set(q.symbol, { ok: true, source: "cnbc", price, at: q.last_time ? new Date(q.last_time) : new Date(), name: q.name });
    }
  } catch {
    /* mapa vacío */
  }
  return map;
}

// ---------------- COINGECKO / DEXSCREENER / STQOOQ / YAHOO (runtime) ----------------

export async function fetchCoingeckoMarket(ids: string[]): Promise<Map<string, QuoteResult>> {
  const map = new Map<string, QuoteResult>();
  if (!ids.length) return map;
  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(",")}&price_change_percentage=24h,7d`;
    const j = (await getJson(url)) as {
      id: string; current_price: number; market_cap: number; market_cap_rank: number;
      price_change_percentage_24h: number; price_change_percentage_7d_in_currency: number; name: string;
    }[];
    if (!Array.isArray(j)) return map;
    for (const c of j) {
      map.set(c.id, {
        ok: true, source: "coingecko", price: c.current_price, at: new Date(),
        marketCap: c.market_cap, rank: c.market_cap_rank,
        pct24h: c.price_change_percentage_24h, pct7d: c.price_change_percentage_7d_in_currency, name: c.name,
      });
    }
  } catch { /* vacío */ }
  return map;
}

// DexScreener: discovery de pools nuevos (runtime; requiere red abierta)
export async function fetchDexscreenerProfile(query: string): Promise<{ ok: boolean; pairs?: unknown[]; error?: string }> {
  try {
    const j = (await getJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`)) as { pairs?: unknown[] };
    return { ok: true, pairs: j?.pairs ?? [] };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 160) };
  }
}

// DexScreener: cotización spot del pool de mayor liquidez para el símbolo.
export async function fetchDexscreenerQuote(query: string, symbol: string): Promise<QuoteResult> {
  try {
    const j = (await getJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`)) as {
      pairs?: { baseToken?: { symbol?: string }; priceUsd?: string; priceChange?: { h24?: number }; liquidity?: { usd?: number }; fdv?: number }[];
    };
    const want = symbol.toUpperCase();
    const cands = (j?.pairs ?? []).filter((p) => (p.baseToken?.symbol ?? "").toUpperCase() === want);
    if (!cands.length) return { ok: false, source: "dexscreener", error: "sin par" };
    const best = cands.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const price = num(best.priceUsd);
    if (price == null) return { ok: false, source: "dexscreener", error: "sin precio" };
    return { ok: true, source: "dexscreener", price, at: new Date(), pct24h: best.priceChange?.h24 ?? undefined, marketCap: best.fdv ?? undefined };
  } catch (e) {
    return { ok: false, source: "dexscreener", error: String(e).slice(0, 160) };
  }
}

// ---------------- CRIPTO — HISTÓRICO (Kraken / Coinbase / CoinGecko) ----------------

// Kraken: OHLCV diario real, sin API key, cobertura amplia de cripto.
export async function fetchKrakenHistory(pair: string): Promise<CollectorBarsResult> {
  try {
    const j = (await getJson(`https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=1440`)) as {
      error?: string[];
      result?: Record<string, unknown>;
    };
    if (j?.error?.length) return { ok: false, source: "kraken", bars: [], error: j.error.join(",").slice(0, 160) };
    const key = Object.keys(j?.result ?? {}).find((k) => k !== "last");
    const rows = (key ? (j!.result as Record<string, unknown[]>)[key] : []) as unknown[][];
    const bars: Ohlcv[] = rows
      .map((r) => ({
        date: new Date(Number(r[0]) * 1000),
        open: num(r[1]), high: num(r[2]), low: num(r[3]), close: num(r[4]) ?? 0,
        volume: num(r[6]),
      }))
      .filter((b) => b.close > 0 && !isNaN(b.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-400);
    if (bars.length < 30) return { ok: false, source: "kraken", bars: [], error: `solo ${bars.length} barras` };
    return { ok: true, source: "kraken", bars };
  } catch (e) {
    return { ok: false, source: "kraken", bars: [], error: String(e).slice(0, 160) };
  }
}

// Coinbase Exchange: velas diarias reales [ts, low, high, open, close, vol].
export async function fetchCoinbaseHistory(product: string): Promise<CollectorBarsResult> {
  try {
    const j = (await getJson(`https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/candles?granularity=86400`)) as unknown[];
    if (!Array.isArray(j)) return { ok: false, source: "coinbase", bars: [], error: "formato inesperado" };
    const bars: Ohlcv[] = j
      .map((r) => {
        const [ts, low, high, open, close, vol] = r as number[];
        return { date: new Date(ts * 1000), open, high, low, close, volume: vol };
      })
      .filter((b) => b.close > 0 && !isNaN(b.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-400);
    if (bars.length < 30) return { ok: false, source: "coinbase", bars: [], error: `solo ${bars.length} barras` };
    return { ok: true, source: "coinbase", bars };
  } catch (e) {
    return { ok: false, source: "coinbase", bars: [], error: String(e).slice(0, 160) };
  }
}

// CoinGecko: histórico diario amplio. market_chart no expone OHLC, así que se
// deriva open = cierre previo y high/low del tramo (precio y volumen reales).
export async function fetchCoingeckoHistory(id: string): Promise<CollectorBarsResult> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=365&interval=daily`;
    const j = (await getJson(url, {}, 20000)) as { prices?: [number, number][]; total_volumes?: [number, number][] };
    const prices = j?.prices ?? [];
    const volByDay = new Map<number, number>();
    for (const [ts, v] of j?.total_volumes ?? []) volByDay.set(Math.floor(ts / 86400e3), v);
    const bars: Ohlcv[] = [];
    for (let i = 0; i < prices.length; i++) {
      const [ts, close] = prices[i];
      if (close == null) continue;
      const prev = i > 0 ? prices[i - 1][1] : close;
      bars.push({
        date: new Date(ts),
        open: prev,
        high: Math.max(prev, close),
        low: Math.min(prev, close),
        close,
        volume: volByDay.get(Math.floor(ts / 86400e3)) ?? null,
      });
    }
    if (bars.length < 30) return { ok: false, source: "coingecko", bars: [], error: `solo ${bars.length} barras` };
    return { ok: true, source: "coingecko", bars };
  } catch (e) {
    return { ok: false, source: "coingecko", bars: [], error: String(e).slice(0, 160) };
  }
}

// Stooq: resuelve el reto proof-of-work anti-bot antes de descargar CSV
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function fetchStooqHistory(symbol: string): Promise<CollectorBarsResult> {
  try {
    // 1) resolver reto PoW
    const page = await fetch("https://stooq.com/", { headers: { "User-Agent": UA } });
    const html = await page.text();
    const m = html.match(/const c="([^"]+)",d=(\d+)/);
    const setCookie = page.headers.get("set-cookie") ?? "";
    if (!m) return { ok: false, source: "stooq", bars: [], error: "sin reto" };
    const [, c, dStr] = m;
    const d = parseInt(dStr);
    const target = "0".repeat(d);
    let n = 0;
    while (!(await sha256Hex(c + n)).startsWith(target)) n++;
    const vr = await fetch("https://stooq.com/__verify", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", Cookie: setCookie.split(";")[0] ?? "" },
      body: `c=${encodeURIComponent(c)}&n=${n}`,
    });
    const authCookie = (vr.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
    // 2) descargar CSV
    const csvRes = await fetch(`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`, {
      headers: { "User-Agent": UA, Cookie: authCookie },
    });
    const text = await csvRes.text();
    if (!text.includes("Date,")) return { ok: false, source: "stooq", bars: [], error: text.slice(0, 60) || "CSV inválido" };
    const bars: Ohlcv[] = text
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [date, o, h, l, cl, v] = line.split(",");
        return { date: new Date(date), open: num(o), high: num(h), low: num(l), close: num(cl) ?? 0, volume: num(v) };
      })
      .filter((b) => b.close > 0 && !isNaN(b.date.getTime()))
      .slice(-400);
    if (!bars.length) return { ok: false, source: "stooq", bars: [], error: "sin filas" };
    return { ok: true, source: "stooq", bars };
  } catch (e) {
    return { ok: false, source: "stooq", bars: [], error: String(e).slice(0, 160) };
  }
}

// Yahoo chart API (runtime; puede requerir cookie/crumb según red)
export async function fetchYahooHistory(symbol: string): Promise<CollectorBarsResult> {
  try {
    const j = (await getJson(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`
    )) as {
      chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close?: (number | null)[]; volume?: (number | null)[] }[] } }[] };
    };
    const r0 = j?.chart?.result?.[0];
    const ts = r0?.timestamp ?? [];
    const q = r0?.indicators?.quote?.[0];
    if (!q) return { ok: false, source: "yahoo", bars: [], error: "sin quote" };
    const bars: Ohlcv[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = q.close?.[i];
      if (c == null) continue;
      bars.push({ date: new Date(ts[i] * 1000), open: q.open?.[i] ?? null, high: q.high?.[i] ?? null, low: q.low?.[i] ?? null, close: c, volume: q.volume?.[i] ?? null });
    }
    if (!bars.length) return { ok: false, source: "yahoo", bars: [], error: "sin barras" };
    return { ok: true, source: "yahoo", bars };
  } catch (e) {
    return { ok: false, source: "yahoo", bars: [], error: String(e).slice(0, 160) };
  }
}
