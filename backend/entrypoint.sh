#!/bin/sh
set -e
# Aplica migraciones pendientes en el arranque. El app spec vivo en DO no tiene
# job de migración, así que este es el único punto donde el esquema se pone al
# día en prod. Es idempotente (no-op si ya está todo aplicado); si falla, el
# contenedor no arranca y DO mantiene el deploy anterior (no se sirve un esquema
# a medias).
python manage.py migrate --noinput
python manage.py seed_tests || echo "seed_tests falló (no crítico: el catálogo se sirve del REGISTRY)"
# Indexa el contenido de los cursos para el RAG del Tutor de Academy. Idempotente
# (solo re-embebe lo que cambió) y no crítico: si falla, el tutor cae a recuperación
# por palabras. Requiere que el contenido esté sembrado (seed_course_content).
python manage.py index_tutor_content || echo "index_tutor_content falló (no crítico: el tutor usará recuperación por palabras)"
exec gunicorn pyfit.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
