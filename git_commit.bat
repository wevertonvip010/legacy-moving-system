@echo off
cd /d C:\legacy-moving-system
git add -A
git commit -m "feat: fechamento operacional pre-calcula custos da OS + programacao com controle de permissao – equipe (val_diaria x dias) e materiais (estoque consumido) preenchidos automaticamente ao abrir fechamento, badge 'auto' nos campos, botao Recalcular da OS; cards de programacao mostram 'Agendado por X', permissao edit/delete admin/criador, modal de justificativa para nao-admin"
git push origin main
pause
