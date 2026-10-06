# Global Opportunity Engine (GOE)

Radar multiactivo de oportunidades: analiza **acciones, cripto, commodities, divisas e índices**,
calcula indicadores técnicos, puntúa oportunidad/entrada/riesgo/FOMO y genera una tesis
("por qué aparece") para cada activo. Fase 1: el sistema analiza, tú decides.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind (shadcn/ui)
- **Backend:** Hono + tRPC 11
- **Datos:** Drizzle ORM + MySQL 8
- **Runtime:** Node.js 20 o superior

El diseño técnico detallado está en [`ARQUITECTURA.md`](./ARQUITECTURA.md).

---

## 1. Requisitos

| Componente | Versión | Notas |
|---|---|---|
| Node.js | 20 o superior (probado con 22 y 24) | https://nodejs.org (LTS) |
| MySQL | 8.x | Servidor accesible por TCP |
| Docker | Opcional | Solo si prefieres no instalar MySQL a mano |

La aplicación **necesita un MySQL**. No hay modo SQLite ni datos en memoria.

---

## 2. Arranque rápido

### Linux / macOS

```bash
unzip Global-Opportunity-Engine.zip
cd Global-Opportunity-Engine
./start.sh
```

`start.sh` hace todo: si no detecta MySQL en `127.0.0.1:3306` y hay Docker, levanta el
contenedor `ope-mysql`; después crea `.env`, instala dependencias, aplica el esquema,
compila y arranca el servidor en **http://localhost:12000/**.

Si prefieres MySQL nativo (sin Docker), arráncalo antes y crea la base:

```bash
sudo systemctl start mysql
sudo mysql -e "CREATE DATABASE opportunity; \
  CREATE USER 'appuser'@'%' IDENTIFIED BY 'apppass'; \
  GRANT ALL ON opportunity.* TO 'appuser'@'%'; FLUSH PRIVILEGES;"
./start.sh
```

### Windows

Requisitos previos: instalar **Node.js 20+** y **MySQL 8** (instalador oficial o Docker Desktop).

```bat
:: 1) Descomprime el ZIP y entra en la carpeta
cd Global-Opportunity-Engine

:: 2) Arranca todo
start.bat
```

`start.bat` crea `.env`, instala dependencias, aplica el esquema, compila y arranca el
servidor en **http://localhost:12000/**.

Si usas Docker Desktop para MySQL, ejecuta antes:

```bat
docker run -d --name ope-mysql ^
  -e MYSQL_ROOT_PASSWORD=rootpass -e MYSQL_DATABASE=opportunity ^
  -e MYSQL_USER=appuser -e MYSQL_PASSWORD=apppass ^
  -p 3306:3306 mysql:8.0
```

Si usas MySQL nativo en Windows, crea la base (MySQL Workbench o consola):

```sql
CREATE DATABASE opportunity;
CREATE USER 'appuser'@'%' IDENTIFIED BY 'apppass';
GRANT ALL ON opportunity.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
```

---

## 3. Arranque manual (paso a paso, cualquier sistema)

Los lanzadores son atajos; esto es lo que hacen por dentro. Ejecuta desde `app/`:

```bash
cd app

# 1. Crea .env con valores de desarrollo (APP_ID, APP_SECRET, DATABASE_URL)
npm run env:init

# 2. Instala dependencias
npm install

# 3. Crea las tablas en MySQL (requiere la base 'opportunity' ya creada)
npm run db:push

# 4. Compila frontend (dist/public) y servidor (dist/boot.js)
npm run build

# 5. Arranca en producción -> http://localhost:12000/
npm start
```

Para cambiar el puerto: `PORT=8080 npm start` (Linux/macOS) o `set PORT=8080 && npm start` (Windows).

### Modo desarrollo (recarga en caliente)

```bash
cd app
npm run dev     # Vite en http://localhost:3000 con HMR
```

---

## 4. Opción todo-contenedor (Docker Compose)

No necesitas instalar Node ni MySQL en el equipo.

```bash
cd app
docker compose up -d --build     # levanta MySQL + aplicación
docker compose run --rm migrate  # crea el esquema (una sola vez)
```

Abre **http://localhost:12000/** y pulsa **"Actualizar datos"**.

Comandos útiles:

```bash
docker compose logs -f app       # ver logs
docker compose down              # parar (conserva los datos en el volumen)
docker compose down -v           # parar y borrar también los datos
```

---

## 5. Variables de entorno

Se leen de `app/.env` (puedes copiar `app/.env.example`). En Docker se definen en
`docker-compose.yml`.

| Variable | Obligatoria | Descripción | Ejemplo |
|---|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión MySQL | `mysql://appuser:apppass@127.0.0.1:3306/opportunity` |
| `APP_ID` | Sí | Identificador de la aplicación (firma JWT) | `local-dev-app-id` |
| `APP_SECRET` | Sí | Secreto de firma. **Cámbialo en producción** | `una-cadena-larga-y-aleatoria` |
| `PORT` | No | Puerto HTTP (por defecto `12000`) | `8080` |
| `NODE_ENV` | No | `production` para servir la app compilada | `production` |

---

## 6. Primeros pasos tras arrancar

1. Abre **http://localhost:12000/**
2. Pulsa **"Actualizar datos"**: ejecuta el pipeline completo (precios, indicadores,
   scores y tesis). Tarda ~1-2 minutos la primera vez.
3. Navega por **Dashboard, Equity Radar, Crypto Radar, CFD/Táctico, Macro, Performance**.
4. En cada fila, **"WHY?"** abre la ficha del activo con la tesis completa.

El planificador interno repite el pipeline **cada 60 minutos** de forma automática.

---

## 7. Comandos disponibles (`app/package.json`)

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo Vite con HMR (puerto 3000) |
| `npm run build` | Compila frontend + servidor a `dist/` |
| `npm start` | Arranca el servidor de producción (puerto 12000) |
| `npm run check` | Verificación de tipos (`tsc -b`) |
| `npm test` | Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run env:init` | Crea `.env` desde `.env.example` |
| `npm run db:push` | Aplica el esquema Drizzle a MySQL |
| `npm run db:generate` | Genera migraciones SQL |
| `npm run db:migrate` | Aplica migraciones |

---

## 8. Fuentes de datos

El sistema usa **solo fuentes gratuitas, sin API keys**. Nunca inventa datos: si una fuente
no responde, el activo queda marcado `DATA UNAVAILABLE`.

| Capa | Fuentes |
|---|---|
| Cripto (histórico) | Kraken (primaria), Coinbase, CoinGecko |
| Cripto (spot/discovery) | DexScreener, Coinlore |
| Acciones / índices | Nasdaq, Yahoo Finance |
| Commodities | Yahoo Finance, CNBC |
| Divisas (FX) | Frankfurter (Banco Central Europeo) |
| Macro | Frankfurter, fuentes públicas |
| On-chain | Blockchain.info |

Prioridad cripto: `kraken → coinbase → coingecko → eodhd → blockchain → yahoo`.

> Algunas fuentes están bloqueadas según la red (Stooq, Binance, Bybit, OKX). El pipeline
> continúa con las siguientes de la lista.

---

## 9. Estructura del proyecto

```
Global-Opportunity-Engine/
├── ARQUITECTURA.md          Diseño técnico y decisiones
├── README.md                Este documento
├── start.sh                 Lanzador Linux / macOS
├── start.bat                Lanzador Windows
├── app/
│   ├── api/                 Backend: Hono + tRPC
│   │   ├── collectors/      Conectores a las fuentes de datos
│   │   ├── engines/         Indicadores, scoring, tesis
│   │   ├── routers/         Endpoints tRPC
│   │   ├── pipeline.ts      Pipeline de ingesta + análisis
│   │   └── scheduler.ts     Job periódico (60 min)
│   ├── src/                 Frontend React
│   │   ├── components/      UI (incl. shadcn/ui)
│   │   └── pages/           Vistas
│   ├── db/                  Esquema y utilidades Drizzle
│   ├── contracts/           Tipos compartidos front/back
│   ├── scripts/             Utilidades de build multiplataforma
│   ├── Dockerfile           Imagen de producción
│   └── docker-compose.yml   Stack completo (app + MySQL)
```

---

## 10. Solución de problemas

**"No se pudo conectar a MySQL" / `db:push` falla**
Verifica que MySQL está arriba y que `DATABASE_URL` en `app/.env` es correcta.
Prueba la conexión: `mysql -h 127.0.0.1 -u appuser -p opportunity`.
Si el puerto 3306 está ocupado por otro MySQL, cambia el mapeo (`-p 3307:3306`) y ajusta la URL.

**El navegador no abre / "no se puede acceder al sitio"**
Comprueba que el servidor está escuchando: `curl http://127.0.0.1:12000/` debe devolver `200`.
Si usas Docker, revisa `docker compose logs -f app`. Si el puerto 12000 está ocupado,
arranca con otro: `PORT=8080 npm start`.

**La web carga pero todas las filas dicen "DATA UNAVAILABLE"**
La base está vacía. Pulsa **"Actualizar datos"** o reinicia el servidor (el planificador
carga datos a los ~2 minutos del arranque).

**`npm run build` falla con errores de comillas en Windows**
Ya está resuelto: el build usa `node scripts/build.mjs` (multiplataforma) en lugar de un
comando con comillas anidadas. Si ves ese error, estás usando un `package.json` antiguo.

**Error `Missing required environment variable`**
Falta `APP_ID`, `APP_SECRET` o `DATABASE_URL`. Ejecuta `npm run env:init` en `app/`.

**Las fuentes devuelven 403 / 451 / 000**
Es bloqueo de red del proveedor o del entorno. El pipeline salta a la siguiente fuente;
no es un fallo de la aplicación.

---

## 11. Notas para producción

- Cambia `APP_SECRET` y las credenciales de MySQL por valores propios.
- Sirve detrás de HTTPS con un proxy inverso (nginx, Caddy, Traefik).
- El puerto por defecto es **12000**; ajústalo con la variable `PORT`.
- Los datos de mercado tienen carácter informativo. No es asesoramiento financiero.

---

## 12. Publicación estática en GitHub Pages

El repositorio incluye una vista **de solo lectura** publicada en GitHub Pages:

- URL: `https://ojairnp.github.io/GlobalOpportunityEngine/`
- No requiere backend ni MySQL: el frontend lee los datos de `app/public/snapshot/*.json`,
  un snapshot versionado que se genera contra una instancia real.
- Las acciones de escritura (actualizar datos, watchlist, paper) están deshabilitadas
  en la vista publicada. Para usarlas, ejecuta el proyecto en local.

### Generar o actualizar el snapshot

Con el servicio local en marcha en `http://127.0.0.1:12000`:

```bash
cd app
npm run snapshot                     # consulta la API y escribe public/snapshot/*.json
VITE_BASE=/GlobalOpportunityEngine/ npm run build:static
```

`build:static` también genera `404.html` (fallback del SPA para rutas profundas como
`/asset/22`). El workflow `.github/workflows/pages.yml` compila y publica en cada push
a `main`, reutilizando el snapshot versionado (`SKIP_SNAPSHOT=1`).

