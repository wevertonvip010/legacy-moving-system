@echo off
echo ============================================
echo  Reiniciando Backend Legacy Moving ERP
echo ============================================
echo.

REM Mata processos na porta 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Processos anteriores encerrados.
echo Iniciando backend...
echo.

cd /d C:\legacy-moving-system\backend

REM Caminho Python direto (prioridade maxima)
if exist "C:\Users\wever\AppData\Local\Python\bin\python.exe" (
    echo Usando: Python Local
    "C:\Users\wever\AppData\Local\Python\bin\python.exe" src\main.py
    goto end
)

REM Tenta py launcher
where py >nul 2>&1 && (
    echo Usando: py
    py src\main.py
    goto end
)

REM Tenta python3
where python3 >nul 2>&1 && (
    echo Usando: python3
    python3 src\main.py
    goto end
)

echo ERRO: Python nao encontrado.

:end
pause
