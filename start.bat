@echo off
REM ============================================================
REM  Global Opportunity Engine - arranque en Windows (nativo)
REM  Requisitos: Node.js 20+ y un MySQL 8 accesible.
REM  Configura la conexion en app\.env (DATABASE_URL).
REM ============================================================
setlocal
cd /d "%~dp0app"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado. Descargalo de https://nodejs.org/ ^(LTS 20+^)
  exit /b 1
)

echo [1/5] Comprobando .env ...
if not exist ".env" (
  call npm run env:init
)

echo [2/5] Instalando dependencias ...
if not exist "node_modules" (
  call npm install
  if errorlevel 1 exit /b 1
)

echo [3/5] Aplicando el esquema a MySQL ...
call npm run db:push
if errorlevel 1 (
  echo [ERROR] No se pudo conectar a MySQL. Revisa DATABASE_URL en app\.env
  echo         Formato: mysql://usuario:contrasena@127.0.0.1:3306/opportunity
  exit /b 1
)

echo [4/5] Compilando frontend y servidor ...
call npm run build
if errorlevel 1 exit /b 1

echo [5/5] Arrancando servidor en http://localhost:12000/
echo       Pulsa "Actualizar datos" en la web para cargar el primer pipeline.
call npm start
