// Build estático para GitHub Pages.
//   1) genera public/snapshot/*.json desde un backend en marcha (si está disponible)
//   2) compila el frontend con VITE_STATIC=1 y base = VITE_BASE
// No compila el servidor: Pages solo sirve archivos estáticos.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args, env) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// 1) Snapshot (opcional): si el backend no responde, se conserva el snapshot previo.
//    En CI (GitHub Actions) se omite con SKIP_SNAPSHOT=1 y se usa el versionado.
if (process.env.SKIP_SNAPSHOT === "1") {
  console.log("SKIP_SNAPSHOT=1: se usa el snapshot versionado en public/snapshot/");
} else {
  const snap = spawnSync(process.execPath, [path.join(root, "scripts", "snapshot-api.mjs")], {
    stdio: "inherit",
    cwd: root,
  });
  if (snap.status !== 0) {
    console.warn("Aviso: no se pudo regenerar el snapshot; se usará el existente (si lo hay).");
  }
}

// 2) Compilación estática del frontend.
run("npx", ["vite", "build"], {
  VITE_STATIC: "1",
  VITE_BASE: process.env.VITE_BASE ?? "/",
});

const snapDir = path.join(root, "public", "snapshot");
const hasSnap = fs.existsSync(snapDir) && fs.readdirSync(snapDir).length > 0;

// GitHub Pages sirve 404.html para rutas desconocidas; copiarlo desde index.html
// permite que las rutas del SPA (p. ej. /asset/22) funcionen al recargar o compartir.
const distDir = path.join(root, "dist", "public");
const indexHtml = path.join(distDir, "index.html");
if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, path.join(distDir, "404.html"));
}

console.log(`Build estático OK -> dist/public${hasSnap ? " (con snapshot de datos)" : " (SIN snapshot)"}`);
