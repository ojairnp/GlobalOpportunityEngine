// Link de tRPC para el modo estático (GitHub Pages).
// Resuelve cada procedimiento leyendo snapshot/<path>.json en lugar de hacer
// una petición HTTP al backend. Los datos son de solo lectura y los snapshots
// se generan con scripts/snapshot-api.mjs contra una instancia real.
import type { TRPCLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import { ASSET_PREFIX } from "@/lib/staticMode";

const cache = new Map<string, Promise<unknown>>();

function fetchJson(url: string): Promise<unknown> {
  const hit = cache.get(url);
  if (hit) return hit;
  const promise = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`Sin datos estáticos (HTTP ${res.status})`);
    return res.json();
  });
  cache.set(url, promise);
  return promise;
}

// Procedimientos guardados como mapa { clave: datos } en lugar de un valor único.
function inputKey(path: string, input: unknown): string {
  const obj = (input ?? {}) as Record<string, unknown>;
  if (path === "radar.detail") return String(obj.id);
  if (path === "radar.opportunities") return String(obj.type ?? "all");
  return "";
}

async function load(path: string, input: unknown): Promise<unknown> {
  const file = await fetchJson(`${ASSET_PREFIX}/snapshot/${path}.json`);
  const key = inputKey(path, input);
  let wire: unknown = file;
  if (key) {
    const map = file as Record<string, unknown>;
    wire = map[key];
    if (wire === undefined) throw new Error(`Sin datos estáticos para "${path}" (clave ${key})`);
  }
  // El snapshot guarda la respuesta tal como viaja por HTTP ({ json, meta });
  // superjson la reconstruye igual que lo haría httpBatchLink.
  return superjson.deserialize(wire as never);
}

export const staticLink: TRPCLink<AppRouter> = () => {
  return ({ op }) =>
    observable<{ result: { data: unknown } }>((observer) => {
      // En GitHub Pages no hay backend: las acciones de escritura no aplican.
      if (op.type === "mutation") {
        observer.error(
          TRPCClientError.from(
            new Error("Vista publicada en GitHub Pages: solo lectura. Ejecuta el proyecto en local para usar esta función.")
          ) as never
        );
        return () => {};
      }
      load(op.path, op.input)
        .then((data) => {
          observer.next({ result: { data } });
          observer.complete();
        })
        .catch((cause) => {
          observer.error(TRPCClientError.from(cause as Error) as never);
        });
      return () => {};
    });
};
