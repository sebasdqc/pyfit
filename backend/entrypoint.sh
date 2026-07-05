#!/bin/sh
set -e

# Redis LOCAL (dentro de este mismo contenedor) como broker de Celery: evita
# el costo de un Redis gestionado de DO mientras no haya presupuesto para eso.
# Sin persistencia (--save "" --appendonly no) — es solo cola de tasks
# fire-and-forget (generate_session_task, flush_expired_tokens,
# purge_old_gps_points, sync_garmin_all, ninguno con reintentos configurados),
# perder la cola en un restart del contenedor (deploy, mantenimiento de DO) es
# aceptable. Si en el futuro se activa un Redis gestionado, alcanza con
# declarar REDIS_URL como env var — settings.py ya prioriza esa por sobre el
# default local (ver CELERY_BROKER_URL en pyfit/settings.py) y esto deja de
# arrancar solo con no volver a levantar redis-server acá.
redis-server --daemonize yes --bind 127.0.0.1 --port 6379 --save "" --appendonly no
until redis-cli -h 127.0.0.1 ping > /dev/null 2>&1; do
  sleep 0.2
done

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

# Worker de Celery (+ beat embebido, -B) en background, en el mismo contenedor
# que gunicorn: procesa generate_session_task y los tasks periódicos sin
# necesitar un componente ni un Redis gestionado aparte. --concurrency=2 para
# no competir demasiado por RAM con gunicorn en basic-xxs; si aparecen OOM
# kills, lo primero a revisar es bajar esto a 1 o subir el instance_size_slug.
celery -A pyfit worker -B --loglevel=info --concurrency=2 &

exec gunicorn pyfit.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -
