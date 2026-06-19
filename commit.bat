@echo off
cd /d C:\legacy-moving-system
git config --global user.email "wevertondlima@gmail.com"
git config --global user.name "Weverton Lima"
if exist .git\index.lock del .git\index.lock
git add -A
echo.
echo === Status atual ===
git status
echo.
echo === Fazendo commit ===
git commit -m "fix: corrige bugs criticos do backend e cria .env"
echo.
echo === Fazendo push ===
git push origin main
echo.
echo === Concluido ===
pause
