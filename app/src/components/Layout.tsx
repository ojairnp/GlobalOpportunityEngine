import { Link, NavLink, Outlet } from "react-router";
import { useState } from "react";
import { Radar, LayoutDashboard, Bitcoin, CandlestickChart, Globe2, Eye, History, FlaskConical, Gauge, Menu, X, RefreshCw } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { STATIC_MODE } from "@/lib/staticMode";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/radar/equity", label: "Equity Radar", icon: Radar },
  { to: "/radar/crypto", label: "Crypto Radar", icon: Bitcoin },
  { to: "/radar/cfd", label: "CFD / Táctico", icon: CandlestickChart },
  { to: "/macro", label: "Macro", icon: Globe2 },
  { to: "/performance", label: "Performance", icon: Gauge },
  { to: "/watchlist", label: "Watchlist", icon: Eye },
  { to: "/paper", label: "Paper Mode", icon: FlaskConical },
  { to: "/history", label: "Historial", icon: History },
];

function RefreshButton() {
  const utils = trpc.useUtils();
  const refresh = trpc.system.refresh.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  if (STATIC_MODE) {
    return (
      <p className="text-[10px] leading-relaxed text-muted-foreground" title="Vista publicada de solo lectura">
        Vista publicada (solo lectura).<br />Ejecuta el proyecto en local para actualizar datos.
      </p>
    );
  }
  return (
    <button
      onClick={() => refresh.mutate()}
      disabled={refresh.isPending}
      className="flex items-center gap-2 rounded border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50 min-h-[44px]"
      title="Ejecutar pipeline de datos completo"
    >
      <RefreshCw size={14} className={refresh.isPending ? "animate-spin" : ""} />
      {refresh.isPending ? "Actualizando…" : "Actualizar datos"}
    </button>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      {/* Header móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-num text-sm font-bold tracking-widest text-primary">GOE</span>
          <span className="micro-label">Global Opportunity Engine</span>
        </Link>
        <button onClick={() => setOpen(!open)} className="p-2 text-foreground min-h-[44px] min-w-[44px]" aria-label="Menú">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {open && (
        <nav className="border-b border-border bg-card px-4 py-2 lg:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-3 text-sm min-h-[44px] ${isActive ? "text-primary" : "text-muted-foreground"}`
              }
            >
              <n.icon size={16} /> {n.label}
            </NavLink>
          ))}
          <div className="py-2"><RefreshButton /></div>
        </nav>
      )}

      <div className="flex">
        {/* Sidebar escritorio */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-[hsl(var(--sidebar-background))] lg:flex">
          <Link to="/" className="border-b border-border px-5 py-5">
            <div className="font-num text-base font-bold tracking-[0.2em] text-primary">GOE</div>
            <div className="micro-label mt-1">Global Opportunity Engine</div>
          </Link>
          <nav className="flex-1 overflow-y-auto py-3">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-l-2 px-5 py-2.5 text-[13px] transition-colors ${
                    isActive
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <n.icon size={15} /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border p-4">
            <RefreshButton />
            <p className="micro-label mt-3 leading-relaxed">
              Fase 1 · El sistema analiza.<br />Tú decides.
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 pb-[env(safe-area-inset-bottom)] lg:px-7 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
