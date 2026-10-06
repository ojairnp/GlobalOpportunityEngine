import { useParams, Link } from "react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, FlaskConical } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { DecisionBadge, ScoreBar, PriceChart, Stat, SourceStatus } from "@/components/widgets";
import { fmtPrice, fmtPct, fmtCompact, fmtDate, fmtDateTime, pctColor, TYPE_LABELS, NA } from "@/lib/format";

function ThesisSection({ title, body }: { title: string; body: string | null | undefined }) {
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <div className="micro-label mb-1.5 text-primary/90">{title}</div>
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">{body || NA}</p>
    </div>
  );
}

function PaperTradeForm({ assetId, lastPrice }: { assetId: number; lastPrice: number | null }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const create = trpc.paper.create.useMutation({
    onSuccess: () => {
      utils.paper.list.invalidate();
      setOpen(false);
    },
  });
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={lastPrice == null}
        className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40 min-h-[44px]"
      >
        <FlaskConical size={14} /> Paper trade
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-card p-2">
      <span className="text-[11px] text-muted-foreground">Entrada: <span className="font-num text-foreground">{fmtPrice(lastPrice)}</span></span>
      <input value={stop} onChange={(e) => setStop(e.target.value)} placeholder="Stop" type="number"
        className="w-24 rounded border border-input bg-background px-2 py-2 font-num text-xs min-h-[44px]" />
      <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target" type="number"
        className="w-24 rounded border border-input bg-background px-2 py-2 font-num text-xs min-h-[44px]" />
      <button
        onClick={() => lastPrice != null && create.mutate({ assetId, entryPrice: lastPrice, stop: stop ? +stop : undefined, target: target ? +target : undefined })}
        className="rounded bg-primary px-3 py-2 text-xs font-bold text-primary-foreground min-h-[44px]"
      >
        Abrir LONG
      </button>
      <button onClick={() => setOpen(false)} className="px-2 py-2 text-xs text-muted-foreground min-h-[44px]">Cancelar</button>
    </div>
  );
}

export default function AssetDetail() {
  const { id } = useParams();
  const assetId = Number(id);
  const { data, isLoading } = trpc.radar.detail.useQuery({ id: assetId });
  const utils = trpc.useUtils();
  const addWl = trpc.watchlist.add.useMutation({ onSuccess: () => utils.radar.detail.invalidate() });
  const rmWl = trpc.watchlist.remove.useMutation({ onSuccess: () => utils.radar.detail.invalidate() });

  if (isLoading || !data) return <div className="p-8 text-sm text-muted-foreground">Cargando…</div>;
  const { asset, score, tech, thesis, detections, fundamentals: funds, prices, inWatchlist } = data;
  const payload = (score?.payload ?? {}) as { fairValue?: { bear: number | null; base: number | null; bull: number | null; assumptions: string }; floorSignals?: string[]; missingComponents?: string[]; dataNote?: string };
  const fv = payload.fairValue;
  const fundMap = Object.fromEntries((funds ?? []).map((f) => [f.metric, f]));

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground min-h-[44px]">
        <ArrowLeft size={14} /> Volver al dashboard
      </Link>

      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-num text-2xl font-bold tracking-tight text-foreground">{asset.symbol}</h1>
            <span className="text-sm text-muted-foreground">{asset.name}</span>
            <DecisionBadge decision={score?.decision} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {TYPE_LABELS[asset.type] ?? asset.type} · {asset.market} {asset.country !== "—" ? `· ${asset.country}` : ""} · {asset.currency}
            {asset.sector ? ` · ${asset.sector}` : ""} · <SourceStatus status={asset.sourceStatus} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (inWatchlist ? rmWl.mutate({ assetId }) : addWl.mutate({ assetId }))}
            className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary min-h-[44px]"
          >
            {inWatchlist ? <><EyeOff size={14} /> Quitar de watchlist</> : <><Eye size={14} /> Watchlist</>}
          </button>
          <PaperTradeForm assetId={assetId} lastPrice={asset.lastPrice ?? tech?.close ?? null} />
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Precio" value={fmtPrice(asset.lastPrice ?? tech?.close)} hint={asset.lastPriceAt ? `al ${fmtDate(asset.lastPriceAt)}` : undefined} />
        <Stat label="Precio descubrimiento" value={fmtPrice(asset.discoveryPrice)} hint={asset.discoveryAt ? fmtDate(asset.discoveryAt) : "primer BUY ZONE"} />
        <Stat label="Market cap" value={fundMap["market_cap"]?.hasData ? fmtCompact(fundMap["market_cap"].value) : NA} />
        <Stat label="Posición 52w" value={tech?.pos52w != null ? `${tech.pos52w.toFixed(0)}%` : NA} hint={tech?.high52w != null ? `rango ${fmtPrice(tech.low52w)}–${fmtPrice(tech.high52w)}` : undefined} />
        <Stat label="Perf 1M / 3M" value={<span className={pctColor(tech?.perf3m)}>{fmtPct(tech?.perf1m)} / {fmtPct(tech?.perf3m)}</span>} />
        <Stat label="RSI(14) · ATR%" value={tech?.rsi14 != null ? `${tech.rsi14.toFixed(0)} · ${tech.atrPct?.toFixed(1) ?? "—"}%` : NA} />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Gráfico + técnicos */}
        <div className="space-y-4 lg:col-span-3">
          <PriceChart prices={(prices ?? []).map((p) => ({ date: p.date, close: p.close }))} />
          <div className="rounded border border-border bg-card p-4">
            <div className="micro-label mb-3">Scores del motor (0–100)</div>
            <div className="space-y-2.5">
              <ScoreBar label="Opportunity" value={score?.opportunityScore} />
              <ScoreBar label="Entry" value={score?.entryScore} />
              <ScoreBar label="Técnico" value={score?.technicalScore} />
              <ScoreBar label="Asimetría" value={score?.asymmetryScore} />
              <ScoreBar label="Early (cripto)" value={score?.earlyScore} />
              <ScoreBar label="Riesgo" value={score?.riskScore} invert />
              <ScoreBar label="FOMO" value={score?.fomoScore} invert />
            </div>
            {(payload.missingComponents?.length ?? 0) > 0 && (
              <p className="mt-3 border-t border-border/60 pt-2 text-[10px] leading-relaxed text-muted-foreground">
                {payload.dataNote} Componentes ausentes: {payload.missingComponents?.join(", ")}.
              </p>
            )}
          </div>

          {/* Fair value */}
          <div className="rounded border border-border bg-card p-4">
            <div className="micro-label mb-3">Escenarios de valor (BEAR / BASE / BULL)</div>
            {fv?.base != null ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="micro-label text-red-400">Bear</div><div className="font-num text-lg text-red-300">{fmtPrice(fv.bear)}</div></div>
                  <div><div className="micro-label">Base</div><div className="font-num text-lg text-foreground">{fmtPrice(fv.base)}</div></div>
                  <div><div className="micro-label text-emerald-400">Bull</div><div className="font-num text-lg text-emerald-300">{fmtPrice(fv.bull)}</div></div>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{fv.assumptions}</p>
              </>
            ) : (
              <p className="text-xs text-red-400/80">{NA}</p>
            )}
          </div>
        </div>

        {/* WHY? — tesis */}
        <div className="lg:col-span-2">
          <div className="rounded border border-primary/25 bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-num text-sm font-bold tracking-widest text-primary">WHY? — TESIS ESTRUCTURADA</span>
              <span className="micro-label">confianza: {thesis?.confidence ?? "—"} · {thesis?.horizon ?? "—"}</span>
            </div>
            <div className="px-4">
              <ThesisSection title="Por qué apareció" body={thesis?.whyAppeared} />
              <ThesisSection title="Contexto del activo" body={thesis?.assetContext} />
              <ThesisSection title="Qué está mejorando" body={thesis?.improving} />
              <ThesisSection title="Qué podría no estar viendo el mercado" body={thesis?.marketMissing} />
              <ThesisSection title="Catalizadores" body={thesis?.catalysts} />
              <ThesisSection title="Riesgos" body={thesis?.risks} />
              <ThesisSection title="Condición de entrada" body={thesis?.entryCondition} />
              <ThesisSection title="Qué invalida la tesis" body={thesis?.invalidation} />
            </div>
            <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
              Generada por reglas sobre datos verificables · {thesis ? fmtDateTime(thesis.ts) : ""} · estado {thesis?.status ?? "—"}
            </div>
          </div>

          {/* Detecciones del activo */}
          <div className="mt-4 rounded border border-border bg-card">
            <div className="border-b border-border px-4 py-3 micro-label">Detecciones recientes</div>
            <div className="max-h-64 overflow-y-auto">
              {(detections ?? []).length === 0 && <p className="p-4 text-xs text-muted-foreground">Sin detecciones registradas todavía.</p>}
              {(detections ?? []).map((d) => (
                <div key={String(d.id)} className="border-b border-border/50 px-4 py-2.5 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-wide text-amber-300">{d.type}</span>
                    <span className="text-[10px] text-muted-foreground">{fmtDateTime(d.ts)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/85">{d.summary}</p>
                  {d.priceAtDetection != null && <p className="text-[10px] text-muted-foreground font-num">precio en detección: {fmtPrice(d.priceAtDetection)}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
