FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["python", "-m", "gunicorn", "pyfit.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
