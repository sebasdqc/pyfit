FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Embeddings del Tutor de Academy: instala torch CPU-only ANTES de requirements
# para evitar que pip baje los wheels CUDA (~GB) al resolver sentence-transformers.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-descarga el modelo de embeddings dentro de la imagen para que el runtime NO
# dependa de la red (primer request rápido y sin fallos si HF no es alcanzable en
# prod). Debe coincidir con settings.TUTOR_EMBEDDING_MODEL.
ENV HF_HOME=/app/.hf_cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/.hf_cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"

COPY . .

# SECRET_KEY is required by Django settings even for collectstatic.
# We declare it as a build ARG so DO App Platform can inject it at build time.
# Falls back to a dummy value that is only valid during this build step.
ARG SECRET_KEY=build-time-placeholder-not-used-at-runtime
ARG DEBUG=False
RUN python manage.py collectstatic --noinput

RUN chmod +x entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]
