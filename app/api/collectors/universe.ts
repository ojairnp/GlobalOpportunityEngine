// ------------------------------------------------------------------
// UNIVERSE — universo inicial Fase 1.
// Cada activo declara sus símbolos por fuente; los collectors eligen
// la primera fuente disponible y registran sourceStatus.
// ------------------------------------------------------------------

export interface UniverseAsset {
  symbol: string;
  name: string;
  type: "equity" | "crypto" | "commodity" | "fx" | "index";
  market: string;
  country: string;
  currency: string;
  sector?: string;
  industry?: string;
  themes?: string[];
  sources: Record<string, string>; // nasdaq, eodhd, coinlore, frankfurter, cnbc, coingecko, stooq, yahoo
  benchmark?: boolean;
}

export const UNIVERSE: UniverseAsset[] = [
  // ---------------- EQUITIES — USA (fuente: Nasdaq API) ----------------
  { symbol: "AAPL", name: "Apple Inc.", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["AI", "Consumer Tech"], sources: { nasdaq: "AAPL", eodhd: "AAPL.US" } },
  { symbol: "MSFT", name: "Microsoft Corp.", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["AI", "Cloud"], sources: { nasdaq: "MSFT", eodhd: "MSFT.US" } },
  { symbol: "NVDA", name: "NVIDIA Corp.", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["AI", "Semiconductors", "Data Centers"], sources: { nasdaq: "NVDA" } },
  { symbol: "AMD", name: "Advanced Micro Devices", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["AI", "Semiconductors"], sources: { nasdaq: "AMD" } },
  { symbol: "AVGO", name: "Broadcom Inc.", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["AI", "Semiconductors", "Networking"], sources: { nasdaq: "AVGO" } },
  { symbol: "TSLA", name: "Tesla Inc.", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["EV", "Robotics", "Energy Storage"], sources: { nasdaq: "TSLA", eodhd: "TSLA.US" } },
  { symbol: "PLTR", name: "Palantir Technologies", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["AI", "Defense", "Cybersecurity"], sources: { nasdaq: "PLTR" } },
  { symbol: "SMCI", name: "Super Micro Computer", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["AI", "Data Centers", "Cooling"], sources: { nasdaq: "SMCI" } },
  { symbol: "GE", name: "GE Aerospace", type: "equity", market: "NYSE", country: "US", currency: "USD", themes: ["Defense", "Aerospace"], sources: { nasdaq: "GE" } },
  { symbol: "ETN", name: "Eaton Corp.", type: "equity", market: "NYSE", country: "US", currency: "USD", themes: ["Power Grid", "Data Centers", "Electrification"], sources: { nasdaq: "ETN" } },
  { symbol: "VRT", name: "Vertiv Holdings", type: "equity", market: "NYSE", country: "US", currency: "USD", themes: ["Data Centers", "Cooling", "Power Grid"], sources: { nasdaq: "VRT" } },
  { symbol: "CEG", name: "Constellation Energy", type: "equity", market: "NASDAQ", country: "US", currency: "USD", themes: ["Nuclear", "Power Grid", "Data Centers"], sources: { nasdaq: "CEG" } },
  { symbol: "JPM", name: "JPMorgan Chase", type: "equity", market: "NYSE", country: "US", currency: "USD", themes: ["Banks"], sources: { nasdaq: "JPM" } },
  { symbol: "CAT", name: "Caterpillar Inc.", type: "equity", market: "NYSE", country: "US", currency: "USD", themes: ["Infrastructure", "Automation"], sources: { nasdaq: "CAT" } },
  { symbol: "DE", name: "Deere & Co.", type: "equity", market: "NYSE", country: "US", currency: "USD", themes: ["Automation", "Agriculture"], sources: { nasdaq: "DE" } },
  { symbol: "SPY", name: "SPDR S&P 500 ETF (benchmark)", type: "index", market: "NYSEARCA", country: "US", currency: "USD", sources: { nasdaq: "SPY", eodhd: "VTI.US" }, benchmark: true },

  // ---------------- EQUITIES — México / Japón / Reino Unido ----------------
  // Fuentes en vivo vía collectors runtime (stooq/yahoo). Si la red del
  // servidor no las permite → DATA UNAVAILABLE con flag (nunca inventado).
  { symbol: "WALMEX.MX", name: "Walmart de México", type: "equity", market: "BMV", country: "MX", currency: "MXN", themes: ["Consumer"], sources: { stooq: "walmex.mx", yahoo: "WALMEX.MX" } },
  { symbol: "GFNORTEO.MX", name: "Grupo Financiero Banorte", type: "equity", market: "BMV", country: "MX", currency: "MXN", themes: ["Banks"], sources: { stooq: "gfnorteo.mx", yahoo: "GFNORTEO.MX" } },
  { symbol: "AMXL.MX", name: "América Móvil", type: "equity", market: "BMV", country: "MX", currency: "MXN", themes: ["Telecom", "Infrastructure"], sources: { stooq: "amxb.mx", yahoo: "AMXB.MX" } },
  { symbol: "ASURB.MX", name: "Grupo Aeroportuario del Sureste", type: "equity", market: "BMV", country: "MX", currency: "MXN", themes: ["Infrastructure"], sources: { stooq: "asurb.mx", yahoo: "ASURB.MX" } },
  { symbol: "7203.T", name: "Toyota Motor", type: "equity", market: "TSE", country: "JP", currency: "JPY", themes: ["Automotive", "Robotics"], sources: { stooq: "7203.jp", yahoo: "7203.T" } },
  { symbol: "6758.T", name: "Sony Group", type: "equity", market: "TSE", country: "JP", currency: "JPY", themes: ["Gaming", "Consumer Tech"], sources: { stooq: "6758.jp", yahoo: "6758.T" } },
  { symbol: "9984.T", name: "SoftBank Group", type: "equity", market: "TSE", country: "JP", currency: "JPY", themes: ["AI", "Semiconductors"], sources: { stooq: "9984.jp", yahoo: "9984.T" } },
  { symbol: "8035.T", name: "Tokyo Electron", type: "equity", market: "TSE", country: "JP", currency: "JPY", themes: ["Semiconductors"], sources: { stooq: "8035.jp", yahoo: "8035.T" } },
  { symbol: "7011.T", name: "Mitsubishi Heavy Industries", type: "equity", market: "TSE", country: "JP", currency: "JPY", themes: ["Defense", "Energy"], sources: { stooq: "7011.jp", yahoo: "7011.T" } },
  { symbol: "8306.T", name: "Mitsubishi UFJ Financial", type: "equity", market: "TSE", country: "JP", currency: "JPY", themes: ["Banks Japan"], sources: { stooq: "8306.jp", yahoo: "8306.T" } },
  { symbol: "SHEL.L", name: "Shell plc", type: "equity", market: "LSE", country: "UK", currency: "GBP", themes: ["Energy"], sources: { stooq: "shel.uk", yahoo: "SHEL.L" } },
  { symbol: "AZN.L", name: "AstraZeneca", type: "equity", market: "LSE", country: "UK", currency: "GBP", themes: ["Biotech"], sources: { stooq: "azn.uk", yahoo: "AZN.L" } },
  { symbol: "RR.L", name: "Rolls-Royce Holdings", type: "equity", market: "LSE", country: "UK", currency: "GBP", themes: ["Defense", "Aerospace", "Nuclear"], sources: { stooq: "rr.uk", yahoo: "RR.L" } },
  { symbol: "BA.L", name: "BAE Systems", type: "equity", market: "LSE", country: "UK", currency: "GBP", themes: ["Defense"], sources: { stooq: "ba.uk", yahoo: "BA.L" } },

  // ---------------- CRYPTO ----------------
  // Fuentes de histórico por orden de preferencia: kraken/coinbase (OHLCV real),
  // coingecko (365d), eodhd demo (BTC/ETH), blockchain (BTC), yahoo (respaldo).
  { symbol: "BTC", name: "Bitcoin", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Store of Value"], sources: { kraken: "XBTUSD", coinbase: "BTC-USD", coingecko: "bitcoin", eodhd: "BTC-USD.CC", blockchain: "BTC", yahoo: "BTC-USD", coinlore: "90", dexscreener: "BTC USDC" } },
  { symbol: "ETH", name: "Ethereum", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Infrastructure", "DeFi", "RWA"], sources: { kraken: "ETHUSD", coinbase: "ETH-USD", coingecko: "ethereum", eodhd: "ETH-USD.CC", yahoo: "ETH-USD", coinlore: "80", dexscreener: "ETH USDC" } },
  { symbol: "SOL", name: "Solana", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Infrastructure", "DePIN"], sources: { kraken: "SOLUSD", coinbase: "SOL-USD", coingecko: "solana", yahoo: "SOL-USD", coinlore: "48543", dexscreener: "SOL USDC" } },
  { symbol: "XRP", name: "XRP", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Payments"], sources: { kraken: "XRPUSD", coinbase: "XRP-USD", coingecko: "ripple", yahoo: "XRP-USD", coinlore: "58", dexscreener: "XRP USDC" } },
  { symbol: "DOGE", name: "Dogecoin", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Memecoins"], sources: { kraken: "XDGUSD", coinbase: "DOGE-USD", coingecko: "dogecoin", yahoo: "DOGE-USD", coinlore: "2", dexscreener: "DOGE USDC" } },
  { symbol: "ADA", name: "Cardano", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Infrastructure"], sources: { kraken: "ADAUSD", coinbase: "ADA-USD", coingecko: "cardano", yahoo: "ADA-USD", coinlore: "257", dexscreener: "ADA USDC" } },
  { symbol: "AVAX", name: "Avalanche", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Infrastructure", "RWA"], sources: { kraken: "AVAXUSD", coinbase: "AVAX-USD", coingecko: "avalanche-2", yahoo: "AVAX-USD", coinlore: "44883", dexscreener: "AVAX USDC" } },
  { symbol: "LINK", name: "Chainlink", type: "crypto", market: "CRYPTO", country: "—", currency: "USD", themes: ["Infrastructure", "RWA", "DeFi"], sources: { kraken: "LINKUSD", coinbase: "LINK-USD", coingecko: "chainlink", yahoo: "LINK-USD", coinlore: "2751", dexscreener: "LINK USDC" } },

  // ---------------- COMMODITIES (CFD / Tactical) ----------------
  { symbol: "GOLD", name: "Oro (Gold COMEX)", type: "commodity", market: "COMEX", country: "—", currency: "USD", themes: ["Precious Metals"], sources: { cnbc: "@GC.1", stooq: "xauusd", yahoo: "GC=F" } },
  { symbol: "SILVER", name: "Plata (Silver COMEX)", type: "commodity", market: "COMEX", country: "—", currency: "USD", themes: ["Precious Metals"], sources: { cnbc: "@SI.1", stooq: "xagusd", yahoo: "SI=F" } },
  { symbol: "PLATINUM", name: "Platino (NYMEX)", type: "commodity", market: "NYMEX", country: "—", currency: "USD", themes: ["Precious Metals", "Industrial"], sources: { cnbc: "@PL.1", yahoo: "PL=F" } },
  { symbol: "NATGAS", name: "Gas Natural (Henry Hub)", type: "commodity", market: "NYMEX", country: "—", currency: "USD", themes: ["Energy"], sources: { cnbc: "@NG.1", stooq: "ng.f", yahoo: "NG=F" } },
  { symbol: "WTI", name: "Petróleo WTI", type: "commodity", market: "NYMEX", country: "—", currency: "USD", themes: ["Energy"], sources: { cnbc: "@CL.1", stooq: "cl.f", yahoo: "CL=F" } },
  { symbol: "BRENT", name: "Petróleo Brent", type: "commodity", market: "ICE", country: "—", currency: "USD", themes: ["Energy"], sources: { cnbc: "@LCO.1", yahoo: "BZ=F" } },
  { symbol: "COFFEE", name: "Café (ICE)", type: "commodity", market: "ICE", country: "—", currency: "USD", themes: ["Softs"], sources: { cnbc: "@KC.1", yahoo: "KC=F" } },
  { symbol: "COCOA", name: "Cacao (ICE)", type: "commodity", market: "ICE", country: "—", currency: "USD", themes: ["Softs"], sources: { cnbc: "@CC.1", yahoo: "CC=F" } },
  { symbol: "CORN", name: "Maíz (CBOT)", type: "commodity", market: "CBOT", country: "—", currency: "USD", themes: ["Grains"], sources: { cnbc: "@C.1", yahoo: "ZC=F" } },
  { symbol: "WHEAT", name: "Trigo (CBOT)", type: "commodity", market: "CBOT", country: "—", currency: "USD", themes: ["Grains"], sources: { cnbc: "@W.1", yahoo: "ZW=F" } },
  { symbol: "COPPER", name: "Cobre (COMEX)", type: "commodity", market: "COMEX", country: "—", currency: "USD", themes: ["Industrial", "Electrification"], sources: { cnbc: "@HG.1", yahoo: "HG=F" } },
  { symbol: "LEANHOGS", name: "Cerdo (Lean Hogs CME)", type: "commodity", market: "CME", country: "—", currency: "USD", themes: ["Livestock"], sources: { cnbc: "@HE.1", yahoo: "HE=F" } },

  // ---------------- FX (fuente: Frankfurter / BCE) ----------------
  { symbol: "EURUSD", name: "Euro / Dólar", type: "fx", market: "FOREX", country: "—", currency: "USD", sources: { frankfurter: "EUR", stooq: "eurusd" } },
  { symbol: "USDJPY", name: "Dólar / Yen", type: "fx", market: "FOREX", country: "JP", currency: "JPY", sources: { frankfurter: "JPY", stooq: "usdjpy" } },
  { symbol: "USDMXN", name: "Dólar / Peso Mexicano", type: "fx", market: "FOREX", country: "MX", currency: "MXN", sources: { frankfurter: "MXN", stooq: "usdmxn" } },
  { symbol: "GBPUSD", name: "Libra / Dólar", type: "fx", market: "FOREX", country: "UK", currency: "USD", sources: { frankfurter: "GBP", stooq: "gbpusd" } },

  // ---------------- ÍNDICES ----------------
  { symbol: "SPX", name: "S&P 500", type: "index", market: "US", country: "US", currency: "USD", sources: { cnbc: ".SPX", stooq: "^spx", yahoo: "^GSPC" } },
  { symbol: "IXIC", name: "Nasdaq Composite", type: "index", market: "US", country: "US", currency: "USD", sources: { cnbc: ".IXIC", stooq: "^ndq", yahoo: "^IXIC" } },
  { symbol: "N225", name: "Nikkei 225", type: "index", market: "TSE", country: "JP", currency: "JPY", sources: { cnbc: ".N225", stooq: "^nkx", yahoo: "^N225" } },
  { symbol: "FTSE", name: "FTSE 100", type: "index", market: "LSE", country: "UK", currency: "GBP", sources: { cnbc: ".FTSE", stooq: "^ukx", yahoo: "^FTSE" } },
  { symbol: "MXX", name: "IPC México (S&P/BMV)", type: "index", market: "BMV", country: "MX", currency: "MXN", sources: { cnbc: ".MXX", yahoo: "^MXX" } },
];
