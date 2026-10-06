# AGENTS.md — Global Opportunity Engine

## Qué es
Aplicación full-stack "Global Opportunity Engine" (radar multiactivo de inversión) creada para la
plataforma Kimi. React 19 + Vite (frontend) + Hono + tRPC 11 (API) + Drizzle ORM + MySQL.
El código fuente está en `app/`; el diseño original en `ARQUITECTURA.md`.

## Cómo correrlo en esta plataforma
Script idempotente: `./start.sh` (arranca dockerd, MySQL, instala deps, migra, compila y sirve).
Watchdog: `./watchdog.sh` revisa cada minuto y relanza `start.sh` si el servidor no responde.
Documentación de instalación (Linux/Windows/Docker): `README.md` en la raíz. Lanzador Windows: `start.bat`.
Build/arranque multiplataforma vía `app/scripts/{build,run,setup-env}.mjs` (npm run build/start/env:init).
Docker: `app/Dockerfile` + `app/docker-compose.yml` (servicios `db`, `migrate` con profile tools, `app`).

### Reinicios del entorno (importante)
Esta plataforma **recrea el contenedor/host** entre sesiones: se pierden el demonio Docker, el
contenedor MySQL (aunque tiene `--restart unless-stopped`, muere con el host) y el servidor.
La URL deja de abrir hasta relanzar `./start.sh`. Tras un reinicio la BD aparece vacía (contenedor
MySQL nuevo) y hay que repoblar; el scheduler lo hace solo a los 2 min, o manual:
`curl -X POST http://127.0.0.1:12000/api/trpc/system.refresh -H 'Content-Type: application/json' -d '{"json":null}'`.
No hay `cron`/`systemd` en el contenedor, por eso el watchdog es un proceso aparte.

Manual:
```bash
sudo nohup dockerd > /tmp/dockerd.log 2>&1 &   # si el demonio no está arriba
sudo docker start ope-mysql                     # contenedor MySQL 8 (puerto 3306)
cd app
npm install
npm run db:push                                 # crea/actualiza el esquema Drizzle
npm run build                                   # vite build + esbuild api/boot.ts -> dist/boot.js
NODE_ENV=production PORT=12000 node dist/boot.js
```

URLs expuestas: puerto **12000** (`https://work-1-kfdjkvqflniztjlm.prod-runtime.all-hands.dev/`).
El puerto 12001 es libre.

## Entorno / credenciales (`.env` en `app/`, no versionado)
- `DATABASE_URL=mysql://appuser:apppass@127.0.0.1:3306/opportunity`
- `APP_ID`, `APP_SECRET` (en local se generan valores de desarrollo; en Kimi los provee la plataforma)

## Puntos importantes del código
- `app/api/lib/env.ts` exige `DATABASE_URL`, `APP_ID`, `APP_SECRET` cuando `NODE_ENV=production`.
- `app/api/boot.ts` solo arranca el servidor HTTP y el scheduler si `NODE_ENV=production`;
  en dev se usa el plugin `@hono/vite-dev-server` (Vite, puerto 3000).
- Scheduler (`app/api/scheduler.ts`): pipeline completo cada 60 min + uno a los 2 min del arranque.
- El pipeline (`app/api/pipeline.ts`) tolera fuentes caídas: marca `DATA_UNAVAILABLE`/`STALE`
  en `data_quality` y nunca inventa valores.
- `package-lock.json` fue repuntado del mirror privado `npm.mirrors.msh.team` (inalcanzable aquí)
  a `registry.npmjs.org`. Si se regenera el lock, hacerlo contra el registro público.

## Fuentes de datos (red verificada en esta plataforma)
OK: Nasdaq, Yahoo Finance, Frankfurter (BCE), CNBC, Kraken, Coinbase, CoinGecko, Coinlore, DexScreener, Blockchain.info, EODHD (demo).
Bloqueadas/limitadas aquí: Stooq (challenge anti-bot), Binance (451), Bybit (403), OKX (000), CryptoCompare (401 sin key).

### Cripto — histórico (lo que arreglé)
Antes solo BTC/ETH tenían barras (vía EODHD demo) y CoinGecko estaba declarado en el orden de
fuentes pero **sin rama en `collectBars()`**, por lo que nunca se consultaba. Se añadió:
- `fetchKrakenHistory` (OHLCV diario real, 400 barras, 8/8 cripto) — fuente primaria.
- `fetchCoinbaseHistory` (velas diarias reales) — respaldo 1.
- `fetchCoingeckoHistory` (`market_chart` 365d; open=cierre previo, high/low del tramo) — respaldo 2.
- `fetchDexscreenerQuote` — cotización spot del pool de mayor liquidez, respaldo de quote.
- `fetchDexscreenerProfile` — discovery de pools (no histórico).
Orden cripto en `sourceOrder`: kraken → coinbase → coingecko → eodhd → blockchain → yahoo.

## Estado verificado
- 59 activos en el universo; **59/59 con precios** tras el arreglo (antes 52/59).
- 8/8 cripto con 400 barras Kraken + scores + tesis; typecheck y build OK.
- SPA y tRPC responden 200; detalle con tesis completa.

## Nota de modelo (no corregido a propósito)
`riskScoreOf` arranca en 55 para cripto y suma hasta +25 por ATR%; con umbral `>=80` varias
cripto caen en `FUNDAMENTAL_RISK` aunque su riesgo sea puramente de volatilidad (la etiqueta
es engañosa). Es una decisión de diseño del motor; no se cambió la semántica.
