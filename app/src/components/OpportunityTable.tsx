import { Link } from "react-router";
import { DecisionBadge, SourceStatus, Sparkline } from "./widgets";
import { fmtPrice, fmtPct, pctColor, scoreColor, TYPE_LABELS, NA } from "@/lib/format";

export interface OpportunityRow {
  asset: {
    id: number | bigint;
    symbol: string;
    name: string;
    type: string;
    market: string;
    country: string;
    currency: string;
    lastPrice: number | null;
    discoveryPrice: number | null;
    sourceStatus: string;
    hasData: boolean;
  };
  score: {
    opportunityScore: number | null;
    entryScore: number | null;
    riskScore: number | null;
    fomoScore: number | null;
    decision: string;
    horizon: string;
    tacticalState: string | null;
  } | null;
  tech: {
    state: string;
    perf1w: number | null;
    perf1m: number | null;
    perf3m: number | null;
    rsi14: number | null;
    pos52w: number | null;
    close: number | null;
  } | null;
  spark?: number[];
}

export function OpportunityTable({ rows, sparks }: { rows: OpportunityRow[]; sparks?: Record<string, number[]> }) {
  if (!rows.length) {
    return (
      <div className="rounded border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Sin activos en esta vista. Ejecuta «Actualizar datos» para correr el pipeline.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full min-w-[880px] text-left text-xs">
        <thead>
          <tr className="border-b border-border bg-card text-muted-foreground">
            <th className="px-3 py-2.5 micro-label">Activo</th>
            <th className="px-3 py-2.5 micro-label">Tipo</th>
            <th className="px-3 py-2.5 micro-label text-right">Precio</th>
            <th className="px-3 py-2.5 micro-label text-right">1M</th>
            <th className="px-3 py-2.5 micro-label text-right">3M</th>
            <th className="px-3 py-2.5 micro-label text-center">Opportunity</th>
            <th className="px-3 py-2.5 micro-label text-center">Entry</th>
            <th className="px-3 py-2.5 micro-label text-center">Riesgo</th>
            <th className="px-3 py-2.5 micro-label text-center">FOMO</th>
            <th className="px-3 py-2.5 micro-label">Estado técnico</th>
            <th className="px-3 py-2.5 micro-label">Decisión</th>
            <th className="px-3 py-2.5 micro-label text-center">90d</th>
            <th className="px-3 py-2.5 micro-label text-right">Fuente</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ asset, score, tech }) => (
            <tr key={String(asset.id)} className="border-b border-border/50 transition-colors hover:bg-accent/40">
              <td className="px-3 py-2.5">
                <Link to={`/asset/${asset.id}`} className="group">
                  <div className="font-num font-semibold text-foreground group-hover:text-primary">{asset.symbol}</div>
                  <div className="max-w-[160px] truncate text-[10px] text-muted-foreground">{asset.name}</div>
                </Link>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-[10px] text-muted-foreground">{TYPE_LABELS[asset.type] ?? asset.type}</span>
                <div className="text-[10px] text-muted-foreground/70">{asset.market}</div>
              </td>
              <td className="px-3 py-2.5 text-right font-num text-foreground">{fmtPrice(asset.lastPrice ?? tech?.close)}</td>
              <td className={`px-3 py-2.5 text-right font-num ${pctColor(tech?.perf1m)}`}>{fmtPct(tech?.perf1m)}</td>
              <td className={`px-3 py-2.5 text-right font-num ${pctColor(tech?.perf3m)}`}>{fmtPct(tech?.perf3m)}</td>
              <td className={`px-3 py-2.5 text-center font-num font-bold ${scoreColor(score?.opportunityScore)}`}>
                {score?.opportunityScore != null ? Math.round(score.opportunityScore) : NA}
              </td>
              <td className={`px-3 py-2.5 text-center font-num ${scoreColor(score?.entryScore)}`}>
                {score?.entryScore != null ? Math.round(score.entryScore) : "—"}
              </td>
              <td className="px-3 py-2.5 text-center font-num text-muted-foreground">
                {score?.riskScore != null ? Math.round(score.riskScore) : "—"}
              </td>
              <td className="px-3 py-2.5 text-center font-num">
                {score?.fomoScore != null ? (
                  <span className={score.fomoScore >= 55 ? "text-red-400 font-semibold" : "text-muted-foreground"}>{Math.round(score.fomoScore)}</span>
                ) : "—"}
              </td>
              <td className="px-3 py-2.5 text-[11px] text-foreground/90">{tech?.state ?? NA}</td>
              <td className="px-3 py-2.5"><DecisionBadge decision={score?.decision} /></td>
              <td className="px-3 py-2.5 text-center">
                <Sparkline data={sparks?.[String(asset.id)] ?? []} />
              </td>
              <td className="px-3 py-2.5 text-right"><SourceStatus status={asset.sourceStatus} /></td>
              <td className="px-3 py-2.5 text-right">
                <Link
                  to={`/asset/${asset.id}`}
                  className="rounded-sm border border-primary/40 px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-primary transition-colors hover:bg-primary/10"
                >
                  WHY?
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
