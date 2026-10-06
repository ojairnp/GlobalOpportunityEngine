// Arranque multiplataforma del servidor de producción.
// NODE_ENV=production y PORT se fijan aquí, así funciona igual en
// Linux/macOS y en Windows (donde "NODE_ENV=x cmd" no existe).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const child = spawn(process.execPath, [path.join(root, "dist", "boot.js")], {
  stdio: "inherit",
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV ?? "production",
    PORT: process.env.PORT ?? "12000",
  },
});

child.on("exit", (code) => process.exit(code ?? 0));
