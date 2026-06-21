@echo off
echo ================================================
echo  Legacy Moving — Deploy Backend no Fly.io
echo ================================================
echo.

echo [1/3] Verificando se flyctl esta instalado...
where flyctl >nul 2>&1
if %errorlevel% neq 0 (
    echo flyctl nao encontrado. Instalando...
    powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
    echo.
    echo IMPORTANTE: Feche e reabra este terminal apos a instalacao,
    echo depois execute deploy-fly.bat novamente.
    pause
    exit
)

echo flyctl encontrado!
echo.

echo [2/3] Login no Fly.io (abrira o navegador)...
flyctl auth login
echo.

echo [3/3] Fazendo deploy do backend...
cd /d C:\legacy-moving-system\backend
flyctl deploy --remote-only
echo.
echo ================================================
echo  Deploy concluido!
echo  URL: https://legacy-mv-api.fly.dev
echo ================================================
echo.
echo Proximos passos:
echo 1. Copie a URL acima
echo 2. Cole no arquivo main.js do site no GitHub
echo    (linha: var LEGACY_API = 'URL-AQUI')
echo.
pause
