import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { fmtPrice, fmtPct, fmtDateTime, pctColor } from "@/lib/format";

export default function PaperPage() {
  const { data, isLoading } = trpc.paper.list.useQuery();
  const utils = trpc.useUtils();
  const [exitPrice, setExitPrice] = useState<Record<string, string>>({});
  const close = trpc.paper.close.useMutation({ onSuccess: () => utils.paper.list.invalidate() });

  const open = (data ?? []).filter((r) => r.trade.status === "OPEN");
  const closed = (data ?? []).filter((r) => r.trade.status === "CLOSED");
  const wins = closed.filter((r) => (r.trade.resultPct ?? 0) > 0).length;
  const avgResult = closed.length ? closed.reduce((a, r) => a + (r.trade.resultPct ?? 0), 0) / closed.length : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Paper Mode</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Simulación sin dinero real. Registra entrada, stop, target, comisiones y slippage. Se abre desde la ficha de cada activo (WHY? → Paper trade).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <div className="rounded border border-border bg-card p-3 text-center">
          <div className="micro-label">Abiertas</div>
          <div className="font-num mt-1 text-xl font-bold">{open.length}</div>
        </div>
        <div className="rounded border border-border bg-card p-3 text-center">
          <div className="micro-label">Cerradas</div>
          <div className="font-num mt-1 text-xl font-bold">{closed.length}</div>
        </div>
        <div className="rounded border border-border bg-card p-3 text-center">
          <div className="micro-label">Avg resultado</div>
          <div className={`font-num mt-1 text-xl font-bold ${pctColor(avgResult)}`}>{fmtPct(avgResult)}</div>
        </div>
      </div>
      {closed.length > 0 && (
        <p className="text-[11px] text-muted-foreground">Win rate: {((wins / closed.length) * 100).toFixed(0)}% ({wins}/{closed.length})</p>
      )}

      <div>
        <h2 className="micro-label mb-2">Posiciones abiertas</h2>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-3 py-2 micro-label">Activo</th>
                <th className="px-3 py-2 micro-label">Dir</th>
                <th className="px-3 py-2 micro-label">Entrada</th>
                <th className="px-3 py-2 micro-label text-right">Precio entrada</th>
                <th className="px-3 py-2 micro-label text-right">Stop</th>
                <th className="px-3 py-2 micro-label text-right">Target</th>
                <th className="px-3 py-2 micro-label text-right">Actual</th>
                <th className="px-3 py-2 micro-label text-right">Cerrar a…</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
              {open.map(({ trade, asset }) => (
                <tr key={String(trade.id)} className="border-b border-border/50">
                  <td className="px-3 py-2">
                    {asset && <Link to={`/asset/${asset.id}`} className="font-num font-semibold hover:text-primary">{asset.symbol}</Link>}
                  </td>
                  <td className="px-3 py-2 text-[11px]">{trade.direction}</td>
                  <td className="px-3 py-2 text-[11px]">{fmtDateTime(trade.entryTs)}</td>
                  <td className="px-3 py-2 text-right font-num">{fmtPrice(trade.entryPrice)}</td>
                  <td className="px-3 py-2 text-right font-num text-red-400">{fmtPrice(trade.stop)}</td>
                  <td className="px-3 py-2 text-right font-num text-emerald-400">{fmtPrice(trade.target)}</td>
                  <td className="px-3 py-2 text-right font-num">{fmtPrice(asset?.lastPrice)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        value={exitPrice[String(trade.id)] ?? ""}
                        onChange={(e) => setExitPrice((p) => ({ ...p, [String(trade.id)]: e.target.value }))}
                        type="number" placeholder={asset?.lastPrice?.toFixed(2) ?? ""}
                        className="w-24 rounded border border-input bg-background px-2 py-2 font-num text-xs min-h-[44px]"
                      />
                      <button
                        onClick={() => {
                          const v = parseFloat(exitPrice[String(trade.id)] ?? "");
                          if (Number.isFinite(v) && v > 0) close.mutate({ id: Number(trade.id), exitPrice: v });
                        }}
                        className="rounded bg-primary px-2.5 py-2 text-[10px] font-bold text-primary-foreground min-h-[44px]"
                      >
                        Cerrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && open.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Sin posiciones abiertas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="micro-label mb-2">Cerradas</h2>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-3 py-2 micro-label">Activo</th>
                <th className="px-3 py-2 micro-label">Entrada</th>
                <th className="px-3 py-2 micro-label text-right">Entrada $</th>
                <th className="px-3 py-2 micro-label text-right">Salida $</th>
                <th className="px-3 py-2 micro-label text-right">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {closed.map(({ trade, asset }) => (
                <tr key={String(trade.id)} className="border-b border-border/50">
                  <td className="px-3 py-2 font-num font-semibold">{asset?.symbol}</td>
                  <td className="px-3 py-2 text-[11px]">{fmtDateTime(trade.entryTs)}</td>
                  <td className="px-3 py-2 text-right font-num">{fmtPrice(trade.entryPrice)}</td>
                  <td className="px-3 py-2 text-right font-num">{fmtPrice(trade.exitPrice)}</td>
                  <td className={`px-3 py-2 text-right font-num font-bold ${pctColor(trade.resultPct)}`}>{fmtPct(trade.resultPct)}</td>
                </tr>
              ))}
              {closed.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Sin posiciones cerradas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
