@echo off
echo Configurando segredos no Fly.io...
cd /d C:\legacy-moving-system\backend

flyctl secrets set ^
  JWT_SECRET_KEY=legacy-moving-2026-chave-secreta-producao-XkZ9mP2qR4vN8wL ^
  SITE_TOKEN=legacy-site-2026-token ^
  FLASK_ENV=production ^
  --app legacy-mv-api

echo.
echo Segredos configurados!
pause
