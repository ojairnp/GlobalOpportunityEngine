import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { fmtPct, fmtPrice, fmtDateTime, pctColor, NA } from "@/lib/format";

export default function PerformancePage() {
  const { data: records, isLoading } = trpc.performance.records.useQuery();
  const { data: bands } = trpc.performance.byScoreBand.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Performance / Backtest</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Cada detección se guarda con su precio de descubrimiento y se evalúa a 24h / 7d / 1M / 3M / 6M / 1A contra benchmark.
          Sin sesgo de supervivencia: las señales malas nunca se borran. Sin look-ahead: solo precios conocidos en cada fecha.
        </p>
      </div>

      <div>
        <h2 className="micro-label mb-2">Rendimiento por banda de Opportunity Score</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(bands ?? []).map((b) => (
            <div key={b.band} className="rounded border border-border bg-card p-4 text-center">
              <div className="micro-label">Score {b.band}</div>
              <div className={`font-num mt-2 text-xl font-bold ${pctColor(b.avgReturn)}`}>
                {b.avgReturn != null ? fmtPct(b.avgReturn) : NA}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                {b.count} evaluaciones{b.avgAlpha != null ? ` · alpha ${fmtPct(b.avgAlpha)}` : ""}
              </div>
            </div>
          ))}
        </div>
        {(bands ?? []).every((b) => b.count === 0) && (
          <p className="mt-2 text-xs text-muted-foreground">
            Aún no hay detecciones con la antigüedad suficiente para evaluar. Los resultados aparecerán automáticamente
            cuando las detecciones cumplan cada horizonte (24h, 7d, 1M…).
          </p>
        )}
      </div>

      <div>
        <h2 className="micro-label mb-2">Registro de evaluaciones</h2>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-3 py-2 micro-label">Activo</th>
                <th className="px-3 py-2 micro-label">Detección</th>
                <th className="px-3 py-2 micro-label">Fecha</th>
                <th className="px-3 py-2 micro-label text-right">Precio detección</th>
                <th className="px-3 py-2 micro-label">Horizonte</th>
                <th className="px-3 py-2 micro-label text-right">Retorno</th>
                <th className="px-3 py-2 micro-label text-right">Benchmark</th>
                <th className="px-3 py-2 micro-label text-right">Alpha</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>
              )}
              {(records ?? []).map(({ rec, detection, asset }) => (
                <tr key={String(rec.id)} className="border-b border-border/50">
                  <td className="px-3 py-2">
                    {asset ? (
                      <Link to={`/asset/${asset.id}`} className="font-num font-semibold text-foreground hover:text-primary">{asset.symbol}</Link>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{detection?.type}</td>
                  <td className="px-3 py-2 text-[11px]">{detection ? fmtDateTime(detection.ts) : "—"}</td>
                  <td className="px-3 py-2 text-right font-num">{fmtPrice(detection?.priceAtDetection)}</td>
                  <td className="px-3 py-2 font-num">{rec.horizon}</td>
                  <td className={`px-3 py-2 text-right font-num ${pctColor(rec.returnPct)}`}>{fmtPct(rec.returnPct)}</td>
                  <td className={`px-3 py-2 text-right font-num ${pctColor(rec.benchmarkReturnPct)}`}>{fmtPct(rec.benchmarkReturnPct)}</td>
                  <td className={`px-3 py-2 text-right font-num font-semibold ${pctColor(rec.alpha)}`}>{fmtPct(rec.alpha)}</td>
                </tr>
              ))}
              {!isLoading && (records ?? []).length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Sin evaluaciones todavía — el sistema las genera al cumplirse cada horizonte.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
