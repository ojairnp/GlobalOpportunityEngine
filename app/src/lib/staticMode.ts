// Modo estático: permite publicar el frontend en GitHub Pages (solo archivos
// estáticos, sin backend). En vez de llamar a tRPC por HTTP, se leen los datos
// de un "snapshot" JSON generado por scripts/snapshot-api.mjs.
export const STATIC_MODE = import.meta.env.VITE_STATIC === "1";

// Vite define BASE_URL con la base de despliegue (p. ej. /GlobalOpportunityEngine/).
// Se normaliza sin barra final para usarlo como basename y para armar rutas.
const RAW_BASE = import.meta.env.BASE_URL || "/";
export const BASE_PATH = RAW_BASE === "/" ? "/" : RAW_BASE.replace(/\/+$/, "");

// Prefijo para recursos ("" en raíz, "/repo" en subdirectorio).
export const ASSET_PREFIX = BASE_PATH === "/" ? "" : BASE_PATH;

