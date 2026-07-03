#!/bin/sh
set -e
# Aplica migraciones pendientes en el arranque. El app spec vivo en DO no tiene
# job de migración, así que este es el único punto donde el esquema se pone al
# día en prod. Es idempotente (no-op si ya está todo aplicado); si falla, el
# contenedor no arranca y DO mantiene el deploy anterior (no se sirve un esquema
# a medias).
python manage.py migrate --noinput
python manage.py seed_tests || echo "seed_tests falló (no crítico: el catálogo se sirve del REGISTRY)"
# index_tutor_content (RAG del Tutor de Academy) NO corre acá — es MANUAL desde
# la consola de DO, igual que seed_academy_badges/seed_zyfit_escuelas/
# seed_course_content. Cargar el modelo de embeddings (~500MB) pesa demasiado
# para basic-xxs: corriendo en foreground bloqueaba el health check (mataba el
# contenedor antes de que gunicorn levantara); corriendo en background competía
# por RAM con gunicorn y causaba OOM kills intermitentes. El tutor tolera no
# tener índice fresco (cae a recuperación por palabras), así que no hay razón
# para correrlo en cada arranque — solo cuando cambia contenido de cursos.
exec gunicorn pyfit.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
