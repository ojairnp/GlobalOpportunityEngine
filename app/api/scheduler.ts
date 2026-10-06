// Scheduler de jobs programados (Fase 1)
// - Pipeline completo (precios + scores + tesis): cada 60 min
// - Refresh de quotes ligeras: incluido en el pipeline
// Frecuencias futuras por capa: cripto 15m, equities intradía, fundamentales diario.
import { runPipeline } from "./pipeline";

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startScheduler() {
  if (timer) return;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runPipeline();
    } catch (e) {
      console.error("[scheduler] pipeline error:", e);
    } finally {
      running = false;
    }
  };
  // primer refresh a los 2 minutos de arranque, luego cada hora
  setTimeout(tick, 120_000);
  timer = setInterval(tick, 60 * 60 * 1000);
  console.log("[scheduler] started — pipeline cada 60 min");
}
