# GLOBAL OPPORTUNITY ENGINE — Arquitectura y Diseño (Fase 1)

> Documento de arquitectura previo al código, según lo solicitado.
> Principio rector: **el sistema no dice "esto va a subir"; dice "esto merece tu atención, por estas razones, con estos datos, estos riesgos, este punto de invalidación y esta calidad de entrada". La decisión final es del usuario.**

---

## 1. Arquitectura general

```
┌────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 19 + TypeScript + Tailwind)                     │
│ Dashboard · Equity Radar · Crypto Radar · CFD Radar · Macro ·  │
│ Performance · Watchlist · Paper Mode · Historial · WHY?        │
└──────────────▲─────────────────────────────────────────────────┘
               │ tRPC (type-safe, superjson)
┌──────────────┴─────────────────────────────────────────────────┐
│ API GATEWAY (Hono + tRPC 11)                                    │
│ routers: radar · watchlist · paper · performance · macro · sys │
├────────────────────────────────────────────────────────────────┤
│ MOTORES DE ANÁLISIS (api/engines/)                              │
│ indicators → technical → scoring/entry/risk/fomo → thesis      │
├────────────────────────────────────────────────────────────────┤
│ COLLECTORS (api/collectors/) — workers con scheduler            │
│ nasdaq · eodhd · blockchain.info · coinlore · frankfurter ·    │
│ cnbc · coingecko · dexscreener · stooq(PoW) · yahoo             │
├────────────────────────────────────────────────────────────────┤
│ BASE DE DATOS (MySQL via Drizzle ORM — cloud, persistente)      │
│ assets · prices · technical_snapshots · fundamentals ·         │
│ macro_snapshots · news_events · scores · theses · detections · │
│ watchlist · paper_trades · performance_records · audit_log ·   │
│ data_quality                                                    │
└────────────────────────────────────────────────────────────────┘
```

**Nota sobre la base de datos:** la especificación sugería SQLite→PostgreSQL. La plataforma de despliegue provee MySQL gestionado (persistente entre versiones), así que se usa MySQL vía Drizzle ORM. El acceso a datos está 100% abstraído por Drizzle: migrar a PostgreSQL solo requiere cambiar el dialecto del schema.

**Separación de responsabilidades:** el frontend nunca contiene lógica de scoring ni claves; los motores viven server-side (`api/engines/`), los collectors son módulos independientes (`api/collectors/`), y la UI solo consume el router tRPC. Preparado para versión comercial: añadir `auth` (Kimi OAuth), roles, límites y billing sin tocar los motores (Fase 5).

## 2. Módulos implementados (Fase 1)

| Módulo | Estado | Detalle |
|---|---|---|
| Technical Engine | ✅ | EMA 20/50, SMA 100/200, RSI(14) con serie Wilder, MACD(12,26,9), ATR(14), volumen relativo, posición 52w, momentum 1S/1M/3M/6M/1A. Estados: BASE, ACCUMULATION, BREAKOUT, DISTRIBUTION, DOWNTREND, HIGH_VOLATILITY, NO_TRADE |
| Entry Engine | ✅ | ENTRY SCORE 0–100 separado de la calidad del activo: extensión sobre EMA50 en múltiplos de ATR, RSI en zona, señales de piso (higher low, RSI recuperando, MACD mejorando, estabilización de volumen, soporte 52w) |
| Scoring Engine | ✅ | TECHNICAL / ENTRY / RISK / FOMO / EARLY (cripto) / ASYMMETRY / OPPORTUNITY. Pesos renormalizados solo con componentes disponibles; los ausentes se declaran en `payload.missingComponents` |
| FOMO Engine | ✅ | Extensión parabólica sobre EMA50, RSI>72, spike de volumen en subida, rendimiento 1S>12%, posición >95% del rango anual |
| Thesis Engine | ✅ | Tesis estructurada por reglas (9 secciones: por qué apareció, contexto, qué mejora, qué no ve el mercado, catalizadores, riesgos, condición de entrada, invalidación, horizonte + confianza). Cada cifra citada viene del snapshot real |
| Fair Value | ✅ | BEAR/BASE/BULL con supuestos explícitos (modelo técnico ATR; sin DCF mientras no haya fundamentales verificables) |
| Risk Engine | ✅ | RISK SCORE por volatilidad (ATR%), posición en rango, estado técnico y penalización por falta de verificación fundamental |
| Performance/Backtest | ✅ | Cada detección guarda `priceAtDetection`; se evalúa a 24h/7d/30d (cripto), 1M/3M/6M/1Y (acciones), 1D/1S (táctico) con alpha vs benchmark (SPY). Sin look-ahead (solo precios conocidos a la fecha) y sin sesgo de supervivencia (nada se borra) |
| Paper Mode | ✅ | Entrada/stop/target/fees/slippage/resultado; sin dinero real |
| Macro Engine | ⚠️ básico | Divisas con tipos oficiales BCE (Frankfurter) + índices globales. FRED/PMI/tasas en Fase 2 |
| News Engine | ⏳ Fase 2 | Tabla `news_events` ya creada con estados NEW_CATALYST/CONFIRMED/PRICED_IN/NEGATIVE/NO_MATERIAL_IMPACT |
| CAPEX/Backlog/Revisions | ⏳ Fase 2 | Requieren filings (SEC EDGAR) — tablas `fundamentals` listas para recibirlos |
| Wallet Intelligence / DexScreener | ⏳ runtime | Collector implementado; depende de que la red del servidor permita api.dexscreener.com |

## 3. Base de datos (entidades)

`assets` (con `sourceMeta` JSON: símbolo nativo por fuente, `hasData`, `sourceStatus`, `discoveryPrice` para el FOMO detector) · `prices` (OHLCV + `source` + `fetchedAt`, único por activo/fecha) · `technical_snapshots` (último estado por activo) · `fundamentals` (métrica/valor/hasData/fuente/período) · `macro_snapshots` · `news_events` · `scores` (12 scores + decisión + payload de auditoría) · `theses` (versionadas; al cambiar la decisión la anterior pasa a EXPIRED) · `detections` (nunca se borran) · `watchlist` (sin límite) · `paper_trades` · `performance_records` · `audit_log` (acción de usuario y del sistema) · `data_quality` (fuente, campo, estado, mensaje, timestamp).

**Principio de verificabilidad implementado:** ningún score usa defaults silenciosos. Si un dato no existe, el campo queda `NULL` + `hasData=false` + registro en `data_quality`, y la UI muestra `DATA UNAVAILABLE`. Un cero real y un dato ausente son cosas distintas en toda la cadena.

## 4. Fuentes de datos (todas gratuitas, sin API key obligatoria)

| Fuente | Cobertura | Uso |
|---|---|---|
| Nasdaq API | Acciones y ETFs US | Histórico OHLCV 1 año + summary (sector, market cap, target analistas, volumen medio) |
| EODHD (demo) | AAPL, MSFT, TSLA, VTI, BTC-USD, ETH-USD | Histórico diario completo |
| Blockchain.info | BTC | Histórico 1 año (respaldo cripto) |
| Coinlore | Top 100 cripto | Cotización, market cap, %24h, %7d, rank → EARLY SCORE |
| Frankfurter (BCE) | EUR, JPY, MXN, GBP… | Histórico FX oficial diario |
| CNBC | Futuros commodities + índices | Cotizaciones actuales |
| CoinGecko | Cripto | Runtime (si la red lo permite) |
| DexScreener | Pools DEX, nuevos tokens | Runtime — discovery cripto |
| Stooq (con solver PoW) | Global: MX, JP, UK, commodities, índices | Runtime — histórico diario |
| Yahoo Finance chart | Global | Runtime — respaldo |

Cada extracción registra fuente, timestamp y estado. Si falla: `DATA UNAVAILABLE`, nunca un valor inventado.

## 5. Flujo de datos (pipeline)

```
ensureUniverse() → refreshQuotes() [coinlore/coingecko/cnbc]
→ por activo: collectBars() [fuentes en orden de preferencia]
→ upsertPrices() → refreshFundamentalsUs() [Nasdaq summary]
→ por activo: computeTechnical() → computeScores() → decide()
→ buildThesis() → detections (cambios de decisión/estado, FOMO≥55)
→ evaluatePerformance() [horizontes cumplidos]
→ audit_log + data_quality
```

Los cambios de decisión (p. ej. `WAIT_FOR_FLOOR → ACCUMULATION → BUY_ZONE`) generan detecciones con precio de descubrimiento: son el insumo del tracking de performance y de las futuras alertas.

## 6. Scores (resumen de reglas)

- **OPPORTUNITY SCORE**: media ponderada de componentes disponibles (técnico 0.25, entrada 0.25, fundamental 0.2, valuación 0.1, early 0.2, anti-FOMO 0.1, anti-riesgo 0.1), con pesos renormalizados si falta alguno.
- **ENTRY SCORE**: proximidad a EMA50 medida en ATR + zona RSI + señales de piso. Distingue *buena empresa* de *buena entrada*.
- **FOMO SCORE**: extensión parabólica, RSI extremo, spike de volumen, % del rango 52w. ≥55 → decisión FOMO_EXTENDED (el sistema te frena, no te empuja).
- **RISK SCORE**: volatilidad, drawdown de posición, estado técnico, falta de verificación fundamental.
- **EARLY SCORE (cripto)**: market cap pequeña + aceleración 7d moderada + 24h no parabólico + rank. Compara siempre contra `discoveryPrice`.
- **ASYMMETRY SCORE**: ratio upside/downside de los escenarios BEAR/BULL ajustado por calidad de entrada y FOMO.

## 7. Frecuencias de actualización

| Capa | Frecuencia |
|---|---|
| Quotes cripto/commodities/índices | Cada ejecución del pipeline |
| Pipeline completo (precios, técnicos, scores, tesis, detecciones) | Cada 60 min (scheduler en servidor) + botón "Actualizar datos" bajo demanda |
| Fundamentales (Nasdaq summary) | Con cada pipeline (cambian poco) |
| Performance | En cada pipeline, evaluando horizontes cumplidos |
| Fase 2: noticias frecuente, macro según publicación, fundamentales diario/earnings | Planificado |

## 8. Riesgos técnicos conocidos

1. **Alcance de red del servidor**: CoinGecko/DexScreener/Stooq/Yahoo pueden estar bloqueados según el entorno. El pipeline lo tolera: marca DATA UNAVAILABLE y conserva el último dato bueno con su timestamp (estado STALE).
2. **Límites de fuentes gratuitas**: EODHD demo cubre símbolos limitados; Coinlore solo top-100. La arquitectura de `sourceMeta` permite añadir API keys opcionales (`.env`) sin tocar el código de los motores.
3. **Fundamentales profundos** (backlog, guidance, revisiones, CAPEX): no hay fuente gratuita fiable en tiempo real para todos los mercados; se resuelve en Fase 2 con SEC EDGAR (US) y reportes trimestrales.
4. **Datos de índices internacionales y commodities con histórico**: dependen de Stooq/Yahoo en runtime.
5. **Scheduler en memoria**: suficiente para Fase 1; la Fase 4 debe moverlo a jobs persistentes.

## 9. Qué funciona sin APIs pagadas

**Todo lo implementado.** Equity Radar (US) completo con histórico real, Crypto Radar con BTC/ETH + top-100, FX con datos oficiales del BCE, Technical/Entry/Risk/FOMO/Thesis engines, detecciones, performance, paper mode, watchlist y auditoría — sin una sola API de pago obligatoria. La cobertura MX/JP/UK y el histórico de commodities se amplían automáticamente en cuanto la red del servidor alcance Stooq/Yahoo.

## 10. Roadmap (según especificación)

- **Fase 2**: expansión global de equities, rotación sectorial/país, CAPEX avanzado, backlog, News Engine.
- **Fase 3**: supply chain mapping, datos institucionales (13F), macro avanzado, rotación de narrativas, smart wallets.
- **Fase 4**: optimización estadística de scores contra performance real medida por el propio sistema.
- **Fase 5**: endurecimiento comercial: auth (Kimi OAuth), roles, suscripciones, límites, billing.
