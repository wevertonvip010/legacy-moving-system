@echo off
cd /d C:\legacy-moving-system
git add -A
git commit -m "feat: sessao 3 – Organizer aba Indicacoes; fix Configuracoes; cleanup api.js

ORGANIZERS
- Backend: GET /api/organizers/<id>/leads retorna leads indicados com status, orcamento, OS
- Frontend: modal com abas Resumo / Indicacoes / Comissoes
  Convertidos mostram link para OS; nao-convertidos mostram valor e justificativa
  Filtros por status (todos/abertos/convertidos/cancelados/arquivados)

FIX CONFIGURACOES
- Pagina renderizava branco: u.permissoes vinha como null/string da API
- Corrigido com parsePerms() que normaliza para array em todos os mappers de usuario

API.JS CLEANUP
- Removidas 8 definicoes duplicadas (etapas, materiais, fechamento, fechamentos)
- Removidos aliases mortos getFechamentoOS e updateFechamentoOS
- Extraido helper qs() para query strings
- Estrutura reorganizada em 18 secoes por dominio

SESSOES ANTERIORES (ja commitadas, registro historico)
- Programacao: criado_por_nome no card + permissoes de edicao/exclusao
- Fechamento Operacional: pre-calculo automatico de custos da OS
- OS <-> Estoque: consumo automatico + alertas de reposicao
- Organizer: comissao calculada sobre lucro liquido (10%)"
git push origin main
pause
