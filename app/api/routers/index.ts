import { z } from "zod";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  assets, prices, technicalSnapshots, scores, theses, detections,
  watchlist, paperTrades, performanceRecords, auditLog, dataQuality,
  macroSnapshots, fundamentals,
} from "@db/schema";
import { runPipeline } from "../pipeline";

const typeFilter = z.enum(["all", "equity", "crypto", "commodity", "fx", "index"]).default("all");

export const radarRouter = createRouter({
  opportunities: publicQuery
    .input(z.object({ type: typeFilter, decision: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conds = [eq(assets.active, true), eq(assets.isBenchmark, false)];
      if (input?.type && input.type !== "all") conds.push(eq(assets.type, input.type));
      const rows = await db
        .select({ asset: assets, score: scores, tech: technicalSnapshots })
        .from(assets)
        .leftJoin(scores, eq(scores.assetId, assets.id))
        .leftJoin(technicalSnapshots, eq(technicalSnapshots.assetId, assets.id))
        .where(and(...conds));
      const filtered = input?.decision ? rows.filter((r) => r.score?.decision === input.decision) : rows;
      // sparklines: últimos 90 cierres por activo (una sola consulta agrupada)
      const allPrices = await db
        .select({ assetId: prices.assetId, date: prices.date, close: prices.close })
        .from(prices)
        .orderBy(prices.date);
      const sparkMap: Record<string, number[]> = {};
      for (const p of allPrices) {
        const key = String(p.assetId);
        (sparkMap[key] ??= []).push(p.close);
        if (sparkMap[key].length > 90) sparkMap[key].shift();
      }
      return {
        rows: filtered.sort((a, b) => (b.score?.opportunityScore ?? -1) - (a.score?.opportunityScore ?? -1)),
        sparks: sparkMap,
      };
    }),

  detail: publicQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [asset] = await db.select().from(assets).where(eq(assets.id, input.id)).limit(1);
    if (!asset) throw new Error("Asset not found");
    const [score] = await db.select().from(scores).where(eq(scores.assetId, input.id)).limit(1);
    const [tech] = await db.select().from(technicalSnapshots).where(eq(technicalSnapshots.assetId, input.id)).limit(1);
    const thesisRows = await db.select().from(theses).where(eq(theses.assetId, input.id)).orderBy(desc(theses.ts)).limit(1);
    const dets = await db.select().from(detections).where(eq(detections.assetId, input.id)).orderBy(desc(detections.ts)).limit(30);
    const funds = await db.select().from(fundamentals).where(eq(fundamentals.assetId, input.id));
    const priceRows = await db.select().from(prices).where(eq(prices.assetId, input.id)).orderBy(desc(prices.date)).limit(260);
    const [wl] = await db.select().from(watchlist).where(eq(watchlist.assetId, input.id)).limit(1);
    return {
      asset, score: score ?? null, tech: tech ?? null,
      thesis: thesisRows[0] ?? null, detections: dets, fundamentals: funds,
      prices: priceRows.reverse(), inWatchlist: !!wl,
    };
  }),

  history: publicQuery.input(z.object({ limit: z.number().default(100) }).optional()).query(async ({ input }) => {
    const db = getDb();
    const rows = await db
      .select({ detection: detections, asset: assets })
      .from(detections)
      .leftJoin(assets, eq(assets.id, detections.assetId))
      .orderBy(desc(detections.ts))
      .limit(input?.limit ?? 100);
    return rows;
  }),
});

export const watchlistRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select({ w: watchlist, asset: assets, score: scores, tech: technicalSnapshots })
      .from(watchlist)
      .leftJoin(assets, eq(assets.id, watchlist.assetId))
      .leftJoin(scores, eq(scores.assetId, assets.id))
      .leftJoin(technicalSnapshots, eq(technicalSnapshots.assetId, assets.id))
      .orderBy(desc(watchlist.addedAt));
  }),
  add: publicQuery.input(z.object({ assetId: z.number(), notes: z.string().optional() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.insert(watchlist).values({ assetId: input.assetId, notes: input.notes }).onDuplicateKeyUpdate({ set: { notes: input.notes } });
    await db.insert(auditLog).values({ actor: "user", action: "watchlist_add", detail: `assetId=${input.assetId}` });
    return { ok: true };
  }),
  remove: publicQuery.input(z.object({ assetId: z.number() })).mutation(async ({ input }) => {
    const db = getDb();
    await db.delete(watchlist).where(eq(watchlist.assetId, input.assetId));
    await db.insert(auditLog).values({ actor: "user", action: "watchlist_remove", detail: `assetId=${input.assetId}` });
    return { ok: true };
  }),
});

export const paperRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select({ trade: paperTrades, asset: assets })
      .from(paperTrades)
      .leftJoin(assets, eq(assets.id, paperTrades.assetId))
      .orderBy(desc(paperTrades.entryTs));
  }),
  create: publicQuery
    .input(z.object({
      assetId: z.number(), direction: z.enum(["LONG", "SHORT"]).default("LONG"),
      entryPrice: z.number().positive(), stop: z.number().optional(), target: z.number().optional(),
      fees: z.number().default(0), slippage: z.number().default(0), notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(paperTrades).values({ ...input, status: "OPEN" });
      await db.insert(auditLog).values({ actor: "user", action: "paper_trade_open", detail: JSON.stringify(input).slice(0, 400) });
      return { ok: true };
    }),
  close: publicQuery.input(z.object({ id: z.number(), exitPrice: z.number().positive() })).mutation(async ({ input }) => {
    const db = getDb();
    const [tr] = await db.select().from(paperTrades).where(eq(paperTrades.id, input.id)).limit(1);
    if (!tr) throw new Error("Trade not found");
    const dir = tr.direction === "SHORT" ? -1 : 1;
    const resultPct = ((input.exitPrice - tr.entryPrice) / tr.entryPrice) * 100 * dir - tr.fees - tr.slippage;
    await db.update(paperTrades)
      .set({ status: "CLOSED", exitTs: new Date(), exitPrice: input.exitPrice, resultPct })
      .where(eq(paperTrades.id, input.id));
    await db.insert(auditLog).values({ actor: "user", action: "paper_trade_close", detail: `id=${input.id} result=${resultPct.toFixed(2)}%` });
    return { ok: true, resultPct };
  }),
});

export const performanceRouter = createRouter({
  records: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select({ rec: performanceRecords, detection: detections, asset: assets })
      .from(performanceRecords)
      .leftJoin(detections, eq(detections.id, performanceRecords.detectionId))
      .leftJoin(assets, eq(assets.id, detections.assetId))
      .orderBy(desc(performanceRecords.evaluatedAt))
      .limit(300);
  }),
  byScoreBand: publicQuery.query(async () => {
    const db = getDb();
    // rendimiento medio por banda de opportunity score en el momento de la detección
    const rows = await db
      .select({ rec: performanceRecords, detection: detections, score: scores, asset: assets })
      .from(performanceRecords)
      .leftJoin(detections, eq(detections.id, performanceRecords.detectionId))
      .leftJoin(assets, eq(assets.id, detections.assetId))
      .leftJoin(scores, eq(scores.assetId, detections.assetId));
    const bands: Record<string, { n: number; sum: number; alphaSum: number; alphaN: number }> = {
      "0-59": { n: 0, sum: 0, alphaSum: 0, alphaN: 0 },
      "60-69": { n: 0, sum: 0, alphaSum: 0, alphaN: 0 },
      "70-79": { n: 0, sum: 0, alphaSum: 0, alphaN: 0 },
      "80-100": { n: 0, sum: 0, alphaSum: 0, alphaN: 0 },
    };
    for (const r of rows) {
      const sc = r.score?.opportunityScore;
      if (sc == null || r.rec.returnPct == null) continue;
      const band = sc < 60 ? "0-59" : sc < 70 ? "60-69" : sc < 80 ? "70-79" : "80-100";
      bands[band].n++;
      bands[band].sum += r.rec.returnPct;
      if (r.rec.alpha != null) { bands[band].alphaSum += r.rec.alpha; bands[band].alphaN++; }
    }
    return Object.entries(bands).map(([band, v]) => ({
      band, count: v.n,
      avgReturn: v.n ? v.sum / v.n : null,
      avgAlpha: v.alphaN ? v.alphaSum / v.alphaN : null,
    }));
  }),
});

export const macroRouter = createRouter({
  snapshots: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(macroSnapshots).orderBy(desc(macroSnapshots.ts)).limit(200);
  }),
  // Vista macro derivada de datos reales: divisas (Frankfurter/BCE) + índices
  overview: publicQuery.query(async () => {
    const db = getDb();
    const fx = await db
      .select({ asset: assets, tech: technicalSnapshots })
      .from(assets)
      .leftJoin(technicalSnapshots, eq(technicalSnapshots.assetId, assets.id))
      .where(inArray(assets.type, ["fx", "index"]));
    return fx;
  }),
});

export const systemRouter = createRouter({
  status: publicQuery.query(async () => {
    const db = getDb();
    const quality = await db
      .select({ source: dataQuality.source, status: dataQuality.status, n: sql<number>`count(*)` })
      .from(dataQuality)
      .groupBy(dataQuality.source, dataQuality.status)
      .orderBy(desc(sql`max(${dataQuality.ts})`))
      .limit(60);
    const lastRuns = await db.select().from(auditLog).where(eq(auditLog.action, "pipeline_run")).orderBy(desc(auditLog.ts)).limit(5);
    const assetCounts = await db
      .select({ type: assets.type, sourceStatus: assets.sourceStatus, n: sql<number>`count(*)` })
      .from(assets)
      .groupBy(assets.type, assets.sourceStatus);
    return { quality, lastRuns, assetCounts };
  }),
  audit: publicQuery.input(z.object({ limit: z.number().default(80) }).optional()).query(async ({ input }) => {
    return getDb().select().from(auditLog).orderBy(desc(auditLog.ts)).limit(input?.limit ?? 80);
  }),
  refresh: publicQuery.mutation(async () => {
    // Ejecuta el pipeline completo bajo demanda
    const stats = await runPipeline();
    return { ok: true, stats };
  }),
});
