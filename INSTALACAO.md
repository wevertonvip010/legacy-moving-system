# Guia de Instalação Rápida - VIP Mudanças

## 🚀 Instalação em 5 Minutos

### 1. Pré-requisitos
- Node.js 18+ ([Download](https://nodejs.org/))
- Python 3.11+ ([Download](https://python.org/))
- MongoDB ([Instruções abaixo](#mongodb))

### 2. Extrair e Configurar
```bash
# Extrair o ZIP
unzip vip-mudancas-sistema-completo.zip
cd vip-mudancas

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
cp .env.example .env

# Frontend
cd ../frontend
npm install  # ou pnpm install
```

### 3. MongoDB

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Windows:**
- Baixar do [site oficial](https://www.mongodb.com/try/download/community)
- Instalar e iniciar o serviço

### 4. Executar

**Terminal 1 (Backend):**
```bash
cd backend
source venv/bin/activate
python src/main.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### 5. Acessar
- Abrir: http://localhost:5173
- Login: `admin@vipmudancas.com.br` / `vip123456`

## ⚙️ Configurações Opcionais

### APIs Externas (Opcional)
Edite `backend/.env` para habilitar integrações:

```env
OPENAI_API_KEY=sua_chave_openai
AUTHENTIC_API_TOKEN=sua_chave_whatsapp
GOOGLE_CALENDAR_TOKEN=sua_chave_google
CORA_API_TOKEN=sua_chave_cora
```

### Produção
```bash
# Build do frontend
cd frontend
npm run build

# Copiar para backend
cp -r dist/* ../backend/src/static/

# Executar em produção
cd ../backend
python src/main.py
```

## 🆘 Problemas?

1. **MongoDB não conecta:** `sudo systemctl restart mongod`
2. **Porta ocupada:** Altere as portas em `vite.config.js` e `main.py`
3. **Dependências:** Delete `node_modules` e reinstale

## 📞 Suporte
- Email: vip@vipmudancas.com.br
- Documentação completa: `README.md`

