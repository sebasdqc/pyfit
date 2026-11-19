"""Sube los renders de un curso a DigitalOcean Spaces y deja el bucket listo para Academy.

- Crea el bucket si no existe (privado por defecto; cada archivo se sube con ACL public-read).
- Configura CORS para que el navegador acepte la pista .vtt desde otro dominio
  (el <video crossOrigin="anonymous"> del reproductor lo exige).
- Sube cada .mp4/.mp3/.vtt de `renders/` con su Content-Type y caché larga.
- Imprime las URLs públicas (CDN) por lección.

Credenciales por entorno, NUNCA en el repo:
  SPACES_KEY, SPACES_SECRET           (llave de `doctl spaces keys create`)
  SPACES_BUCKET=zyfit-academy-media   SPACES_REGION=sfo3

Uso:
  python subir_a_spaces.py fundamentos-de-periodizacion   (desde videos-lecciones/)
"""
import mimetypes
import os
import sys
from pathlib import Path

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.config import Config

ROOT = Path(__file__).resolve().parent.parent
CT = {".mp4": "video/mp4", ".mp3": "audio/mpeg", ".vtt": "text/vtt; charset=utf-8"}
CORS = {
    "CORSRules": [{
        "AllowedOrigins": [
            "https://zyfit-academy-e8r4w.ondigitalocean.app",
            "http://localhost:5181",
        ],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 86400,
    }]
}


def main():
    curso = sys.argv[1]
    bucket = os.environ.get("SPACES_BUCKET", "zyfit-academy-media")
    region = os.environ.get("SPACES_REGION", "sfo3")
    s3 = boto3.client(
        "s3", region_name=region, endpoint_url=f"https://{region}.digitaloceanspaces.com",
        aws_access_key_id=os.environ["SPACES_KEY"], aws_secret_access_key=os.environ["SPACES_SECRET"],
        config=Config(retries={"max_attempts": 10, "mode": "adaptive"}, connect_timeout=30, read_timeout=120),
    )
    existing = {b["Name"] for b in s3.list_buckets().get("Buckets", [])}
    if bucket not in existing:
        s3.create_bucket(Bucket=bucket)
        print("bucket creado:", bucket)
    s3.put_bucket_cors(Bucket=bucket, CORSConfiguration=CORS)

    cdn = f"https://{bucket}.{region}.cdn.digitaloceanspaces.com"
    files = sorted(p for p in ROOT.glob(f"{curso}-m*-l*/**/renders/*") if p.suffix in CT)
    remote = {o["Key"]: o["Size"] for o in s3.list_objects_v2(Bucket=bucket, Prefix=f"academy/{curso}/").get("Contents", [])}
    chunks = TransferConfig(multipart_threshold=8 * 1024 * 1024, multipart_chunksize=4 * 1024 * 1024, max_concurrency=2)
    for p in files:
        key = f"academy/{curso}/{p.name}"
        if remote.get(key) == p.stat().st_size:
            print("ya estaba:", key)
            continue
        s3.upload_file(str(p), bucket, key, ExtraArgs={
            "ACL": "public-read",
            "ContentType": CT.get(p.suffix) or mimetypes.guess_type(p.name)[0],
            "CacheControl": "public, max-age=86400",
        }, Config=chunks)
        print(f"{p.relative_to(ROOT)} -> {cdn}/{key}")


if __name__ == "__main__":
    main()
