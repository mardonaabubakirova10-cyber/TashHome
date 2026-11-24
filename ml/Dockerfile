FROM python:3.15-slim
WORKDIR /app
# libgomp нужен LightGBM
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements-service.txt .
RUN pip install --no-cache-dir -r requirements-service.txt
COPY features.py service.py ./
COPY model ./model
ENV PORT=8001
EXPOSE 8001
CMD ["sh", "-c", "uvicorn service:app --host 0.0.0.0 --port ${PORT}"]
