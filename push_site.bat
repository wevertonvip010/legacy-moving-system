@echo off
echo ================================================
echo  Legacy Moving — Push site institucional
echo ================================================
echo.

echo [1/4] Clonando legacy-site...
if exist "%TEMP%\legacy-site" rmdir /s /q "%TEMP%\legacy-site"
git clone https://github.com/wevertonvip010/legacy-site.git "%TEMP%\legacy-site"
if %errorlevel% neq 0 (
    echo ERRO ao clonar. Verifique sua conexao e credenciais.
    pause
    exit /b 1
)

echo.
echo [2/4] Copiando main.js atualizado...
copy /y "C:\legacy-moving-system\main_site_atualizado.js" "%TEMP%\legacy-site\main.js"

echo.
echo [3/4] Commitando...
cd /d "%TEMP%\legacy-site"
git config user.email "wevertondlima@gmail.com"
git config user.name "Weverton"
git add main.js
git commit -m "fix: integracao ERP - e.preventDefault + feedback visual + validacao + LEGACY_CONFIG"

echo.
echo [4/4] Enviando para GitHub...
git push origin master

echo.
echo ================================================
echo  PRONTO! Site atualizado no GitHub.
echo  Proxima etapa: publicar no Netlify e atualizar
echo  a URL do backend em main.js (LEGACY_API)
echo ================================================
pause
