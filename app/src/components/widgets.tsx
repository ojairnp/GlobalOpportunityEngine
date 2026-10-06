import { DECISION_STYLES, SOURCE_STATUS_STYLES, NA, fmtPrice } from "@/lib/format";

export function DecisionBadge({ decision }: { decision: string | null | undefined }) {
  if (!decision) return <span className="text-[10px] text-muted-foreground">{NA}</span>;
  const s = DECISION_STYLES[decision] ?? { label: decision, cls: "bg-secondary text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function SourceStatus({ status }: { status: string | null | undefined }) {
  const s = SOURCE_STATUS_STYLES[status ?? "PENDING"] ?? SOURCE_STATUS_STYLES.PENDING;
  return <span className={`text-[10px] font-medium tracking-wide ${s.cls}`}>{s.label}</span>;
}

export function ScoreBar({ label, value, invert }: { label: string; value: number | null | undefined; invert?: boolean }) {
  if (value == null) {
    return (
      <div className="flex items-center gap-2">
        <span className="micro-label w-28 shrink-0">{label}</span>
        <span className="text-[10px] text-red-400/80">{NA}</span>
      </div>
    );
  }
  const v = Math.round(value);
  const effective = invert ? 100 - v : v;
  const color = effective >= 70 ? "bg-emerald-400" : effective >= 50 ? "bg-amber-300" : effective >= 35 ? "bg-orange-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="micro-label w-28 shrink-0">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-secondary">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span className="font-num w-8 text-right text-xs text-foreground">{v}</span>
    </div>
  );
}

export function Sparkline({ data, width = 110, height = 30 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return <span className="text-[10px] text-muted-foreground">—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 3) - 1.5}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={pts} fill="none" stroke={up ? "#34d399" : "#f87171"} strokeWidth="1.4" />
    </svg>
  );
}

export function PriceChart({ prices }: { prices: { date: Date | string; close: number }[] }) {
  if (!prices || prices.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center rounded border border-border bg-card text-xs text-red-400/80">
        {NA} — histórico de precios no disponible desde las fuentes activas
      </div>
    );
  }
  const W = 800, H = 220, PAD = 30;
  const closes = prices.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const x = (i: number) => PAD + (i / (prices.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - 24 - ((v - min) / range) * (H - 60);
  const path = closes.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = closes[closes.length - 1] >= closes[0];
  const stroke = up ? "#34d399" : "#f87171";
  const gridVals = [min, min + range * 0.25, min + range * 0.5, min + range * 0.75, max];
  return (
    <div className="rounded border border-border bg-card p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {gridVals.map((g, i) => (
          <g key={i}>
            <line x1={PAD} x2={W - PAD} y1={y(g)} y2={y(g)} stroke="hsl(217 14% 14%)" strokeWidth="1" />
            <text x={W - PAD + 4} y={y(g) + 3} fontSize="9" fill="hsl(215 12% 52%)" className="font-num">{fmtPrice(g)}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" />
        <path d={`${path} L${x(prices.length - 1)},${H - 24} L${x(0)},${H - 24} Z`} fill={stroke} opacity="0.07" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(prices[0].date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}</span>
        <span>{new Date(prices[prices.length - 1].date).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}</span>
      </div>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded border border-border bg-card px-3 py-2.5">
      <div className="micro-label">{label}</div>
      <div className="font-num mt-1 text-lg font-semibold text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
