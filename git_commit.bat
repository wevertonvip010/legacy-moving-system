@echo off
cd /d C:\legacy-moving-system
git add -A
git commit -m "feat: brand identity + CPF login fix + paginacao + notificacoes – redesign login/sidebar com logo Legacy Moving, cadastro colaborador usa CPF real, paginacao Leads/Clientes/OS, alertas leads parados e OS proximas"
git push origin main
pause
