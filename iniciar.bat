@echo off
setlocal
cd /d "%~dp0"
title Bot de figurinhas
where node >nul 2>&1
if errorlevel 1 (
  echo Instale o Node.js LTS 22.12 ou superior em https://nodejs.org/
  pause
  exit /b 1
)
if not exist .env copy /y .env.example .env >nul
if not exist node_modules\whatsapp-web.js\package.json (
  echo Instalando dependencias e navegador. A primeira vez pode demorar alguns minutos.
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo A instalacao falhou. Confira sua internet e tente novamente.
    pause
    exit /b 1
  )
)
call npm start
pause
