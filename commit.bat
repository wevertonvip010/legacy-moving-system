@echo off
cd /d C:\legacy-moving-system
git config --global user.email "wevertondlima@gmail.com"
git config --global user.name "Weverton Lima"
if exist .git\index.lock del .git\index.lock
git add -A
git commit -m "deploy: prepara Railway + Vercel (postgres, psycopg2, vercel.json)"
git push origin main
echo.
echo === Deploy commit concluido! ===
pause
