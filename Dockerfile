FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/src/ ./src/
ENV PORT=8080
ENV FLASK_ENV=production
ENV FLASK_DEBUG=False
EXPOSE 8080
CMD ["python", "src/main.py"]
