import { useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { OpportunityTable } from "@/components/OpportunityTable";

const META: Record<string, { title: string; desc: string; types: string[] }> = {
  equity: {
    title: "Global Equity Radar",
    desc: "¿Qué empresa está mejorando más rápido de lo que su precio refleja? Cobertura Fase 1: USA · México · Japón · Reino Unido. Pipeline: universo → liquidez → aceleración → valuación → técnico → entrada → decisión.",
    types: ["equity"],
  },
  crypto: {
    title: "Crypto Early Radar",
    desc: "Detectar tokens antes del FOMO: EARLY SCORE combina market cap, aceleración 24h/7d y ranking. Análisis on-chain (honeypot, taxes, holders) vía DexScreener cuando la red lo permite; si no, DATA UNAVAILABLE.",
    types: ["crypto"],
  },
  cfd: {
    title: "CFD / Tactical Radar",
    desc: "Commodities, índices y FX con lógica táctica: momentum, soportes, ATR, volatilidad, estacionalidad. Estados: STRONG LONG · LONG WATCH · BREAKOUT · MEAN REVERSION · NO TRADE…",
    types: ["commodity", "fx", "index"],
  },
};

export default function RadarPage() {
  const { kind = "equity" } = useParams();
  const meta = META[kind] ?? META.equity;
  const { data, isLoading } = trpc.radar.opportunities.useQuery({ type: "all" });
  const rows = ((data?.rows ?? []) as { asset: { type: string } }[]).filter((r) => meta.types.includes(r.asset.type));
  const sparks = (data?.sparks ?? {}) as Record<string, number[]>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{meta.title}</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{meta.desc}</p>
      </div>
      {kind === "cfd" && (
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-3 py-2 micro-label">Activo</th>
                <th className="px-3 py-2 micro-label text-center">Estado táctico</th>
                <th className="px-3 py-2 micro-label text-right">ATR%</th>
                <th className="px-3 py-2 micro-label text-right">RSI(14)</th>
                <th className="px-3 py-2 micro-label text-right">Pos 52w</th>
              </tr>
            </thead>
            <tbody>
              {(rows as never[]).map((r) => {
                const row = r as {
                  asset: { id: number; symbol: string };
                  score: { tacticalState: string | null } | null;
                  tech: { atrPct: number | null; rsi14: number | null; pos52w: number | null } | null;
                };
                return (
                  <tr key={row.asset.id} className="border-b border-border/50">
                    <td className="px-3 py-2 font-num font-semibold">{row.asset.symbol}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="rounded-sm border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                        {row.score?.tacticalState ?? "DATA UNAVAILABLE"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-num">{row.tech?.atrPct?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-num">{row.tech?.rsi14?.toFixed(0) ?? "—"}</td>
                    <td className="px-3 py-2 text-right font-num">{row.tech?.pos52w?.toFixed(0) ?? "—"}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {isLoading ? (
        <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <OpportunityTable rows={rows as never[]} sparks={sparks} />
      )}
    </div>
  );
}
