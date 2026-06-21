FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro (cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fonte
COPY src/ ./src/

# Variáveis de ambiente padrão
ENV PORT=8080
ENV FLASK_ENV=production
ENV FLASK_DEBUG=False

EXPOSE 8080

CMD ["python", "src/main.py"]
