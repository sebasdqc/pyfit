// Aviso para quien aún no verificó su correo + diálogo para escribir el código
// de 6 dígitos. Usa los mismos endpoints que la app móvil
// (/api/auth/verify-email/ y /resend-verification/).
//
// Es un aviso, no un muro: nadie pierde acceso por no verificar. Se puede
// cerrar durante la sesión, y vuelve en la siguiente visita hasta verificar.

import { isAxiosError } from 'axios'
import { useEffect, useState, type FormEvent } from 'react'
import { resendVerificationCode, verifyEmailCode } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'
import { Icon } from '@/components/Icon'
import { Dialog } from '@/components/ui/Dialog'
import { useT } from '@/locale/useT'

const DISMISS_KEY = 'za-verify-email-dismissed'
const RESEND_COOLDOWN_S = 30

export function VerifyEmailBanner() {
  const t = useT()
  const { user } = useAuth()
  const [descartado, setDescartado] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
  })
  const [abierto, setAbierto] = useState(false)

  if (!user || user.email_verificado || descartado) return null

  function cerrar() {
    setDescartado(true)
    try { sessionStorage.setItem(DISMISS_KEY, '1') } catch { /* sin storage: solo esta vista */ }
  }

  return (
    <>
      <div role="region" aria-label={t('verifyEmail.bannerTitle')} className="mb-5 flex flex-col gap-3 rounded-2xl border border-warn/30 bg-warn/5 p-4 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warn/10 text-warn"><Icon name="mail" size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{t('verifyEmail.bannerTitle')}</p>
          <p className="mt-0.5 text-sm text-ink-soft">{t('verifyEmail.bannerBody', { email: user.email })}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => setAbierto(true)} className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-dark">
            {t('verifyEmail.bannerCta')}
          </button>
          <button onClick={cerrar} aria-label={t('verifyEmail.close')} className="text-ink-muted hover:text-ink"><Icon name="close" size={16} /></button>
        </div>
      </div>
      {abierto && <VerifyEmailDialog email={user.email} onClose={() => setAbierto(false)} />}
    </>
  )
}

function VerifyEmailDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const t = useT()
  const { refreshUser } = useAuth()
  const [code, setCode] = useState('')
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok'>('idle')
  const [mensaje, setMensaje] = useState<{ tono: 'ok' | 'error'; texto: string } | null>(null)
  const [espera, setEspera] = useState(0)

  useEffect(() => {
    if (espera <= 0) return
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  async function verificar(e: FormEvent) {
    e.preventDefault()
    if (code.length < 4) return
    setEstado('enviando')
    setMensaje(null)
    try {
      await verifyEmailCode(code)
      setEstado('ok')
      setMensaje({ tono: 'ok', texto: t('verifyEmail.success') })
      await refreshUser() // el banner desaparece solo al cambiar user.email_verificado
      setTimeout(onClose, 1200)
    } catch (err) {
      setEstado('idle')
      const status = isAxiosError(err) ? err.response?.status : undefined
      setMensaje({
        tono: 'error',
        texto: status === 429 ? t('verifyEmail.tooMany') : status === 400 ? t('verifyEmail.invalid') : t('verifyEmail.errorGeneric'),
      })
    }
  }

  async function reenviar() {
    setMensaje(null)
    try {
      await resendVerificationCode()
      setMensaje({ tono: 'ok', texto: t('verifyEmail.resent') })
      setEspera(RESEND_COOLDOWN_S)
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined
      setMensaje({ tono: 'error', texto: status === 429 ? t('verifyEmail.tooMany') : t('verifyEmail.errorGeneric') })
    }
  }

  return (
    <Dialog onClose={onClose} labelledBy="verify-email-title" className="za-card w-full max-w-md p-6">
      <form onSubmit={verificar} className="flex flex-col gap-4">
        <div>
          <h2 id="verify-email-title" className="text-lg font-bold text-ink">{t('verifyEmail.dialogTitle')}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t('verifyEmail.dialogBody', { email })}</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink-soft">
          {t('verifyEmail.codeLabel')}
          <input
            className="input h-12 text-center text-2xl font-semibold tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            data-autofocus
          />
        </label>
        {mensaje && (
          <p role={mensaje.tono === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${mensaje.tono === 'ok' ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger'}`}>
            {mensaje.texto}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={reenviar} disabled={espera > 0 || estado === 'ok'} className="text-sm font-semibold text-accent hover:text-accent-dark disabled:opacity-50">
            {t('verifyEmail.resend')}{espera > 0 ? ` (${espera})` : ''}
          </button>
          <button type="submit" disabled={code.length < 4 || estado !== 'idle'} className="h-10 rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50">
            {t('verifyEmail.submit')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
