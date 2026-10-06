import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  double,
  boolean,
  json,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

// ------------------------------------------------------------------
// Core entities — Global Opportunity Engine (Fase 1)
// FK rule: columns referencing serial() PKs use bigint unsigned number
// ------------------------------------------------------------------

export const assets = mysqlTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 40 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 16 }).notNull(), // equity | crypto | commodity | fx | index
    market: varchar("market", { length: 40 }).notNull().default(""),
    country: varchar("country", { length: 8 }).notNull().default(""),
    currency: varchar("currency", { length: 8 }).notNull().default("USD"),
    sector: varchar("sector", { length: 80 }).notNull().default(""),
    industry: varchar("industry", { length: 128 }).notNull().default(""),
    themes: json("themes").$type<string[]>(),
    // per-source native symbols: { nasdaq?, eodhd?, coingecko?, stooq?, yahoo?, cnbc?, frankfurter? }
    sourceMeta: json("source_meta").$type<Record<string, string>>(),
    hasData: boolean("has_data").notNull().default(false),
    sourceStatus: varchar("source_status", { length: 24 }).notNull().default("PENDING"),
    lastPrice: double("last_price"),
    lastPriceAt: timestamp("last_price_at"),
    discoveryPrice: double("discovery_price"),
    discoveryAt: timestamp("discovery_at"),
    marketCap: double("market_cap"),
    isBenchmark: boolean("is_benchmark").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [uniqueIndex("assets_symbol_type_uq").on(t.symbol, t.type)]
);

export const prices = mysqlTable(
  "prices",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    date: timestamp("date").notNull(),
    open: double("open"),
    high: double("high"),
    low: double("low"),
    close: double("close").notNull(),
    volume: double("volume"),
    source: varchar("source", { length: 40 }).notNull(),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("prices_asset_date_uq").on(t.assetId, t.date), index("prices_asset_idx").on(t.assetId)]
);

export const technicalSnapshots = mysqlTable(
  "technical_snapshots",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    asOf: timestamp("as_of").notNull(),
    close: double("close"),
    ema20: double("ema20"),
    ema50: double("ema50"),
    sma100: double("sma100"),
    sma200: double("sma200"),
    rsi14: double("rsi14"),
    macd: double("macd"),
    macdSignal: double("macd_signal"),
    macdHist: double("macd_hist"),
    atr14: double("atr14"),
    atrPct: double("atr_pct"),
    avgVol20: double("avg_vol20"),
    volumeRatio: double("volume_ratio"),
    high52w: double("high_52w"),
    low52w: double("low_52w"),
    pos52w: double("pos_52w"),
    perf1w: double("perf_1w"),
    perf1m: double("perf_1m"),
    perf3m: double("perf_3m"),
    perf6m: double("perf_6m"),
    perf1y: double("perf_1y"),
    relStrength: double("rel_strength"), // vs benchmark, 3M
    state: varchar("state", { length: 24 }).notNull().default("NO_TRADE"),
    hasData: boolean("has_data").notNull().default(false),
    computedAt: timestamp("computed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tech_asset_uq").on(t.assetId)]
);

export const fundamentals = mysqlTable(
  "fundamentals",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    metric: varchar("metric", { length: 48 }).notNull(), // marketCap, pe, targetPrice, week52High...
    value: double("value"),
    hasData: boolean("has_data").notNull().default(false),
    period: varchar("period", { length: 16 }).notNull().default("latest"),
    source: varchar("source", { length: 48 }).notNull(),
    fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fund_asset_metric_uq").on(t.assetId, t.metric, t.period)]
);

export const macroSnapshots = mysqlTable(
  "macro_snapshots",
  {
    id: serial("id").primaryKey(),
    country: varchar("country", { length: 8 }).notNull(),
    metric: varchar("metric", { length: 48 }).notNull(),
    value: double("value"),
    hasData: boolean("has_data").notNull().default(false),
    source: varchar("source", { length: 48 }).notNull(),
    ts: timestamp("ts").notNull().defaultNow(),
  },
  (t) => [index("macro_country_idx").on(t.country)]
);

export const newsEvents = mysqlTable(
  "news_events",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }),
    title: varchar("title", { length: 512 }).notNull(),
    summary: text("summary"),
    url: varchar("url", { length: 640 }),
    source: varchar("source", { length: 64 }).notNull(),
    publishedAt: timestamp("published_at"),
    impactState: varchar("impact_state", { length: 24 }).notNull().default("NO_MATERIAL_IMPACT"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("news_asset_idx").on(t.assetId)]
);

export const scores = mysqlTable(
  "scores",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    ts: timestamp("ts").notNull().defaultNow(),
    technicalScore: double("technical_score"),
    entryScore: double("entry_score"),
    riskScore: double("risk_score"), // higher = riskier
    fomoScore: double("fomo_score"),
    fundamentalScore: double("fundamental_score"),
    valuationScore: double("valuation_score"),
    earlyScore: double("early_score"), // crypto
    opportunityScore: double("opportunity_score"),
    asymmetryScore: double("asymmetry_score"),
    decision: varchar("decision", { length: 24 }).notNull().default("REJECT"),
    horizon: varchar("horizon", { length: 16 }).notNull().default("SWING"),
    tacticalState: varchar("tactical_state", { length: 24 }),
    // component detail, missing-data flags, fair value scenarios
    payload: json("payload").$type<Record<string, unknown>>(),
  },
  (t) => [uniqueIndex("scores_asset_uq").on(t.assetId)]
);

export const theses = mysqlTable(
  "theses",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    ts: timestamp("ts").notNull().defaultNow(),
    whyAppeared: text("why_appeared"),
    assetContext: text("asset_context"),
    improving: text("improving"),
    marketMissing: text("market_missing"),
    catalysts: text("catalysts"),
    risks: text("risks"),
    entryCondition: text("entry_condition"),
    invalidation: text("invalidation"),
    horizon: varchar("horizon", { length: 16 }).notNull().default("SWING"),
    confidence: varchar("confidence", { length: 16 }).notNull().default("LOW"),
    status: varchar("status", { length: 16 }).notNull().default("ACTIVE"), // ACTIVE | INVALIDATED | EXPIRED
  },
  (t) => [index("theses_asset_idx").on(t.assetId)]
);

export const detections = mysqlTable(
  "detections",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    ts: timestamp("ts").notNull().defaultNow(),
    type: varchar("type", { length: 40 }).notNull(), // BREAKOUT, ACCUMULATION_START, FOMO_ALERT...
    priceAtDetection: double("price_at_detection"),
    summary: varchar("summary", { length: 640 }),
    payload: json("payload").$type<Record<string, unknown>>(),
    status: varchar("status", { length: 16 }).notNull().default("ACTIVE"), // ACTIVE | CLOSED — nunca se borran
  },
  (t) => [index("detections_asset_idx").on(t.assetId), index("detections_ts_idx").on(t.ts)]
);

export const watchlist = mysqlTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    notes: varchar("notes", { length: 512 }),
  },
  (t) => [uniqueIndex("watchlist_asset_uq").on(t.assetId)]
);

export const paperTrades = mysqlTable(
  "paper_trades",
  {
    id: serial("id").primaryKey(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }).notNull(),
    direction: varchar("direction", { length: 8 }).notNull().default("LONG"),
    entryTs: timestamp("entry_ts").notNull().defaultNow(),
    entryPrice: double("entry_price").notNull(),
    stop: double("stop"),
    target: double("target"),
    fees: double("fees").notNull().default(0),
    slippage: double("slippage").notNull().default(0),
    status: varchar("status", { length: 16 }).notNull().default("OPEN"), // OPEN | CLOSED
    exitTs: timestamp("exit_ts"),
    exitPrice: double("exit_price"),
    resultPct: double("result_pct"),
    notes: varchar("notes", { length: 512 }),
  },
  (t) => [index("paper_asset_idx").on(t.assetId)]
);

export const performanceRecords = mysqlTable(
  "performance_records",
  {
    id: serial("id").primaryKey(),
    detectionId: bigint("detection_id", { mode: "number", unsigned: true }).notNull(),
    horizon: varchar("horizon", { length: 8 }).notNull(), // 1M 3M 6M 1Y | 24h 7d 30d
    returnPct: double("return_pct"),
    benchmarkReturnPct: double("benchmark_return_pct"),
    alpha: double("alpha"),
    evaluatedAt: timestamp("evaluated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("perf_det_horizon_uq").on(t.detectionId, t.horizon)]
);

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    ts: timestamp("ts").notNull().defaultNow(),
    actor: varchar("actor", { length: 32 }).notNull().default("system"),
    action: varchar("action", { length: 64 }).notNull(),
    detail: text("detail"),
  },
  (t) => [index("audit_ts_idx").on(t.ts)]
);

export const dataQuality = mysqlTable(
  "data_quality",
  {
    id: serial("id").primaryKey(),
    source: varchar("source", { length: 48 }).notNull(),
    assetId: bigint("asset_id", { mode: "number", unsigned: true }),
    field: varchar("field", { length: 64 }).notNull(),
    status: varchar("status", { length: 16 }).notNull(), // OK | DATA_UNAVAILABLE | ERROR | STALE
    message: varchar("message", { length: 512 }),
    ts: timestamp("ts").notNull().defaultNow(),
  },
  (t) => [index("dq_source_idx").on(t.source), index("dq_ts_idx").on(t.ts)]
);

export type Asset = typeof assets.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type TechnicalSnapshot = typeof technicalSnapshots.$inferSelect;
export type Score = typeof scores.$inferSelect;
export type Thesis = typeof theses.$inferSelect;
export type Detection = typeof detections.$inferSelect;
export type PaperTrade = typeof paperTrades.$inferSelect;
export type MacroSnapshot = typeof macroSnapshots.$inferSelect;
