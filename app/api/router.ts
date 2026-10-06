import { createRouter, publicQuery } from "./middleware";
import { radarRouter, watchlistRouter, paperRouter, performanceRouter, macroRouter, systemRouter } from "./routers";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  radar: radarRouter,
  watchlist: watchlistRouter,
  paper: paperRouter,
  performance: performanceRouter,
  macro: macroRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
