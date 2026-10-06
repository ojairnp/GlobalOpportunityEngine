#!/usr/bin/env bash
# ============================================================
#  Global Opportunity Engine - arranque en Linux / macOS
#  - Si no hay MySQL accesible y existe Docker, levanta MySQL 8 en un contenedor.
#  - Si ya tienes MySQL (o el contenedor corriendo), respeta app/.env.
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/app"
PORT="${PORT:-12000}"

# 1) Docker solo si hace falta (no hay MySQL en 3306)
if ! (exec 3<>/dev/tcp/127.0.0.1/3306) 2>/dev/null; then
  if command -v docker >/dev/null 2>&1; then
    if ! docker info >/dev/null 2>&1 && command -v sudo >/dev/null 2>&1; then
      echo "[start] arrancando dockerd..."
      sudo nohup dockerd > /tmp/dockerd.log 2>&1 &
      sleep 6
    fi
    DOCKER="docker"
    docker info >/dev/null 2>&1 || DOCKER="sudo docker"
    if ! $DOCKER ps --format '{{.Names}}' | grep -q '^ope-mysql$'; then
      if $DOCKER ps -a --format '{{.Names}}' | grep -q '^ope-mysql$'; then
        $DOCKER start ope-mysql
      else
        echo "[start] creando contenedor MySQL..."
        $DOCKER run -d --name ope-mysql --restart unless-stopped \
          -e MYSQL_ROOT_PASSWORD=rootpass -e MYSQL_DATABASE=opportunity \
          -e MYSQL_USER=appuser -e MYSQL_PASSWORD=apppass -p 3306:3306 mysql:8.0
      fi
    fi
    echo "[start] esperando a MySQL..."
    for _ in $(seq 1 40); do
      $DOCKER exec ope-mysql mysqladmin ping -h127.0.0.1 -uroot -prootpass >/dev/null 2>&1 && break
      sleep 3
    done
  else
    echo "[start] AVISO: no hay MySQL en 127.0.0.1:3306 ni Docker disponible."
    echo "        Instala MySQL 8 o ajusta DATABASE_URL en app/.env y vuelve a ejecutar."
  fi
fi

# 2) Dependencias, entorno, esquema, build y arranque
cd "$APP"
[ -f .env ] || npm run env:init
[ -d node_modules ] || npm install
npm run db:push
npm run build

echo "[start] servidor en http://0.0.0.0:${PORT}/"
exec npm start
