import { trpc } from "@/providers/trpc";
import { Link } from "react-router";
import { fmtPrice, fmtDateTime } from "@/lib/format";

export default function HistoryPage() {
  const { data: dets, isLoading } = trpc.radar.history.useQuery({ limit: 150 });
  const { data: audit } = trpc.system.audit.useQuery({ limit: 60 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Historial y auditoría</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Todas las detecciones se conservan — ganadoras, perdedoras y falsos positivos (sin sesgo de supervivencia).
          El log de auditoría registra cada decisión del sistema y acción del usuario.
        </p>
      </div>

      <div>
        <h2 className="micro-label mb-2">Detecciones</h2>
        <div className="overflow-x-auto rounded border border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-card text-muted-foreground">
                <th className="px-3 py-2 micro-label">Fecha</th>
                <th className="px-3 py-2 micro-label">Activo</th>
                <th className="px-3 py-2 micro-label">Tipo</th>
                <th className="px-3 py-2 micro-label">Resumen</th>
                <th className="px-3 py-2 micro-label text-right">Precio en detección</th>
                <th className="px-3 py-2 micro-label">Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>}
              {(dets ?? []).map(({ detection, asset }) => (
                <tr key={String(detection.id)} className="border-b border-border/50">
                  <td className="px-3 py-2 font-num text-[11px] text-muted-foreground">{fmtDateTime(detection.ts)}</td>
                  <td className="px-3 py-2">
                    {asset && <Link to={`/asset/${asset.id}`} className="font-num font-semibold hover:text-primary">{asset.symbol}</Link>}
                  </td>
                  <td className="px-3 py-2"><span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">{detection.type}</span></td>
                  <td className="px-3 py-2 text-[11px] text-foreground/85">{detection.summary}</td>
                  <td className="px-3 py-2 text-right font-num">{fmtPrice(detection.priceAtDetection)}</td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">{detection.status}</td>
                </tr>
              ))}
              {!isLoading && (dets ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Sin detecciones todavía.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="micro-label mb-2">Audit log</h2>
        <div className="rounded border border-border bg-card">
          {(audit ?? []).map((a) => (
            <div key={String(a.id)} className="flex items-baseline gap-3 border-b border-border/50 px-4 py-2 text-xs last:border-0">
              <span className="font-num shrink-0 text-[10px] text-muted-foreground">{fmtDateTime(a.ts)}</span>
              <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{a.actor}</span>
              <span className="shrink-0 text-[10px] font-bold tracking-wide text-primary/90">{a.action}</span>
              <span className="truncate text-[11px] text-muted-foreground">{a.detail}</span>
            </div>
          ))}
          {(audit ?? []).length === 0 && <p className="p-4 text-xs text-muted-foreground">Sin eventos.</p>}
        </div>
      </div>
    </div>
  );
}
