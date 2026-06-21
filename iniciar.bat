@echo off
echo Iniciando Legacy Moving ERP...
echo.

echo [1/2] Iniciando Backend (porta 5000)...
start "Legacy Moving - Backend" cmd /k "cd /d C:\legacy-moving-system\backend\src && py main.py"

timeout /t 3 /nobreak >nul

echo [2/2] Iniciando Frontend (porta 5173)...
start "Legacy Moving - Frontend" cmd /k "cd /d C:\legacy-moving-system\frontend && npm run dev -- --host"

echo.
echo ✓ Sistema iniciado!
echo.
echo  PC/Notebook:  http://localhost:5173
echo  Celular/iPad: http://192.168.0.12:5173
echo.
echo Aguarde 5 segundos e acesse no navegador...
timeout /t 5 /nobreak >nul
start http://localhost:5173
