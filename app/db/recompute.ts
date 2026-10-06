// Recompute offline: regenera scores y tesis desde los precios almacenados (sin red).
import "dotenv/config";
import { getDb } from "../api/queries/connection";
import { assets, theses } from "./schema";
import { eq } from "drizzle-orm";
import { computeTechnical } from "../api/engines/technical";
import { computeScores } from "../api/engines/scoring";
import { buildThesis } from "../api/engines/thesis";
import { prices, technicalSnapshots, scores } from "./schema";
import { desc } from "drizzle-orm";

async function main() {
  const db = getDb();
  await db.delete(theses); // regenerar todas con el precio correcto
  const all = await db.select().from(assets).where(eq(assets.active, true));
  for (const a of all) {
    const rows = await db.select().from(prices).where(eq(prices.assetId, a.id)).orderBy(prices.date).limit(500);
    const bars = rows.map((r) => ({ date: new Date(r.date), open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }));
    const t = computeTechnical(bars);
    const closes = bars.map((b) => b.close);
    const s = computeScores(a.type, t, closes, { hasFundamentals: false });
    await db.insert(scores).values({
      assetId: a.id, technicalScore: s.technicalScore, entryScore: s.entryScore, riskScore: s.riskScore,
      fomoScore: s.fomoScore, earlyScore: s.earlyScore, opportunityScore: s.opportunityScore,
      asymmetryScore: s.asymmetryScore, decision: s.decision, horizon: s.horizon, tacticalState: s.tacticalState, payload: s.payload,
    }).onDuplicateKeyUpdate({
      set: { ts: new Date(), technicalScore: s.technicalScore, entryScore: s.entryScore, riskScore: s.riskScore,
        fomoScore: s.fomoScore, earlyScore: s.earlyScore, opportunityScore: s.opportunityScore,
        asymmetryScore: s.asymmetryScore, decision: s.decision, horizon: s.horizon, tacticalState: s.tacticalState, payload: s.payload },
    });
    const th = buildThesis({ symbol: a.symbol, name: a.name, type: a.type, market: a.market, country: a.country, sector: a.sector, lastPrice: t.close ?? a.lastPrice }, t, s);
    await db.insert(theses).values({ assetId: a.id, ...th });
  }
  console.log("recompute ok:", all.length, "activos");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
