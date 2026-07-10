// Onboarding inicial de Zyfit Academy — wizard de 4 pasos que aparece una sola
// vez, justo después del primer login/registro (ver LoginPage/RegisterPage),
// hasta que el usuario lo completa o lo salta (Profile.onboarding_academia_completo,
// ver backend/academy/views.py::academy_me). Guarda de forma progresiva: cada
// "Siguiente" hace PATCH solo de los campos del paso actual, así que si el
// usuario abandona a mitad de camino, la próxima vez retoma con lo ya guardado
// (los campos llegan prellenados desde `user`).

import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSchools } from '@/api/academy'
import { updateMe } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'
import { BrandLockup } from '@/components/Emblem'
import { Icon, type IconName } from '@/components/Icon'
import { RedesSocialesFields } from '@/components/profile/RedesSocialesFields'
import { TagInput } from '@/components/ui/TagInput'
import { COUNTRIES } from '@/lib/countries'
import { useT } from '@/locale/useT'
import type { School } from '@/types'

const HOY = new Date().toISOString().slice(0, 10)
const TOTAL_PASOS = 4

const PERFIL_DEPORTIVO_ICONS: Record<'atleta' | 'profesional' | 'entusiasta', IconName> = {
  atleta: 'activity',
  profesional: 'star',
  entusiasta: 'heart',
}
const PERFIL_DEPORTIVO_VALUES = ['atleta', 'profesional', 'entusiasta'] as const

const MODALIDAD_ICONS: Record<'virtual' | 'presencial' | 'mixta', IconName> = {
  virtual: 'play',
  presencial: 'users',
  mixta: 'layers',
}
const MODALIDAD_VALUES = ['virtual', 'presencial', 'mixta'] as const

const DISPONIBILIDAD_VALUES = ['manana', 'tarde', 'noche', 'fin_semana', 'flexible'] as const

export function OnboardingPage() {
  const t = useT()
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schools, setSchools] = useState<School[] | null>(null)

  // Paso 1 — sobre ti
  const [nombre, setNombre] = useState(user?.nombre ?? '')
  const [pais, setPais] = useState(user?.pais ?? '')
  const [ciudad, setCiudad] = useState(user?.ciudad ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(user?.fecha_nacimiento ?? '')
  const [profesion, setProfesion] = useState(user?.profesion ?? '')

  // Paso 2 — perfil deportivo
  const [perfilDeportivo, setPerfilDeportivo] = useState(user?.perfil_deportivo ?? '')
  const [aniosExperiencia, setAniosExperiencia] = useState(
    user?.anios_experiencia_deporte != null ? String(user.anios_experiencia_deporte) : '',
  )

  // Paso 3 — preferencias de aprendizaje
  const [escuelasInteres, setEscuelasInteres] = useState<number[]>(user?.escuelas_interes ?? [])
  const [modalidad, setModalidad] = useState(user?.modalidad_preferida ?? '')
  const [disponibilidad, setDisponibilidad] = useState<string>(user?.disponibilidad_estudio ?? '')

  // Paso 4 — intereses y redes (opcional)
  const [intereses, setIntereses] = useState<string[]>(user?.intereses ?? [])
  const [redes, setRedes] = useState<Record<string, string>>(user?.redes_sociales ?? {})

  useEffect(() => {
    let active = true
    listSchools()
      .then((s) => active && setSchools(s))
      .catch(() => active && setSchools([]))
    return () => {
      active = false
    }
  }, [])

  if (!user) return null

  const perfilesDeportivos = PERFIL_DEPORTIVO_VALUES.map((value) => ({
    value,
    icon: PERFIL_DEPORTIVO_ICONS[value],
    label: t(`onboarding.profile.${value}`),
    description: t(`onboarding.profileDescription.${value}`),
  }))
  const modalidades = MODALIDAD_VALUES.map((value) => ({
    value,
    icon: MODALIDAD_ICONS[value],
    label: t(`onboarding.modality.${value}`),
  }))
  const disponibilidades = DISPONIBILIDAD_VALUES.map((value) => ({
    value,
    label: t(`onboarding.availability.${value}`),
  }))

  function toggleEscuela(id: number) {
    setEscuelasInteres((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function finalizarOnboarding() {
    await updateMe({ intereses, redes_sociales: redes, onboarding_academia_completo: true })
    await refreshUser()
    navigate('/inicio', { replace: true })
  }

  async function guardarPasoYAvanzar() {
    setError(null)
    if (paso === 1 && nombre.trim() === '') {
      setError(t('onboarding.nameRequiredError'))
      return
    }
    setSaving(true)
    try {
      if (paso === 1) {
        await updateMe({
          nombre: nombre.trim(),
          pais,
          ciudad,
          fecha_nacimiento: fechaNacimiento || null,
          profesion,
        })
      } else if (paso === 2) {
        await updateMe({
          perfil_deportivo: perfilDeportivo,
          anios_experiencia_deporte: aniosExperiencia === '' ? null : Number(aniosExperiencia),
        })
      } else if (paso === 3) {
        await updateMe({
          escuelas_interes: escuelasInteres,
          modalidad_preferida: modalidad,
          disponibilidad_estudio: disponibilidad,
        })
      } else {
        await finalizarOnboarding()
        return
      }
      setPaso((p) => p + 1)
    } catch {
      setError(t('onboarding.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function saltarOnboarding() {
    setSaving(true)
    setError(null)
    try {
      await updateMe({ onboarding_academia_completo: true })
      await refreshUser()
      navigate('/inicio', { replace: true })
    } catch {
      setError(t('onboarding.skipError'))
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-surface-soft">
      <header className="flex items-center justify-between border-b border-surface-border bg-surface px-6 py-4 sm:px-10">
        <BrandLockup size={28} />
        <button
          type="button"
          onClick={saltarOnboarding}
          disabled={saving}
          className="text-sm font-medium text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          {t('onboarding.skip')}
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-xl">
          {/* Progreso */}
          <div className="mb-8">
            <p className="za-eyebrow">{t('onboarding.stepOf', { step: paso, total: TOTAL_PASOS })}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(paso / TOTAL_PASOS) * 100}%` }}
              />
            </div>
          </div>

          {paso === 1 && (
            <Paso titulo={t('onboarding.step1Title')} subtitulo={t('onboarding.step1Subtitle')}>
              <Campo label={t('onboarding.nameLabel')}>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" className="input" />
              </Campo>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label={t('onboarding.birthDateLabel')}>
                  <input
                    type="date"
                    value={fechaNacimiento ?? ''}
                    max={HOY}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="input"
                  />
                </Campo>
                <Campo label={t('onboarding.professionLabel')}>
                  <input
                    value={profesion}
                    placeholder={t('onboarding.professionPlaceholder')}
                    onChange={(e) => setProfesion(e.target.value)}
                    className="input"
                  />
                </Campo>
                <Campo label={t('onboarding.countryLabel')}>
                  <select value={pais} onChange={(e) => setPais(e.target.value)} className="input">
                    <option value="">{t('onboarding.countryPlaceholder')}</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label={t('onboarding.cityLabel')}>
                  <input
                    value={ciudad}
                    placeholder={t('onboarding.cityPlaceholder')}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="input"
                  />
                </Campo>
              </div>
            </Paso>
          )}

          {paso === 2 && (
            <Paso titulo={t('onboarding.step2Title')} subtitulo={t('onboarding.step2Subtitle')}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {perfilesDeportivos.map((p) => (
                  <OpcionCard
                    key={p.value}
                    active={perfilDeportivo === p.value}
                    onClick={() => setPerfilDeportivo(p.value)}
                    icon={p.icon}
                    label={p.label}
                    description={p.description}
                  />
                ))}
              </div>
              <Campo label={t('onboarding.yearsLabel')}>
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={aniosExperiencia}
                  onChange={(e) => setAniosExperiencia(e.target.value)}
                  placeholder={t('onboarding.yearsPlaceholder')}
                  className="input"
                />
              </Campo>
            </Paso>
          )}

          {paso === 3 && (
            <Paso titulo={t('onboarding.step3Title')} subtitulo={t('onboarding.step3Subtitle')}>
              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('onboarding.schoolsLabel')}
                </span>
                {schools === null ? (
                  <p className="text-sm text-ink-muted">{t('onboarding.schoolsLoading')}</p>
                ) : schools.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t('onboarding.schoolsEmpty')}</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {schools.map((s) => {
                      const checked = escuelasInteres.includes(s.id)
                      return (
                        <label
                          key={s.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                            checked ? 'border-accent bg-accent/5 text-ink' : 'border-surface-border text-ink-soft hover:bg-surface-soft'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEscuela(s.id)}
                            className="h-4 w-4 accent-accent"
                          />
                          {s.nombre}
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('onboarding.modalityLabel')}
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {modalidades.map((m) => (
                    <OpcionCard
                      key={m.value}
                      active={modalidad === m.value}
                      onClick={() => setModalidad(m.value)}
                      icon={m.icon}
                      label={m.label}
                    />
                  ))}
                </div>
              </div>
              <Campo label={t('onboarding.availabilityLabel')}>
                <select value={disponibilidad} onChange={(e) => setDisponibilidad(e.target.value)} className="input">
                  <option value="">{t('onboarding.availabilityPlaceholder')}</option>
                  {disponibilidades.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Campo>
            </Paso>
          )}

          {paso === 4 && (
            <Paso titulo={t('onboarding.step4Title')} subtitulo={t('onboarding.step4Subtitle')}>
              <Campo label={t('onboarding.interestsLabel')}>
                <TagInput value={intereses} onChange={setIntereses} placeholder={t('onboarding.interestsPlaceholder')} />
              </Campo>
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {t('onboarding.socialLabel')}
                </span>
                <RedesSocialesFields value={redes} onChange={setRedes} />
              </div>
            </Paso>
          )}

          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center gap-3">
            {paso > 1 && (
              <button
                type="button"
                onClick={() => setPaso((p) => p - 1)}
                disabled={saving}
                className="h-12 rounded-xl border border-surface-border px-5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface disabled:opacity-50"
              >
                {t('onboarding.back')}
              </button>
            )}
            <button
              type="button"
              onClick={guardarPasoYAvanzar}
              disabled={saving}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 sm:flex-none sm:px-8"
            >
              {saving ? t('onboarding.saving') : paso === TOTAL_PASOS ? t('onboarding.finish') : t('onboarding.next')}
              {!saving && <Icon name="arrowRight" size={17} />}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function Paso({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: ReactNode }) {
  return (
    <div className="za-card flex flex-col gap-5 p-6 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{titulo}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">{subtitulo}</p>
      </div>
      {children}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
      {children}
    </label>
  )
}

function OpcionCard({
  active,
  onClick,
  icon,
  label,
  description,
}: {
  active: boolean
  onClick: () => void
  icon: IconName
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors ${
        active ? 'border-accent bg-accent/5' : 'border-surface-border hover:bg-surface-soft'
      }`}
    >
      <Icon name={icon} size={20} className={active ? 'text-accent' : 'text-ink-muted'} />
      <span className={`text-sm font-semibold ${active ? 'text-accent' : 'text-ink'}`}>{label}</span>
      {description && <span className="text-xs text-ink-muted">{description}</span>}
    </button>
  )
}
