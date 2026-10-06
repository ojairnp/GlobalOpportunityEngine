// Regenera el snapshot estático en un entorno sin base de datos persistente.
//
// Pensado para CI (GitHub Actions): el workflow levanta un MySQL efímero y este
// script:
//   1) crea el esquema,
//   2) precarga el historial (detecciones, precios, scores...) desde el snapshot
//      versionado — la base efímera arranca vacía y, sin esto, se perdería el
//      historial acumulado y el rendimiento de detecciones pasadas,
//   3) ejecuta el pipeline real (fuentes públicas),
//   4) consulta los mismos procedimientos tRPC que la interfaz y guarda cada
//      respuesta en public/snapshot/<ruta>.json con el formato wire de superjson
//      ({ json, meta }), igual que lo haría httpBatchLink.
import fs from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import superjson from "superjson";
import { sql } from "drizzle-orm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "public", "snapshot");

process.env.NODE_ENV ??= "development";
process.env.APP_ID ||= "ci-snapshot";
process.env.APP_SECRET ||= "ci-snapshot-secret-0123456789abcdef";

const { getDb } = await import("../api/queries/connection.ts");
const { ensureUniverse, runPipeline } = await import("../api/pipeline.ts");
const { appRouter } = await import("../api/router.ts");
const schema = await import("../db/schema.ts");

const TYPES = ["all", "equity", "crypto", "commodity", "fx", "index"];

// ── 1) Esquema ────────────────────────────────────────────────────────────────
execSync("npx drizzle-kit push --force", { stdio: "inherit", cwd: root });

// ── 2) Precarga de historial desde el snapshot versionado ────────────────────
// Los archivos con entrada variable (radar.detail, radar.opportunities) son un
// mapa { clave: wire }; el resto son un único wire { json, meta }.
function readWire(rel) {
  const file = path.join(OUT, rel);
  if (!fs.existsSync(file)) return null;
  try {
    return superjson.deserialize(JSON.parse(fs.readFileSync(file, "utf-8")));
  } catch {
    return null;
  }
}

function readWireMap(rel) {
  const file = path.join(OUT, rel);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
    const out = {};
    for (const [key, wire] of Object.entries(raw)) out[key] = superjson.deserialize(wire);
    return out;
  } catch {
    return null;
  }
}

// Inserta filas ignorando duplicados (la base efímera puede reutilizarse).
async function insertIgnore(table, rows) {
  if (!rows.length) return;
  const db = getDb();
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    await db.insert(table).values(batch).onDuplicateKeyUpdate({ set: { id: sql`id` } });
  }
}

async function preload() {
  const details = readWireMap("radar.detail.json");
  const history = readWire("radar.history.json");
  if (!details && !history) {
    console.log("Sin snapshot previo: se parte de cero (sin historial).");
    return;
  }

  const assetRows = new Map();
  const scoreRows = new Map();
  const techRows = new Map();
  const thesisRows = new Map();
  const detectionRows = new Map();
  const priceRows = new Map();

  for (const entry of Object.values(details ?? {})) {
    const a = entry?.asset;
    if (a) assetRows.set(a.id, a);
    if (entry?.score) scoreRows.set(entry.score.assetId, entry.score);
    if (entry?.tech) techRows.set(entry.tech.assetId, entry.tech);
    if (entry?.thesis) thesisRows.set(entry.thesis.assetId, entry.thesis);
    for (const d of entry?.detections ?? []) detectionRows.set(d.id, d);
    for (const p of entry?.prices ?? []) priceRows.set(`${p.assetId}:${p.date}`, p);
  }
  for (const row of history ?? []) {
    if (row?.detection) detectionRows.set(row.detection.id, row.detection);
    if (row?.asset && !assetRows.has(row.asset.id)) assetRows.set(row.asset.id, row.asset);
  }

  const perfRows = (readWire("performance.records.json") ?? []).map((r) => r.rec).filter(Boolean);

  await insertIgnore(schema.assets, [...assetRows.values()]);
  await insertIgnore(schema.scores, [...scoreRows.values()]);
  await insertIgnore(schema.technicalSnapshots, [...techRows.values()]);
  await insertIgnore(schema.theses, [...thesisRows.values()]);
  await insertIgnore(schema.detections, [...detectionRows.values()]);
  await insertIgnore(schema.prices, [...priceRows.values()]);
  await insertIgnore(schema.performanceRecords, perfRows);

  console.log(
    `Historial precargado: ${assetRows.size} activos, ${detectionRows.size} detecciones, ` +
      `${priceRows.size} precios, ${perfRows.length} registros de rendimiento.`
  );
}

await preload();

// ── 3) Universo + pipeline real ──────────────────────────────────────────────
await ensureUniverse();
const stats = await runPipeline();
console.log(`Pipeline: ${stats.pricesOk} con precios, ${stats.pricesFail} sin datos`);

// ── 4) Consultar tRPC y guardar el formato wire ──────────────────────────────
const caller = appRouter.createCaller({ req: new Request("http://localhost/"), resHeaders: new Headers() });
fs.mkdirSync(OUT, { recursive: true });

function wire(data) {
  const s = superjson.serialize(data);
  return s.meta === undefined ? { json: s.json } : { json: s.json, meta: s.meta };
}

function save(procedure, data) {
  const file = path.join(OUT, `${procedure}.json`);
  fs.writeFileSync(file, JSON.stringify(wire(data)));
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  ok  ${procedure.padEnd(28)} ${kb} KB`);
}

// Procedimientos con entrada variable: el frontend resuelve la clave (tipo/id)
// y deserializa ESA entrada, así que el archivo es un mapa { clave: wire }.
function saveMap(procedure, map) {
  const file = path.join(OUT, `${procedure}.json`);
  const out = {};
  for (const [key, value] of Object.entries(map)) out[key] = wire(value);
  fs.writeFileSync(file, JSON.stringify(out));
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  ok  ${procedure.padEnd(28)} ${kb} KB`);
}

save("system.status", await caller.system.status());
save("system.audit", await caller.system.audit({ limit: 60 }));
save("macro.overview", await caller.macro.overview());
save("performance.records", await caller.performance.records());
save("performance.byScoreBand", await caller.performance.byScoreBand());
save("radar.history", await caller.radar.history({ limit: 150 }));
save("watchlist.list", await caller.watchlist.list());
save("paper.list", await caller.paper.list());

const opportunities = {};
for (const type of TYPES) {
  opportunities[type] = await caller.radar.opportunities({ type });
  console.log(`  ok  radar.opportunities[${type}]`);
}
saveMap("radar.opportunities", opportunities);

const ids = (opportunities.all?.rows ?? []).map((r) => r.asset.id).filter(Number.isFinite);
console.log(`  -> ${ids.length} activos`);
const details = {};
for (const id of ids) details[String(id)] = await caller.radar.detail({ id });
saveMap("radar.detail", details);

fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), source: "github-actions", assets: ids.length }, null, 2)
);

console.log(`\nSnapshot listo en public/snapshot/ (${ids.length} activos)`);
process.exit(0);
