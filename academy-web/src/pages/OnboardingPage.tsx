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
import type { School } from '@/types'

const HOY = new Date().toISOString().slice(0, 10)
const TOTAL_PASOS = 4

const PERFILES_DEPORTIVOS: {
  value: 'atleta' | 'profesional' | 'entusiasta'
  label: string
  icon: IconName
  description: string
}[] = [
  { value: 'atleta', label: 'Atleta', icon: 'activity', description: 'Compito o entreno de forma federada.' },
  { value: 'profesional', label: 'Profesional del deporte', icon: 'star', description: 'Entrenador, preparador físico, kinesiólogo…' },
  { value: 'entusiasta', label: 'Entusiasta', icon: 'heart', description: 'Me apasiona el deporte y quiero aprender más.' },
]

const MODALIDADES: { value: 'virtual' | 'presencial' | 'mixta'; label: string; icon: IconName }[] = [
  { value: 'virtual', label: 'Virtual', icon: 'play' },
  { value: 'presencial', label: 'Presencial', icon: 'users' },
  { value: 'mixta', label: 'Mixta', icon: 'layers' },
]

const DISPONIBILIDADES: { value: string; label: string }[] = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noche', label: 'Noche' },
  { value: 'fin_semana', label: 'Fin de semana' },
  { value: 'flexible', label: 'Flexible' },
]

export function OnboardingPage() {
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
      setError('Ingresa tu nombre para continuar.')
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
      setError('No se pudo guardar. Intenta de nuevo.')
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
      setError('No se pudo continuar. Intenta de nuevo.')
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
          Saltar por ahora
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-10 sm:px-10">
        <div className="w-full max-w-xl">
          {/* Progreso */}
          <div className="mb-8">
            <p className="za-eyebrow">
              Paso {paso} de {TOTAL_PASOS}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${(paso / TOTAL_PASOS) * 100}%` }}
              />
            </div>
          </div>

          {paso === 1 && (
            <Paso titulo="Cuéntanos sobre ti" subtitulo="Así personalizamos tu experiencia en la academia.">
              <Campo label="Nombre visible">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" className="input" />
              </Campo>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Fecha de nacimiento">
                  <input
                    type="date"
                    value={fechaNacimiento ?? ''}
                    max={HOY}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="input"
                  />
                </Campo>
                <Campo label="Profesión">
                  <input
                    value={profesion}
                    placeholder="Ej. Preparador físico"
                    onChange={(e) => setProfesion(e.target.value)}
                    className="input"
                  />
                </Campo>
                <Campo label="País">
                  <select value={pais} onChange={(e) => setPais(e.target.value)} className="input">
                    <option value="">Selecciona un país</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Ciudad">
                  <input
                    value={ciudad}
                    placeholder="Ej. Asunción"
                    onChange={(e) => setCiudad(e.target.value)}
                    className="input"
                  />
                </Campo>
              </div>
            </Paso>
          )}

          {paso === 2 && (
            <Paso titulo="Tu perfil deportivo" subtitulo="¿Cómo te describirías dentro del deporte?">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PERFILES_DEPORTIVOS.map((p) => (
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
              <Campo label="¿Cuántos años llevas en el deporte?">
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={aniosExperiencia}
                  onChange={(e) => setAniosExperiencia(e.target.value)}
                  placeholder="Ej. 5"
                  className="input"
                />
              </Campo>
            </Paso>
          )}

          {paso === 3 && (
            <Paso titulo="Preferencias de aprendizaje" subtitulo="Para recomendarte los cursos más relevantes.">
              <div>
                <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Escuelas de interés
                </span>
                {schools === null ? (
                  <p className="text-sm text-ink-muted">Cargando escuelas…</p>
                ) : schools.length === 0 ? (
                  <p className="text-sm text-ink-muted">Aún no hay escuelas disponibles.</p>
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
                  Modalidad preferida
                </span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {MODALIDADES.map((m) => (
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
              <Campo label="Disponibilidad para estudiar">
                <select value={disponibilidad} onChange={(e) => setDisponibilidad(e.target.value)} className="input">
                  <option value="">Selecciona una opción</option>
                  {DISPONIBILIDADES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Campo>
            </Paso>
          )}

          {paso === 4 && (
            <Paso titulo="Intereses y redes" subtitulo="Opcional — puedes completarlo después desde tu perfil.">
              <Campo label="Intereses">
                <TagInput value={intereses} onChange={setIntereses} placeholder="Ej. Fútbol, nutrición… (Enter para añadir)" />
              </Campo>
              <div>
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Redes sociales
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
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={guardarPasoYAvanzar}
              disabled={saving}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60 sm:flex-none sm:px-8"
            >
              {saving ? 'Guardando…' : paso === TOTAL_PASOS ? 'Finalizar' : 'Siguiente'}
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
