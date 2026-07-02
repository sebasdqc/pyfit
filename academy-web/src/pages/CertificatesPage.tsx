// Certificados. Lista los certificados obtenidos (derivados de las matrículas
// completadas con código) e incluye un verificador por código (GET
// /api/academy/certificates/verify/<codigo>/). El diseño del diploma se
// profundizará en próximas iteraciones (hoy: tarjeta referencial).

import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { listMyEnrollments, verifyCertificate } from '@/api/academy'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Emblem } from '@/components/Emblem'
import { Icon } from '@/components/Icon'
import { BRAND } from '@/lib/constants'
import type { Certificate, Enrollment } from '@/types'

export function CertificatesPage() {
  const [items, setItems] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listMyEnrollments()
      .then((d) => active && setItems(d.filter((e) => e.certificado)))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="za-eyebrow">Certificados</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Tus logros</h1>
      </header>

      <Verifier />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={40} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="certificate"
          title="Aún no tienes certificados"
          description="Completa un curso y aprueba sus evaluaciones para obtener tu certificado."
          action={
            <Link to="/catalogo" className="text-sm font-medium text-accent hover:text-accent-dark">
              Explorar cursos →
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((e) => (
            <DiplomaCard key={e.id} titulo={e.curso_titulo} nombre={e.estudiante_nombre} codigo={e.certificado!} />
          ))}
        </div>
      )}
    </div>
  )
}

function DiplomaCard({ titulo, nombre, codigo }: { titulo: string; nombre: string; codigo: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-brand/15">
      {/* Orla doble decorativa */}
      <div className="pointer-events-none absolute inset-2.5 rounded-xl border border-brand/20" />
      <div className="pointer-events-none absolute inset-[13px] rounded-lg border border-brand/10" />
      {/* Sello de fondo muy tenue */}
      <div className="pointer-events-none absolute -right-8 -bottom-10 opacity-[0.05]">
        <Emblem size={220} tone="light" />
      </div>

      <div className="relative z-10 px-7 py-7">
        <div className="flex items-center justify-between">
          <Emblem size={30} tone="light" />
          <span className="za-eyebrow">Certificado de finalización</span>
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">Se certifica que</p>
          <p className="mt-1.5 text-xl font-bold tracking-tight text-ink">{nombre}</p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-ink-muted">completó satisfactoriamente</p>
          <p className="mt-1.5 text-[15px] font-semibold text-brand">{titulo}</p>
          {/* Filete central con sello */}
          <div className="mx-auto mt-4 flex items-center justify-center gap-2 text-brand/40">
            <span className="h-px w-10 bg-current" />
            <Icon name="certificate" size={15} />
            <span className="h-px w-10 bg-current" />
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-ink-muted">Código de verificación</p>
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-xs font-medium text-ink">{codigo}</span>
              <CopyCodeButton codigo={codigo} />
            </div>
          </div>
          <span className="shrink-0 text-right text-xs font-semibold italic text-brand">
            {BRAND.name} {BRAND.product}
          </span>
        </div>
      </div>
    </div>
  )
}

function CopyCodeButton({ codigo }: { codigo: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copiar código ${codigo}`}
      className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent transition-colors hover:bg-accent/10"
    >
      {copied ? 'Copiado ✓' : 'Copiar'}
    </button>
  )
}

function Verifier() {
  const [codigo, setCodigo] = useState('')
  const [result, setResult] = useState<Certificate | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'notfound' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!codigo.trim()) return
    setStatus('loading')
    setResult(null)
    try {
      const cert = await verifyCertificate(codigo.trim())
      setResult(cert)
      setStatus('idle')
    } catch (err) {
      // 404 → el código no existe; cualquier otro fallo (red/servidor) → error.
      const code = (err as { response?: { status?: number } })?.response?.status
      setStatus(code === 404 ? 'notfound' : 'error')
    }
  }

  return (
    <div className="za-card p-5">
      <h2 className="text-sm font-semibold text-ink">Verificar un certificado</h2>
      <p className="mt-1 text-sm text-ink-soft">Introduce un código para comprobar su validez.</p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="ZA-XXXXXXXX"
          aria-label="Código de certificado"
          className="h-11 flex-1 rounded-xl border border-surface-border bg-surface-soft px-4 font-mono text-sm uppercase text-ink focus:border-accent focus:bg-white"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          <Icon name="search" size={16} /> Verificar
        </button>
      </form>
      <div aria-live="polite">
        {status === 'loading' && <p className="mt-3 text-sm text-ink-muted">Verificando…</p>}
        {status === 'notfound' && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-danger">
            <Icon name="close" size={15} /> No se encontró un certificado con ese código.
          </p>
        )}
        {status === 'error' && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-danger">
            <Icon name="close" size={15} /> No se pudo verificar ahora. Revisa tu conexión e inténtalo de nuevo.
          </p>
        )}
        {result && (
          <div className="mt-3 rounded-xl border border-ok/30 bg-ok/5 p-4">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ok">
              <Icon name="check" size={16} /> Certificado válido
            </p>
            <p className="mt-1 text-sm text-ink">
              <span className="font-medium">{result.estudiante_nombre}</span> · {result.curso_titulo}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
