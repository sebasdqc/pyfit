FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
