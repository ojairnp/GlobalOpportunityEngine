// Build multiplataforma (Linux, macOS, Windows).
// Sustituye al script con comillas anidadas, que falla en cmd.exe.
//   1) vite build            -> frontend estático en dist/public
//   2) esbuild api/boot.ts   -> servidor ESM en dist/boot.js
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("> vite build");
run("npx", ["vite", "build"]);

console.log("> esbuild api/boot.ts");
await build({
  entryPoints: [path.join(root, "api", "boot.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(root, "dist", "boot.js"),
  banner: {
    js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
  },
});

console.log("Build OK -> dist/public (frontend) + dist/boot.js (servidor)");
