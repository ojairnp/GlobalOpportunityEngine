import { trpc } from "@/providers/trpc";
import { fmtPrice, fmtPct, pctColor, NA } from "@/lib/format";
import { SourceStatus } from "@/components/widgets";

export default function MacroPage() {
  const { data, isLoading } = trpc.macro.overview.useQuery();

  const fx = (data ?? []).filter((r) => r.asset.type === "fx");
  const idx = (data ?? []).filter((r) => r.asset.type === "index");

  const Section = ({ title, rows }: { title: string; rows: typeof fx }) => (
    <div>
      <h2 className="micro-label mb-2">{title}</h2>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-card text-muted-foreground">
              <th className="px-3 py-2 micro-label">Instrumento</th>
              <th className="px-3 py-2 micro-label text-right">Nivel</th>
              <th className="px-3 py-2 micro-label text-right">1M</th>
              <th className="px-3 py-2 micro-label text-right">3M</th>
              <th className="px-3 py-2 micro-label text-right">1A</th>
              <th className="px-3 py-2 micro-label">Estado</th>
              <th className="px-3 py-2 micro-label text-right">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ asset, tech }) => (
              <tr key={String(asset.id)} className="border-b border-border/50">
                <td className="px-3 py-2">
                  <span className="font-num font-semibold text-foreground">{asset.symbol}</span>
                  <span className="ml-2 text-[10px] text-muted-foreground">{asset.name}</span>
                </td>
                <td className="px-3 py-2 text-right font-num">{fmtPrice(asset.lastPrice ?? tech?.close)}</td>
                <td className={`px-3 py-2 text-right font-num ${pctColor(tech?.perf1m)}`}>{fmtPct(tech?.perf1m)}</td>
                <td className={`px-3 py-2 text-right font-num ${pctColor(tech?.perf3m)}`}>{fmtPct(tech?.perf3m)}</td>
                <td className={`px-3 py-2 text-right font-num ${pctColor(tech?.perf1y)}`}>{fmtPct(tech?.perf1y)}</td>
                <td className="px-3 py-2 text-[11px]">{tech?.state ?? NA}</td>
                <td className="px-3 py-2 text-right"><SourceStatus status={asset.sourceStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Macro Engine — básico (Fase 1)</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Contexto macro con datos verificables: divisas (tipos oficiales BCE vía Frankfurter) e índices globales.
          El macro no filtra — contextualiza. Inflación, tasas, PMI y curvas por país llegan en Fase 2 (FRED / bancos centrales).
        </p>
      </div>
      {isLoading ? (
        <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">Cargando…</div>
      ) : (
        <>
          <Section title="Divisas (tipos oficiales BCE)" rows={fx} />
          <Section title="Índices globales" rows={idx} />
        </>
      )}
    </div>
  );
}
