#!/usr/bin/env bash
# Watchdog: mantiene el servicio arriba dentro de este contenedor.
# Revisa cada minuto y relanza start.sh si el servidor no responde.
# Nota: si el host/contenedor se recrea por completo, este proceso también
# desaparece; en ese caso hay que volver a lanzar ./start.sh (o pedírmelo).
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-12000}"
LOG=/tmp/ope-watchdog.log

while true; do
  if ! curl -sf -o /dev/null "http://127.0.0.1:${PORT}/"; then
    echo "$(date -Is) servidor caído, relanzando start.sh" >> "$LOG"
    ( cd "$ROOT" && nohup ./start.sh >> /tmp/ope-start.log 2>&1 & )
    sleep 90
  fi
  sleep 60
done
