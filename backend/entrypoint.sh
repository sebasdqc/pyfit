#!/bin/sh
set -e
# Aplica migraciones pendientes en el arranque. El app spec vivo en DO no tiene
# job de migración, así que este es el único punto donde el esquema se pone al
# día en prod. Es idempotente (no-op si ya está todo aplicado); si falla, el
# contenedor no arranca y DO mantiene el deploy anterior (no se sirve un esquema
# a medias).
python manage.py migrate --noinput
python manage.py seed_tests || echo "seed_tests falló (no crítico: el catálogo se sirve del REGISTRY)"
exec gunicorn pyfit.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
