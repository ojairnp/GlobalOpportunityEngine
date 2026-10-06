# app — Global Opportunity Engine (código)

Aplicación React 19 + Vite (frontend) + Hono + tRPC 11 (backend) + Drizzle ORM + MySQL 8.

La guía de instalación completa (Linux, Windows y Docker) está en
[`../README.md`](../README.md). Esta carpeta contiene el código y los scripts.

## Comandos

```bash
npm run env:init    # crea .env desde .env.example
npm install         # instala dependencias
npm run db:push     # aplica el esquema Drizzle a MySQL
npm run build       # compila frontend (dist/public) y servidor (dist/boot.js)
npm start           # arranca en producción (PORT, por defecto 12000)
npm run dev         # desarrollo con HMR (puerto 3000)
npm run check       # verificación de tipos
npm test            # tests (Vitest)
```

## Docker

```bash
docker compose up -d --build
docker compose run --rm migrate
```

## Estructura

- `api/` — backend: `collectors/` (fuentes), `engines/` (indicadores/scoring/tesis),
  `routers/` (tRPC), `pipeline.ts`, `scheduler.ts`, `boot.ts`.
- `src/` — frontend: `pages/`, `components/` (incl. `ui/` shadcn), `hooks/`, `lib/`, `providers/`.
- `db/` — esquema Drizzle (`schema.ts`), relaciones y utilidades.
- `contracts/` — tipos compartidos entre frontend y backend.
- `scripts/` — utilidades multiplataforma de build/arranque.
