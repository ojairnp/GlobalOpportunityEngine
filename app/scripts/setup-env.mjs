// Crea app/.env desde .env.example si no existe, con valores de desarrollo.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (fs.existsSync(envPath)) {
  console.log(".env ya existe, no se toca.");
  process.exit(0);
}

let template = fs.readFileSync(examplePath, "utf-8");
template = template
  .replace(/^APP_ID=.*$/m, "APP_ID=local-dev-app-id")
  .replace(/^APP_SECRET=.*$/m, "APP_SECRET=local-dev-secret-change-me-0123456789abcdef")
  .replace(/^DATABASE_URL=.*$/m, "DATABASE_URL=mysql://appuser:apppass@127.0.0.1:3306/opportunity");

fs.writeFileSync(envPath, template);
console.log("Creado app/.env con valores de desarrollo. Ajusta DATABASE_URL si usas otro host.");
