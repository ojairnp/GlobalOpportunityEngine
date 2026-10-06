// Seed: crea el universo y ejecuta el pipeline completo con fuentes reales.
// Uso: npx tsx db/seed.ts
import "dotenv/config";
import { runPipeline } from "../api/pipeline";

async function main() {
  console.log("=== GLOBAL OPPORTUNITY ENGINE — seed/pipeline inicial ===");
  const stats = await runPipeline();
  console.log("Resultado:", JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
