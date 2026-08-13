// Wizard de bienvenida del primer inicio de sesión de Zyfit Performance.
//
// Continuidad visual con el login: misma fotografía de fondo, misma capa de
// oscurecimiento y el mismo acento verde azulado — entrar al panel se lee como
// una sola secuencia y no como dos productos distintos pegados.
//
// Composición: riel de pasos a la izquierda (en escritorio) y una sola
// pregunta por pantalla a la derecha. Una pregunta a la vez es lo que sostiene
// que el flujo sea obligatorio: se ve que es corto y no hay un formulario
// largo que asuste de entrada.
//
// El guardado es progresivo — cada "Continuar" manda su propio PATCH. Si el
// navegador se cierra a mitad del wizard, al volver se retoma donde estaba.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { useT } from '@/locale/useT'
import { LocaleToggle } from '@/components/ui/LocaleToggle'
import { Spinner } from '@/components/ui/Spinner'
import { CountryCombobox } from '@/components/onboarding/CountryCombobox'
import { StepRail, type PasoRiel } from '@/components/onboarding/StepRail'
import {
  CampoOtro,
  CheckboxGrid,
  RadioGrid,
  type Opcion,
} from '@/components/onboarding/OptionGrid'
import { slugify } from '@/components/CreateCenterModal'
import { createCenter } from '@/api/performance'
import { fetchOnboarding, saveOnboarding } from '@/api/onboarding'
import type {
  CanalId,
  CargoId,
  DisciplinaId,
  NecesidadId,
  OnboardingPatch,
  OnboardingState,
  TamanoPlantelId,
} from '@/types'

// Mismos assets que el login (servidos desde performance-web/public/).
const BG_IMAGE = '/FVF.jpg'
const LOGO_IMAGE = '/Logo-Zyfit-Blanco.png'

// Catálogos: espejan performance/models.py. El orden acá es el orden en que se
// muestran — los cargos más frecuentes primero, "Otro" siempre al final.
const CARGOS: CargoId[] = [
  'preparador_fisico', 'entrenador', 'analista', 'coordinador',
  'director_deportivo', 'dueno', 'fisioterapeuta', 'medico',
  'nutricionista', 'psicologo', 'atleta', 'otro',
]
const DISCIPLINAS: DisciplinaId[] = [
  'futbol', 'futsal', 'basquet', 'voley', 'handball', 'rugby',
  'atletismo', 'natacion', 'ciclismo', 'tenis', 'combate', 'multideporte', 'otro',
]
const TAMANOS: TamanoPlantelId[] = ['solo_1', '2_15', '16_30', '31_60', '61_mas']
const NECESIDADES: NecesidadId[] = [
  'rendimiento', 'lesiones', 'tests', 'carga', 'planificacion',
  'gps', 'psicologico', 'calendario', 'reportes', 'asesor_ia',
]
const CANALES: CanalId[] = [
  'recomendacion', 'equipo_zyfit', 'redes', 'buscador', 'evento',
  'academy', 'prensa', 'otro',
]

type PasoId = 'pais' | 'cargo' | 'plantel' | 'necesidades' | 'canal' | 'centro'
type Fase = 'intro' | 'pasos' | 'fin'

const ESTADO_VACIO: OnboardingState = {
  pais: '', cargo: '', cargo_otro: '', disciplina: '', disciplina_otro: '',
  tamano_plantel: '', necesidades: [], canal: '', canal_otro: '',
  completado: false, completado_at: null, updated_at: '',
}

export function OnboardingPage() {
  const t = useT()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

  const [borrador, setBorrador] = useState<OnboardingState>(ESTADO_VACIO)
  const [cargando, setCargando] = useState(true)
  const [fase, setFase] = useState<Fase>('intro')
  const [indice, setIndice] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [centroCreado, setCentroCreado] = useState('')

  // Quien puede crear centros y todavía no tiene ninguno cierra el wizard
  // creándolo: así el panel no se abre vacío. El resto ni ve el paso.
  const necesitaCentro = !!user && (user.is_admin || user.is_director) && user.centros.length === 0

  const pasos = useMemo<{ id: PasoId; label: string }[]>(() => {
    const base: { id: PasoId; label: string }[] = [
      { id: 'pais', label: t('onboarding.rail.pais') },
      { id: 'cargo', label: t('onboarding.rail.cargo') },
      { id: 'plantel', label: t('onboarding.rail.plantel') },
      { id: 'necesidades', label: t('onboarding.rail.necesidades') },
      { id: 'canal', label: t('onboarding.rail.canal') },
    ]
    if (necesitaCentro) base.push({ id: 'centro', label: t('onboarding.rail.centro') })
    return base
  }, [t, necesitaCentro])

  const pasoActual = pasos[indice]?.id

  // ── Carga inicial: retoma lo ya contestado ────────────────────────────────
  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const data = await fetchOnboarding()
      setBorrador(data)
      // Si ya había respuestas guardadas, saltar la presentación y posicionarse
      // en el primer paso sin contestar: retomar donde quedó, no desde cero.
      // `necesidades` no cuenta acá — vacío es una respuesta válida, así que no
      // hay forma de distinguir "no lo contestó" de "no marcó ninguna".
      const contestado: Record<string, boolean> = {
        pais: !!data.pais,
        cargo: !!data.cargo,
        plantel: !!(data.disciplina && data.tamano_plantel),
        necesidades: true,
        canal: !!data.canal,
      }
      const orden: PasoId[] = ['pais', 'cargo', 'plantel', 'necesidades', 'canal']
      const yaEmpezo = ['pais', 'cargo', 'plantel', 'canal'].some((p) => contestado[p])
      if (yaEmpezo) {
        setFase('pasos')
        const primerVacio = orden.findIndex((p) => !contestado[p])
        setIndice(primerVacio === -1 ? orden.length - 1 : primerVacio)
      }
    } catch {
      setError(t('onboarding.errorGuardar'))
    } finally {
      setCargando(false)
    }
  }, [t])

  useEffect(() => {
    void cargar()
  }, [cargar])

  // Al cambiar de paso el foco se mueve al bloque de la pregunta nueva. Sin
  // esto el foco se queda en "Continuar" y quien navega con lector de pantalla
  // no se entera de que la pregunta cambió (el botón sigue diciendo lo mismo).
  const contenedorPasoRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (fase !== 'pasos') return
    contenedorPasoRef.current?.focus()
  }, [indice, fase])

  // ── Guardado de un paso ───────────────────────────────────────────────────
  async function guardar(patch: OnboardingPatch): Promise<boolean> {
    setGuardando(true)
    setError('')
    try {
      const data = await saveOnboarding(patch)
      setBorrador(data)
      return true
    } catch {
      setError(t('onboarding.errorGuardar'))
      return false
    } finally {
      setGuardando(false)
    }
  }

  // Lo que se manda al servidor en cada paso. Los campos "_otro" se limpian si
  // la opción elegida dejó de ser "otro": no queremos guardar el texto de una
  // respuesta que el usuario ya cambió.
  function patchDelPaso(id: PasoId): OnboardingPatch {
    switch (id) {
      case 'pais':
        return { pais: borrador.pais }
      case 'cargo':
        return {
          cargo: borrador.cargo,
          cargo_otro: borrador.cargo === 'otro' ? borrador.cargo_otro.trim() : '',
        }
      case 'plantel':
        return {
          disciplina: borrador.disciplina,
          disciplina_otro: borrador.disciplina === 'otro' ? borrador.disciplina_otro.trim() : '',
          tamano_plantel: borrador.tamano_plantel,
        }
      case 'necesidades':
        return { necesidades: borrador.necesidades }
      case 'canal':
        return {
          canal: borrador.canal,
          canal_otro: borrador.canal === 'otro' ? borrador.canal_otro.trim() : '',
        }
      default:
        return {}
    }
  }

  // Qué hace falta para poder avanzar. `necesidades` no exige nada: no marcar
  // ninguna es una respuesta legítima.
  function puedeAvanzar(id: PasoId | undefined): boolean {
    switch (id) {
      case 'pais':
        return borrador.pais.length === 2
      case 'cargo':
        return !!borrador.cargo && (borrador.cargo !== 'otro' || borrador.cargo_otro.trim().length > 0)
      case 'plantel':
        return (
          !!borrador.disciplina &&
          !!borrador.tamano_plantel &&
          (borrador.disciplina !== 'otro' || borrador.disciplina_otro.trim().length > 0)
        )
      case 'necesidades':
        return true
      case 'canal':
        return !!borrador.canal && (borrador.canal !== 'otro' || borrador.canal_otro.trim().length > 0)
      case 'centro':
        return true
      default:
        return false
    }
  }

  // Cierra el wizard en el servidor y pasa a la pantalla de bienvenida.
  //
  // OJO: acá NO se llama a refreshUser(). Refrescar /me/ pone
  // `onboarding_completo` en true, y <OnboardingRoute> reacciona expulsando a
  // /dashboard — el mensaje de bienvenida no llegaría a verse nunca. El
  // refresco se hace recién al tocar "Entrar al panel" (ver entrarAlPanel).
  async function cerrarWizard(): Promise<boolean> {
    const ok = await guardar({ completado: true })
    if (!ok) return false
    setFase('fin')
    return true
  }

  // Sincroniza la sesión (para que <OnboardingGate> deje pasar) y recién
  // entonces navega. Al revés, el guardia rebotaría de vuelta a /bienvenida.
  async function entrarAlPanel() {
    if (guardando) return
    setGuardando(true)
    try {
      await refreshUser()
      navigate('/dashboard', { replace: true })
    } finally {
      setGuardando(false)
    }
  }

  async function siguiente() {
    if (!pasoActual || !puedeAvanzar(pasoActual) || guardando) return
    const esUltimo = indice === pasos.length - 1

    // En el último paso el guardado y el cierre van en un solo PATCH: el
    // servidor valida los obligatorios después de guardar, así que mandar dos
    // peticiones seguidas solo agregaría un parpadeo del botón.
    if (esUltimo) {
      const ok = await guardar({ ...patchDelPaso(pasoActual), completado: true })
      if (ok) setFase('fin')
      return
    }

    const ok = await guardar(patchDelPaso(pasoActual))
    if (!ok) return
    setIndice((i) => i + 1)
  }

  function atras() {
    if (guardando) return
    if (indice === 0) {
      setFase('intro')
      return
    }
    setIndice((i) => i - 1)
  }

  function actualizar(cambio: Partial<OnboardingState>) {
    setBorrador((b) => ({ ...b, ...cambio }))
  }

  function alternarNecesidad(id: NecesidadId) {
    setBorrador((b) => ({
      ...b,
      necesidades: b.necesidades.includes(id)
        ? b.necesidades.filter((n) => n !== id)
        : [...b.necesidades, id],
    }))
  }

  const opciones = <T extends string>(ids: T[], ns: string, conHint = false): Opcion<T>[] =>
    ids.map((id) => ({
      id,
      label: t(`onboarding.${ns}.${id}`),
      hint: conHint ? t(`onboarding.${ns}.${id}_hint`) : undefined,
    }))

  // ── Estados de carga y error de arranque ──────────────────────────────────
  if (cargando) {
    return (
      <Fondo>
        <div className="flex min-h-[100dvh] items-center justify-center">
          <Spinner />
        </div>
      </Fondo>
    )
  }

  if (error && borrador.updated_at === '' && !guardando) {
    // No pudimos ni leer el estado: sin esto no hay wizard que mostrar. No se
    // ofrece "seguir igual" a propósito — si el backend no responde, el panel
    // tampoco tendría datos que mostrar.
    return (
      <Fondo>
        <div className="flex min-h-[100dvh] items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.14] bg-white/[0.05] p-8 text-center backdrop-blur-md">
            <p className="text-sm text-white/70">{error}</p>
            <button
              type="button"
              onClick={() => void cargar()}
              className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark"
            >
              {t('onboarding.reintentar')}
            </button>
          </div>
        </div>
      </Fondo>
    )
  }

  const nombreCorto = (user?.nombre || '').split(' ')[0] || ''

  // ── Pantalla final ────────────────────────────────────────────────────────
  if (fase === 'fin') {
    return (
      <Fondo>
        <div className="flex min-h-[100dvh] items-center justify-center px-6 py-12">
          <div key="fin" className="onb-entrada w-full max-w-lg text-center">
            <MarcaFinal />
            <h1 className="mt-7 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              {t('onboarding.finTitle', { nombre: nombreCorto })}
              <span className="text-accent">.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/65">
              {centroCreado
                ? t('onboarding.finBodyConCentro', { centro: centroCreado })
                : t('onboarding.finBody')}
            </p>
            <button
              type="button"
              autoFocus
              disabled={guardando}
              onClick={() => void entrarAlPanel()}
              className="mt-9 h-12 w-full rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
            >
              {t('onboarding.finEntrar')}
            </button>
          </div>
        </div>
      </Fondo>
    )
  }

  // ── Presentación ──────────────────────────────────────────────────────────
  if (fase === 'intro') {
    return (
      <Fondo>
        <div className="flex min-h-[100dvh] flex-col">
          <Cabecera />
          <div className="flex flex-1 items-center px-6 py-10 sm:px-10 lg:px-20">
            <div key="intro" className="onb-entrada w-full max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accentLight/80">
                {t('onboarding.eyebrow')}
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {t('onboarding.introTitle', { nombre: nombreCorto })}
                <span className="text-accent">.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/65">
                {t('onboarding.introBody')}
              </p>

              <ul className="mt-8 flex flex-col gap-3.5 border-l border-white/12 pl-5">
                {['introPunto1', 'introPunto2', 'introPunto3'].map((clave) => (
                  <li key={clave} className="text-sm leading-relaxed text-white/60">
                    {t(`onboarding.${clave}`)}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                autoFocus
                onClick={() => {
                  setFase('pasos')
                  setIndice(0)
                }}
                className="mt-10 h-12 w-full rounded-lg bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accentDark sm:w-auto sm:min-w-[200px]"
              >
                {t('onboarding.empezar')}
              </button>
            </div>
          </div>
        </div>
      </Fondo>
    )
  }

  // ── Pasos ─────────────────────────────────────────────────────────────────
  const textoPaso = t('onboarding.pasoDe', { actual: indice + 1, total: pasos.length })
  const esUltimo = indice === pasos.length - 1
  const rielPasos: PasoRiel[] = pasos.map((p) => ({ id: p.id, label: p.label }))

  return (
    <Fondo>
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-6 py-6 sm:px-10 lg:px-12">
        <Cabecera />

        <div className="mt-8 flex flex-1 flex-col gap-8 lg:mt-12 lg:flex-row lg:gap-16">
          {/* Riel de pasos */}
          <div className="lg:w-52 lg:shrink-0 lg:pt-1.5">
            <StepRail pasos={rielPasos} indiceActual={indice} textoPaso={textoPaso} />
          </div>

          {/* Pregunta actual */}
          <div className="flex min-w-0 flex-1 flex-col pb-6">
            <div
              key={pasoActual}
              ref={contenedorPasoRef}
              tabIndex={-1}
              className="onb-entrada flex-1 outline-none"
            >
              {pasoActual === 'pais' && (
                <Pregunta titulo={t('onboarding.paisTitle')} cuerpo={t('onboarding.paisBody')}>
                  <div className="max-w-sm">
                    <CountryCombobox
                      valor={borrador.pais}
                      onChange={(code) => actualizar({ pais: code })}
                      label={t('onboarding.paisLabel')}
                      placeholder={t('onboarding.paisBuscar')}
                      sinResultados={t('onboarding.paisSinResultados')}
                      etiquetaSugeridos={t('onboarding.paisSugeridos')}
                      etiquetaTodos={t('onboarding.paisTodos')}
                    />
                  </div>
                </Pregunta>
              )}

              {pasoActual === 'cargo' && (
                <Pregunta titulo={t('onboarding.cargoTitle')} cuerpo={t('onboarding.cargoBody')}>
                  <RadioGrid
                    name="cargo"
                    legend={t('onboarding.cargoTitle')}
                    opciones={opciones(CARGOS, 'cargo')}
                    valor={borrador.cargo}
                    onChange={(id) => actualizar({ cargo: id })}
                  >
                    {borrador.cargo === 'otro' && (
                      <CampoOtro
                        id="cargo-otro"
                        label={t('onboarding.cargoOtroLabel')}
                        placeholder={t('onboarding.cargoOtroPlaceholder')}
                        valor={borrador.cargo_otro}
                        onChange={(v) => actualizar({ cargo_otro: v })}
                      />
                    )}
                  </RadioGrid>
                </Pregunta>
              )}

              {pasoActual === 'plantel' && (
                <Pregunta titulo={t('onboarding.planteTitle')} cuerpo={t('onboarding.planteBody')}>
                  <div className="flex flex-col gap-7">
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                        {t('onboarding.disciplinaLabel')}
                      </p>
                      <RadioGrid
                        name="disciplina"
                        legend={t('onboarding.disciplinaLabel')}
                        opciones={opciones(DISCIPLINAS, 'disciplina')}
                        valor={borrador.disciplina}
                        onChange={(id) => actualizar({ disciplina: id })}
                      >
                        {borrador.disciplina === 'otro' && (
                          <CampoOtro
                            id="disciplina-otro"
                            label={t('onboarding.disciplinaOtroLabel')}
                            placeholder={t('onboarding.disciplinaOtroPlaceholder')}
                            valor={borrador.disciplina_otro}
                            onChange={(v) => actualizar({ disciplina_otro: v })}
                          />
                        )}
                      </RadioGrid>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
                        {t('onboarding.tamanoLabel')}
                      </p>
                      <RadioGrid
                        name="tamano"
                        legend={t('onboarding.tamanoLabel')}
                        opciones={opciones(TAMANOS, 'tamano', true)}
                        valor={borrador.tamano_plantel}
                        onChange={(id) => actualizar({ tamano_plantel: id })}
                      />
                    </div>
                  </div>
                </Pregunta>
              )}

              {pasoActual === 'necesidades' && (
                <Pregunta
                  titulo={t('onboarding.necesidadesTitle')}
                  cuerpo={t('onboarding.necesidadesBody')}
                >
                  <CheckboxGrid
                    legend={t('onboarding.necesidadesTitle')}
                    opciones={opciones(NECESIDADES, 'necesidad', true)}
                    valores={borrador.necesidades}
                    onToggle={alternarNecesidad}
                  />
                  <p aria-live="polite" className="mt-4 text-xs text-white/50">
                    {borrador.necesidades.length === 0
                      ? t('onboarding.necesidadesOpcional')
                      : borrador.necesidades.length === 1
                        ? t('onboarding.necesidadesUna')
                        : t('onboarding.necesidadesSeleccionadas', { n: borrador.necesidades.length })}
                  </p>
                </Pregunta>
              )}

              {pasoActual === 'canal' && (
                <Pregunta titulo={t('onboarding.canalTitle')} cuerpo={t('onboarding.canalBody')}>
                  <RadioGrid
                    name="canal"
                    legend={t('onboarding.canalTitle')}
                    opciones={opciones(CANALES, 'canal')}
                    valor={borrador.canal}
                    onChange={(id) => actualizar({ canal: id })}
                  >
                    {borrador.canal === 'otro' && (
                      <CampoOtro
                        id="canal-otro"
                        label={t('onboarding.canalOtroLabel')}
                        placeholder={t('onboarding.canalOtroPlaceholder')}
                        valor={borrador.canal_otro}
                        onChange={(v) => actualizar({ canal_otro: v })}
                      />
                    )}
                  </RadioGrid>
                </Pregunta>
              )}

              {pasoActual === 'centro' && (
                <PasoCentro
                  onCreado={async (nombre) => {
                    setCentroCreado(nombre)
                    await cerrarWizard()
                  }}
                  onOmitir={() => void cerrarWizard()}
                  bloqueado={guardando}
                  errorGlobal={error}
                />
              )}
            </div>

            {/* Navegación. El paso de centro trae sus propias acciones. */}
            {pasoActual !== 'centro' && (
              <div className="mt-10">
                {error && (
                  <p role="alert" className="mb-4 text-sm text-perf-danger">
                    {error}
                  </p>
                )}
                <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={atras}
                    disabled={guardando}
                    className="h-12 rounded-lg px-5 text-sm font-medium text-white/60 transition-colors hover:text-white disabled:opacity-40 sm:h-11"
                  >
                    {t('onboarding.atras')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void siguiente()}
                    disabled={!puedeAvanzar(pasoActual) || guardando}
                    className="h-12 rounded-lg bg-accent px-7 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:h-11 sm:min-w-[180px]"
                  >
                    {guardando
                      ? t('onboarding.guardando')
                      : esUltimo
                        ? t('onboarding.finalizar')
                        : t('onboarding.continuar')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Fondo>
  )
}

// ─── Piezas de composición ───────────────────────────────────────────────────

// Fondo compartido con el login: fotografía + capa densa plana (sin gradiente).
function Fondo({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] w-full bg-perf-bg">
      <div
        className="fixed inset-0 bg-perf-bg bg-cover bg-center"
        style={{ backgroundImage: `url('${BG_IMAGE}')` }}
        aria-hidden
      />
      <div className="fixed inset-0 bg-[rgba(6,9,18,0.90)]" aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function Cabecera() {
  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-end gap-3">
        <img src={LOGO_IMAGE} alt="Zyfit" className="h-5 w-auto sm:h-6" />
        <span className="pb-0.5 text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
          Performance
        </span>
      </div>
      <LocaleToggle />
    </header>
  )
}

function Pregunta({
  titulo,
  cuerpo,
  children,
}: {
  titulo: string
  cuerpo: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
        {titulo}
      </h1>
      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/60">{cuerpo}</p>
      <div className="mt-7">{children}</div>
    </section>
  )
}

// Paso final opcional: crear el centro deportivo. Va embebido en el flujo (no
// como modal encima) — es un paso más del wizard, no una interrupción.
function PasoCentro({
  onCreado,
  onOmitir,
  bloqueado,
  errorGlobal,
}: {
  onCreado: (nombre: string) => void | Promise<void>
  onOmitir: () => void
  bloqueado: boolean
  // Error del cierre del wizard: acá no se muestra la barra de navegación, así
  // que este paso también tiene que poder reportarlo.
  errorGlobal: string
}) {
  const t = useT()
  const { refreshUser } = useAuth()
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  const slug = slugify(nombre)
  const puedeCrear = nombre.trim().length > 0 && slug.length > 0 && !creando && !bloqueado

  async function crear() {
    if (!puedeCrear) return
    setCreando(true)
    setError('')
    try {
      const centro = await createCenter({
        nombre: nombre.trim(),
        slug,
        ciudad: ciudad.trim() || undefined,
      })
      await refreshUser()
      await onCreado(centro.nombre)
    } catch (e) {
      const data = (e as { response?: { data?: Record<string, unknown> } })?.response?.data
      const detalle = typeof data?.detail === 'string' ? data.detail : ''
      setError(detalle || t('onboarding.errorGuardar'))
      setCreando(false)
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
        {t('onboarding.centroTitle')}
      </h1>
      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/60">
        {t('onboarding.centroBody')}
      </p>

      <div className="mt-7 flex max-w-sm flex-col gap-4">
        <label className="block">
          <span className="text-xs font-medium text-white/60">Nombre del centro</span>
          <input
            autoFocus
            value={nombre}
            maxLength={160}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="CD Águilas"
            className="mt-1.5 w-full rounded-xl border border-perf-border bg-perf-bg px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent"
          />
          {slug && (
            <span className="mt-1.5 block text-[11px] text-white/45">
              zyfit-performance /{slug}
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-medium text-white/60">Ciudad (opcional)</span>
          <input
            value={ciudad}
            maxLength={120}
            onChange={(e) => setCiudad(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-perf-border bg-perf-bg px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/40 focus:border-accent"
          />
        </label>
      </div>

      {(error || errorGlobal) && (
        <p role="alert" className="mt-4 text-sm text-perf-danger">
          {error || errorGlobal}
        </p>
      )}

      <div className="mt-9 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onOmitir}
          disabled={creando || bloqueado}
          className="h-12 rounded-lg px-5 text-sm font-medium text-white/60 transition-colors hover:text-white disabled:opacity-40 sm:h-11"
        >
          {t('onboarding.centroOmitir')}
        </button>
        <button
          type="button"
          onClick={() => void crear()}
          disabled={!puedeCrear}
          className="h-12 rounded-lg bg-accent px-7 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:h-11 sm:min-w-[180px]"
        >
          {creando ? t('onboarding.guardando') : t('onboarding.finalizar')}
        </button>
      </div>
    </section>
  )
}

// Marca de cierre del wizard: el anillo se dibuja una sola vez, al montar.
// Es el único momento con animación propia de toda la pantalla final.
function MarcaFinal() {
  return (
    <svg viewBox="0 0 64 64" className="mx-auto h-16 w-16" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="29" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <circle
        className="onb-anillo"
        cx="32"
        cy="32"
        r="29"
        stroke="#14b8a6"
        strokeWidth="2"
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
      />
      <path
        className="onb-tilde"
        d="M20.5 33.5 28.5 41.5 44 25"
        stroke="#14b8a6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
