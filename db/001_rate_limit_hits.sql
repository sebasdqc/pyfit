-- Almacén del rate limit de la landing (ver `app/lib/rateLimit.ts`).
--
-- No hace falta correrlo a mano: `consumeRateLimit` crea la tabla sola si
-- recibe un 42P01 (relación inexistente) y reintenta. Queda acá para que el
-- esquema esté versionado y se pueda aplicar de antemano en una base nueva.
--
-- Aplicado en la base de Producción el 2026-07-31.

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  bucket text NOT NULL,
  hit_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_bucket_hit_at_idx
  ON rate_limit_hits (bucket, hit_at);
