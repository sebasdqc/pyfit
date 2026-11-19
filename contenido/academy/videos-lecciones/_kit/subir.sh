#!/bin/sh
# Crea (una sola vez) la llave de Spaces en ~/.zyfit-spaces-key.json y sube los renders del curso.
# Uso: sh contenido/academy/videos-lecciones/_kit/subir.sh fundamentos-de-periodizacion
set -e
KIT=$(cd "$(dirname "$0")" && pwd)
KEYFILE="$HOME/.zyfit-spaces-key.json"
if [ ! -s "$KEYFILE" ]; then
  doctl spaces keys create zyfit-academy-media-upload --grants 'bucket=;permission=fullaccess' -o json > "$KEYFILE"
  chmod 600 "$KEYFILE"
fi
PY=${PY:-python3}
$PY -c "import boto3" 2>/dev/null || { echo "Falta boto3: pip install boto3"; exit 1; }
export SPACES_KEY=$($PY -c "import json;d=json.load(open('$KEYFILE'));d=d[0] if isinstance(d,list) else d;print(d['access_key'])")
export SPACES_SECRET=$($PY -c "import json;d=json.load(open('$KEYFILE'));d=d[0] if isinstance(d,list) else d;print(d['secret_key'])")
cd "$KIT/.." && $PY "$KIT/subir_a_spaces.py" "$1"
# CDN del bucket (gratis con Spaces). Si ya existe, no hace nada.
ORIGIN="zyfit-academy-media.sfo3.digitaloceanspaces.com"
doctl compute cdn list --format Origin --no-header | grep -qx "$ORIGIN" || doctl compute cdn create "$ORIGIN" --ttl 3600
echo "Listo."
