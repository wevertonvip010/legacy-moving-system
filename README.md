# Legacy Moving — Sistema Operacional v1.0

Sistema de gestão para empresa de mudanças premium, guarda-móveis e logística especializada.

## Módulos ativos
- Dashboard executivo
- Clientes + CRM
- Canal de Personal Organizers
- Orçamentos
- Contratos
- Ordens de Serviço
- Programação de equipe
- Estoque de materiais
- Guarda-Móveis (20 boxes)
- Financeiro
- Fechamento mensal
- Metas

## Estrutura
```
legacy-moving/
├── backend/          Flask + SQLAlchemy + JWT
│   └── src/
│       ├── main.py           API principal
│       └── database_real.py  Modelos do banco
└── frontend/         React + Vite + Tailwind
    └── src/
        ├── pages/    Módulos do sistema
        └── components/
```

## Como rodar localmente

### Backend
```bash
cd backend
pip install -r requirements.txt
python src/main.py
```

### Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

### Login padrão
- CPF: 123.456.789-01
- Senha: Legacy@2025

## Deploy
- Backend: Railway
- Frontend: Vercel
