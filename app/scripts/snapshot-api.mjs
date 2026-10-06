// Genera el "snapshot" estático que consume el frontend en modo GitHub Pages.
//
// Recorre los procedimientos tRPC que usa la interfaz, los consulta contra una
// instancia real en marcha y guarda cada respuesta en public/snapshot/<ruta>.json.
// Los procedimientos con entrada variable (radar.opportunities por tipo y
// radar.detail por id) se guardan como mapa { clave: datos }.
//
// Uso:
//   node scripts/snapshot-api.mjs [baseUrl]
//   (por defecto http://127.0.0.1:12000)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.argv[2] ?? "http://127.0.0.1:12000").replace(/\/+$/, "");
const OUT = path.join(root, "public", "snapshot");

const TYPES = ["all", "equity", "crypto", "commodity", "fx", "index"];

function url(procedure, input) {
  const batchInput = JSON.stringify({ "0": { json: input ?? null } });
  return `${BASE}/api/trpc/${procedure}?batch=1&input=${encodeURIComponent(batchInput)}`;
}

async function query(procedure, input) {
  const res = await fetch(url(procedure, input));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const payload = await res.json();
  const entry = Array.isArray(payload) ? payload[0] : payload;
  if (entry?.error) throw new Error(entry.error.json?.message ?? "error tRPC");
  const data = entry?.result?.data;
  if (!data) throw new Error("respuesta sin datos");
  return data;
}

function save(procedure, data) {
  const file = path.join(OUT, `${procedure}.json`);
  fs.writeFileSync(file, JSON.stringify(data));
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`  ok  ${procedure.padEnd(28)} ${kb} KB`);
}

const written = [];
async function capture(procedure, input) {
  try {
    const data = await query(procedure, input);
    save(procedure, data);
    written.push(procedure);
    return data;
  } catch (e) {
    console.error(`  ERR ${procedure}: ${e.message}`);
    return null;
  }
}

console.log(`Generando snapshot desde ${BASE}`);
fs.mkdirSync(OUT, { recursive: true });

// 1) Procedimientos globales (sin entrada variable).
await capture("system.status");
await capture("system.audit", { limit: 60 });
await capture("macro.overview");
await capture("performance.records");
await capture("performance.byScoreBand");
await capture("radar.history", { limit: 150 });
await capture("watchlist.list");
await capture("paper.list");

// 2) Oportunidades por tipo -> mapa { all|equity|...: datos }.
const opportunities = {};
for (const type of TYPES) {
  try {
    opportunities[type] = await query("radar.opportunities", { type });
    console.log(`  ok  radar.opportunities[${type}]`);
  } catch (e) {
    console.error(`  ERR radar.opportunities[${type}]: ${e.message}`);
  }
}
save("radar.opportunities", opportunities);
written.push("radar.opportunities");

// 3) Ficha por activo -> mapa { "<id>": datos }.
const ids = (opportunities.all?.json?.rows ?? [])
  .map((r) => r.asset.id)
  .filter((n) => Number.isFinite(n));
console.log(`  -> ${ids.length} activos`);
const details = {};
for (const id of ids) {
  try {
    details[String(id)] = await query("radar.detail", { id });
  } catch (e) {
    console.error(`  ERR radar.detail[${id}]: ${e.message}`);
  }
}
save("radar.detail", details);
written.push("radar.detail");

fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), source: BASE, assets: ids.length },
    null,
    2
  )
);

console.log(`\nSnapshot listo: ${written.length} archivos en public/snapshot/ (${ids.length} activos)`);
