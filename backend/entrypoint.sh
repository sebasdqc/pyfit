#!/bin/sh
set -e
python manage.py migrate --noinput
python manage.py seed_tests || echo "seed_tests falló (no crítico: el catálogo se sirve del REGISTRY)"
python manage.py collectstatic --noinput
exec gunicorn pyfit.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
