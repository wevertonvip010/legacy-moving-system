# CONTEXTO DO PROJETO — LEGACY MOVING ERP
> Atualizado em: 2026-06-23 | Sessão 3

---

## VISÃO GERAL

ERP operacional completo para empresa de mudanças premium (Legacy Moving).
- **Frontend**: React + Vite → `http://localhost:5173`
- **Backend**: Flask + SQLAlchemy + SQLite → `http://localhost:5000` (local) / `http://192.168.0.12:5000` (rede)
- **Banco**: SQLite local (`backend/src/legacy_moving.db`)
- **Auth**: JWT (7 dias), roles: `admin | vendedor | comercial | operacional | financeiro`

---

## STACK TÉCNICA

```
frontend/src/
  pages/          → 23 páginas (uma por módulo)
  components/     → Layout, Sidebar, AssistenteMirante, Toast...
  hooks/          → useAuth, useGoogleCalendar, useActivityTracker
  lib/api.js      → cliente HTTP central (18 seções organizadas por domínio)
  services/       → googleCalendar.js

backend/src/
  main.py         → 130+ endpoints Flask (arquivo monolítico)
  database_real.py → 30+ modelos SQLAlchemy
  ai_service.py   → integração Claude/Anthropic
  google_calendar_service.py
  drive_hooks.py  → backup Google Drive
```

---

## FLUXO COMERCIAL COMPLETO

```
Lead → Orçamento (ORC-2026-XXX)
     → Cadastro Complementar
     → Contrato (CON-2026-XXX)
     → Ordem de Serviço (OS-2026-XXX)  [nasce preenchida]
         ├── Etapas Operacionais (embalagem / transporte / finalização)
         ├── OS ↔ Estoque (consumo automático + alertas)
         ├── Programação (Google Calendar sync)
         └── Fechamento Operacional (pré-calcula custos)
     → Recibo
     → Financeiro / Fechamento Mensal
```

---

## MÓDULOS IMPLEMENTADOS (todos do CLAUDE.md)

| Módulo | Página | Status |
|--------|--------|--------|
| Dashboard | /dashboard | ✅ Calendário + KPIs |
| Leads | /leads | ✅ CRUD + gráficos + arquivar/cancelar |
| Clientes | /clientes | ✅ Histórico completo (OS/ORC/contratos/recibos/avarias) |
| Organizers | /organizers | ✅ Dashboard + comissões + aba Indicações |
| Orçamentos | /orcamentos | ✅ ORC-YYYY-XXX separado de OS |
| Cadastro Complementar | /cadastro-complementar | ✅ |
| Contratos | /contratos | ✅ Gera OS automaticamente |
| Ordens de Serviço | /ordens-servico | ✅ + etapas + materiais + avaria prompt |
| Programação | /programacao | ✅ Google Calendar + WhatsApp + criado_por |
| Estoque | /estoque | ✅ OS↔Estoque consumo automático + alertas |
| Guarda-Móveis | /guarda-moveis | ✅ Conversão m²↔m³ automática |
| Recibos | /recibos | ✅ |
| Financeiro | /financeiro | ✅ Painel executivo completo |
| Fechamento Operacional | /fechamento-operacional | ✅ Pré-calcula custos |
| Fechamento Mensal | /fechamento-financeiro | ✅ Histórico sem sobrescrever |
| Metas / Gamificação | /metas | ✅ Ranking vendedores + organizers |
| Avarias | /avarias | ✅ CRUD + relatórios + prompt pós-OS |
| Controladoria | /controladoria | ✅ Atividade por usuário |
| Painel Executivo | /painel-executivo | ✅ |
| Configurações | /configuracoes | ✅ (bug permissoes.slice corrigido) |
| IA Mirante | (widget global) | ✅ Chat + navegação + consultor |
| Funcionários | /funcionarios | ✅ Banco de ajudantes |

---

## ARQUITETURA DE DADOS — MODELOS PRINCIPAIS

```python
User            → roles, permissoes (JSON), ativo
Lead            → organizer_id, vendedor_id, orcamento_id, status
Organizer       → nome, email, telefone, comissao_percentual
Orcamento       → numero ORC-YYYY-XXX, orig_*/dest_* (campos individuais)
CadastroComplementar → vinculado ao orcamento_id
Contrato        → numero CON-YYYY-XXX, orcamento_id, cliente_id
OrdemServico    → numero OS-YYYY-XXX, contrato_id, cliente_id
EtapaOperacional → os_id, data, equipe, veiculos, materiais
Estoque         → material_id, quantidade, estoque_minimo, estoque_critico
MovimentacaoEstoque → os_id, tipo (consumo/entrada/saida/devolucao)
FechamentoOperacional → os_id, custos detalhados, lucro, margem
Comissao        → organizer_id, os_id, valor (10% lucro líquido)
Avaria          → os_id, cliente_id, status, tipo, valor_estimado
UserActivityLog → user_id, page, action, session_id, timestamp
ConfigSistema   → chave/valor (JSON)
```

---

## CONVENÇÕES DE CÓDIGO

### Frontend
- **Cores**: Navy `#0D1B2A`, Cream `#F7F5F0`, Gold `#C8A55A`
- **useAuth()** retorna `{ user, token, loading, login, logout, isAuthenticated }`
- `user.role`, `user.id`, `user.name`
- **api.js**: helper `qs(params)` para query strings; 18 seções por domínio
- Permissões dos usuários: `parsePerms(p)` — normaliza null/string/array → array

### Backend
- `current_user()` → User pelo JWT identity
- `require_role(*roles)` decorator — 'vendedor' e 'comercial' são aliases
- `_os_dict(o)` → dict leve; `_os_dict_full(o)` → com equipe/veículo enriquecidos
- Endereços do Orcamento: campos individuais `orig_rua, orig_numero, orig_bairro, orig_cidade, orig_estado`
- Endereços do Contrato/OS: campo único `endereco_origem, endereco_destino`

---

## SEGURANÇA — REGRAS FIXAS

- API Key Anthropic: **somente em variável de ambiente** (`ANTHROPIC_API_KEY`)
- **Nunca** armazenar em código-fonte, logs ou expor para usuários
- JWT_SECRET_KEY: variável de ambiente obrigatória em produção

---

## O QUE FOI FEITO — SESSÃO 3 (2026-06-23)

### 1. Organizer → Aba Indicações
- **Backend**: `GET /api/organizers/<id>/leads`
  - Percorre Lead → Orcamento → Contrato → OS
  - Retorna status, valor, justificativa, dados da OS
- **Frontend**: modal agora tem 3 abas (Resumo / Indicações / Comissões)
  - Leads convertidos: botão link para `/ordens-servico?id=X`
  - Não-convertidos: valor do orçamento + bloco vermelho de justificativa
  - Filtros: todos / abertos / convertidos / cancelados / arquivados

### 2. Fix: Configurações página branca
- **Causa**: `u.permissoes.slice is not a function` — API retorna null/string
- **Fix**: `parsePerms()` em todos os mappers de usuário na página

### 3. Cleanup: api.js
- Removidas 8 definições duplicadas
- Removidos aliases mortos (`getFechamentoOS`, `updateFechamentoOS`)
- Helper `qs()` extraído
- 18 seções organizadas por domínio

---

## O QUE FOI FEITO — SESSÃO 2 (anterior)

1. **Programação**: `criado_por_id/nome` no model + endpoint DELETE com justificativa
   - Frontend: "Agendado por X" no card + permissões de edição/exclusão
2. **Fechamento Operacional**: pré-calcula custos automáticos da OS (equipe, veículos, materiais)
3. **OS ↔ Estoque**: consumo automático ao concluir OS + alertas de reposição

---

## PRÓXIMAS PRIORIDADES SUGERIDAS

Com base no CLAUDE.md e gaps identificados:

1. **Dashboard — calendário maior**: CLAUDE.md pede melhor visualização mensal
   - Considerar layout em tela cheia para o calendário
2. **Leads — relatório anual de conversão**: gráfico anual ainda não implementado
3. **Relatórios exportáveis**: PDF/Excel para Leads, Financeiro, Avarias
4. **Portal do Cliente** (`/acompanhar/:token`): página existe mas precisa revisar
5. **WhatsApp Business API**: atualmente monta mensagem mas não envia automaticamente
6. **Google Calendar**: configuração via UI em Configurações (já tem UI, falta testar fluxo)
7. **Estoque**: gráfico pizza (CLAUDE.md item 11 — "gráfico pizza de estoque")

---

## COMANDOS ÚTEIS

```bash
# Subir backend
cd C:\legacy-moving-system\backend
python src/main.py

# Subir frontend
cd C:\legacy-moving-system\frontend
npm run dev

# Commit rápido
C:\legacy-moving-system\git_commit.bat
```

---

## USUÁRIOS DE TESTE

| CPF | Senha | Role |
|-----|-------|------|
| (admin do sistema) | admin123 | admin |
| wevertondlima@gmail.com | (verificar) | vendedor |

> Consultar banco SQLite para CPFs: `SELECT cpf, name, role FROM users;`
