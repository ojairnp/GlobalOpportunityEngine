import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { DecisionBadge, SourceStatus } from "@/components/widgets";
import { fmtPrice, fmtPct, pctColor, scoreColor, fmtDate, NA } from "@/lib/format";
import { X } from "lucide-react";

export default function WatchlistPage() {
  const { data, isLoading } = trpc.watchlist.list.useQuery();
  const utils = trpc.useUtils();
  const rm = trpc.watchlist.remove.useMutation({ onSuccess: () => utils.watchlist.list.invalidate() });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Watchlist</h1>
        <p className="mt-1 text-xs text-muted-foreground">Activos guardados, sin límite. Los cambios de score se reflejan en cada ejecución del pipeline.</p>
      </div>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-card text-muted-foreground">
              <th className="px-3 py-2 micro-label">Activo</th>
              <th className="px-3 py-2 micro-label text-right">Precio</th>
              <th className="px-3 py-2 micro-label text-center">Opportunity</th>
              <th className="px-3 py-2 micro-label text-center">Entry</th>
              <th className="px-3 py-2 micro-label text-right">3M</th>
              <th className="px-3 py-2 micro-label">Decisión</th>
              <th className="px-3 py-2 micro-label">Añadido</th>
              <th className="px-3 py-2 micro-label text-right">Fuente</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
            {(data ?? []).map(({ w, asset, score, tech }) =>
              asset ? (
                <tr key={String(w.id)} className="border-b border-border/50 hover:bg-accent/40">
                  <td className="px-3 py-2.5">
                    <Link to={`/asset/${asset.id}`} className="font-num font-semibold text-foreground hover:text-primary">{asset.symbol}</Link>
                    <div className="text-[10px] text-muted-foreground">{asset.name}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-num">{fmtPrice(asset.lastPrice ?? tech?.close)}</td>
                  <td className={`px-3 py-2.5 text-center font-num font-bold ${scoreColor(score?.opportunityScore)}`}>
                    {score?.opportunityScore != null ? Math.round(score.opportunityScore) : NA}
                  </td>
                  <td className={`px-3 py-2.5 text-center font-num ${scoreColor(score?.entryScore)}`}>
                    {score?.entryScore != null ? Math.round(score.entryScore) : "—"}
                  </td>
                  <td className={`px-3 py-2.5 text-right font-num ${pctColor(tech?.perf3m)}`}>{fmtPct(tech?.perf3m)}</td>
                  <td className="px-3 py-2.5"><DecisionBadge decision={score?.decision} /></td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">{fmtDate(w.addedAt)}</td>
                  <td className="px-3 py-2.5 text-right"><SourceStatus status={asset.sourceStatus} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => rm.mutate({ assetId: Number(asset.id) })} className="p-2 text-muted-foreground hover:text-red-400 min-h-[44px] min-w-[44px]" aria-label="Quitar">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ) : null
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Watchlist vacía — añade activos desde cualquier ficha (WHY?).</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
