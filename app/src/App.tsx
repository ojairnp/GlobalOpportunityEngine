import { Routes, Route, Navigate } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import RadarPage from "./pages/RadarPage";
import AssetDetail from "./pages/AssetDetail";
import MacroPage from "./pages/MacroPage";
import PerformancePage from "./pages/PerformancePage";
import WatchlistPage from "./pages/WatchlistPage";
import PaperPage from "./pages/PaperPage";
import HistoryPage from "./pages/HistoryPage";

function NotFound() {
  return (
    <div className="p-8 text-sm text-muted-foreground">
      Página no encontrada. <a href="/" className="text-primary underline">Ir al dashboard</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/radar/:kind" element={<RadarPage />} />
        <Route path="/asset/:id" element={<AssetDetail />} />
        <Route path="/macro" element={<MacroPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/paper" element={<PaperPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
