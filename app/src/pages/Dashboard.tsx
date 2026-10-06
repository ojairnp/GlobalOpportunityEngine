import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { OpportunityTable } from "@/components/OpportunityTable";
import { Stat } from "@/components/widgets";
import { DECISION_STYLES } from "@/lib/format";

const TYPES = [
  { key: "all", label: "Todos" },
  { key: "equity", label: "Acciones" },
  { key: "crypto", label: "Cripto" },
  { key: "commodity", label: "Commodities" },
  { key: "fx", label: "FX" },
  { key: "index", label: "Índices" },
] as const;

export default function Dashboard() {
  const [type, setType] = useState<string>("all");
  const { data, isLoading } = trpc.radar.opportunities.useQuery({ type: type as never });
  const sparks = (data?.sparks ?? {}) as Record<string, number[]>;
  const { data: status } = trpc.system.status.useQuery();

  const rows = (data?.rows ?? []) as never[];
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows as { score: { decision: string } | null }[]) {
      const d = r.score?.decision ?? "REJECT";
      c[d] = (c[d] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const buyZones = (rows as { score: { decision: string } | null }[]).filter((r) => r.score?.decision === "BUY_ZONE").length;
  const fomoAlerts = (rows as { score: { fomoScore: number | null } | null }[]).filter((r) => (r.score?.fomoScore ?? 0) >= 55).length;
  const withData = (rows as { asset: { hasData: boolean } }[]).filter((r) => r.asset.hasData).length;
  const lastRun = status?.lastRuns?.[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Oportunidades activas</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Miles de activos → filtrar → cruzar datos → detectar anomalías → tesis → riesgo → entrada.{" "}
            <span className="text-primary">La decisión final es tuya.</span>
          </p>
        </div>
        {lastRun && (
          <p className="text-[10px] text-muted-foreground">
            Último pipeline: {new Date(lastRun.ts).toLocaleString("es-MX")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Activos con datos" value={withData} hint={`de ${rows.length} en universo`} />
        <Stat label="Zona de compra" value={<span className="text-emerald-400">{buyZones}</span>} hint="decisión BUY ZONE" />
        <Stat label="Alertas FOMO" value={<span className="text-red-400">{fomoAlerts}</span>} hint="FOMO score ≥ 55" />
        <Stat
          label="Cobertura de fuentes"
          value={status ? `${status.assetCounts.filter((c) => c.sourceStatus === "OK").reduce((a, c) => a + Number(c.n), 0)}` : "—"}
          hint="activos con fuente OK"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`rounded-sm border px-3 py-2 text-xs font-medium transition-colors min-h-[44px] ${
              type === t.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {Object.entries(counts).map(([d, n]) => (
          <span key={d} className="text-[10px] text-muted-foreground">
            <span className={DECISION_STYLES[d]?.cls.split(" ")[1] ?? ""}>{DECISION_STYLES[d]?.label ?? d}</span>
            <span className="font-num"> × {n}</span>
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <OpportunityTable rows={rows} sparks={sparks} />
      )}
    </div>
  );
}
