'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const LISTA_EJERCICIOS = [
  'Sentadilla con barra', 'Sentadilla frontal', 'Sentadilla sumo', 'Sentadilla goblet',
  'Sentadilla búlgara', 'Sentadilla hack', 'Peso muerto convencional', 'Peso muerto rumano',
  'Peso muerto sumo', 'Peso muerto con mancuernas', 'Press banca plano', 'Press banca inclinado',
  'Press banca declinado', 'Press banca con mancuernas', 'Aperturas con mancuernas',
  'Fondos en paralelas', 'Press militar con barra', 'Press hombro con mancuernas',
  'Elevaciones laterales', 'Elevaciones frontales', 'Face pull', 'Pájaros',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna',
  'Remo en polea', 'Pull over', 'Curl de bíceps con barra', 'Curl de bíceps con mancuernas',
  'Curl martillo', 'Curl en polea', 'Extensión de tríceps en polea',
  'Press francés', 'Patada de tríceps', 'Fondos en banco', 'Hip thrust',
  'Puente de glúteos', 'Patada de glúteo en polea', 'Abducción de cadera',
  'Zancadas', 'Zancadas caminando', 'Estocadas laterales', 'Prensa de piernas',
  'Extensión de cuádriceps', 'Curl femoral', 'Elevación de gemelos de pie',
  'Elevación de gemelos sentado', 'Plancha', 'Plancha lateral', 'Crunch',
  'Crunch inverso', 'Elevación de piernas', 'Rueda abdominal', 'Russian twist',
  'Dead bug', 'Bird dog', 'Superman', 'Hyperextensión lumbar',
  'Swing con kettlebell', 'Turkish get up', 'Clean con kettlebell',
  'Burpees', 'Mountain climbers', 'Saltos al cajón', 'Step up',
  'Movilidad torácica', 'Movilidad de cadera', 'Estiramiento de isquiotibiales',
  'Estiramiento de cuádriceps', 'Estiramiento de pectoral', 'Foam roller',
]
const PASOS = ['perfil', 'cuerpo', 'lifestyle', 'rendimiento', 'ubicaciones']

const OBJETIVOS = [
  { id: 'perdida_grasa', label: 'Pérdida de grasa', desc: 'Reducir grasa corporal manteniendo músculo', icon: '🔥' },
  { id: 'ganancia_muscular', label: 'Ganancia muscular', desc: 'Aumentar masa muscular y fuerza', icon: '💪' },
  { id: 'rendimiento', label: 'Rendimiento deportivo', desc: 'Mejorar capacidades para tu deporte', icon: '⚡' },
  { id: 'salud_general', label: 'Salud general', desc: 'Mantenerte activo y saludable', icon: '❤️' },
  { id: 'resistencia', label: 'Resistencia', desc: 'Mejorar capacidad cardiovascular', icon: '🏃' },
]

const NIVELES = [
  { id: 'principiante', label: 'Principiante', desc: 'Menos de 1 año entrenando' },
  { id: 'intermedio', label: 'Intermedio', desc: '1 a 3 años entrenando' },
  { id: 'avanzado', label: 'Avanzado', desc: 'Más de 3 años entrenando' },
]

const IMPLEMENTOS_OPCIONES = [
  'Barra olímpica', 'Mancuernas', 'Kettlebells', 'Máquinas',
  'Bandas elásticas', 'TRX', 'Peso corporal', 'Cardio (cinta/bici)'
]

const ESTILOS = [
  { id: 'fuerza', label: 'Fuerza', desc: 'Cargas altas, pocas reps', icon: '🏋️' },
  { id: 'hipertrofia', label: 'Hipertrofia', desc: 'Volumen moderado, enfoque muscular', icon: '💪' },
  { id: 'funcional', label: 'Funcional', desc: 'Movimientos compuestos y atletismo', icon: '⚡' },
  { id: 'circuito', label: 'Circuito / HIIT', desc: 'Alta intensidad, poco descanso', icon: '🔥' },
  { id: 'mixto', label: 'Mixto', desc: 'Combinación según el día', icon: '🎯' },
]

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .bg-gradient {
    position: fixed; inset: 0; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,255,0.45), transparent 70%),
      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(108,229,255,0.15), transparent 60%),
      radial-gradient(ellipse 50% 40% at 20% 90%, rgba(120,60,255,0.15), transparent 60%);
  }
  .bg-noise {
    position: fixed; inset: 0; z-index: 0; opacity: 0.04;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }

  .glass-card {
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(40px) saturate(180%);
    -webkit-backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 28px;
    padding: 32px 28px;
    width: 100%; max-width: 480px;
    position: relative; z-index: 10;
    box-shadow: 0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
  }

  .glass-input {
    width: 100%;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 14px;
    padding: 15px 18px;
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 15px;
    outline: none;
    transition: all 0.2s;
    resize: none;
  }
  .glass-input:focus {
    border-color: rgba(79,140,255,0.6);
    background: rgba(255,255,255,0.1);
    box-shadow: 0 0 0 3px rgba(79,140,255,0.15);
  }
  .glass-input::placeholder { color: rgba(255,255,255,0.3); }

  .opcion-btn {
    width: 100%; text-align: left; padding: 14px 16px;
    border-radius: 14px; border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05);
    cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; gap: 12px;
  }
  .opcion-btn:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); }
  .opcion-btn.selected {
    border-color: rgba(79,140,255,0.6);
    background: rgba(79,140,255,0.15);
    box-shadow: 0 0 0 1px rgba(79,140,255,0.3);
  }

  .pill-btn {
    padding: 10px 16px; border-radius: 999px; cursor: pointer; transition: all 0.2s;
    font-size: 14px; font-family: 'Space Grotesk', sans-serif;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  }
  .pill-btn:hover { border-color: rgba(255,255,255,0.25); color: #fff; }
  .pill-btn.selected {
    border-color: rgba(79,140,255,0.6);
    background: rgba(79,140,255,0.2); color: #fff;
  }

  .implemento-btn {
    padding: 9px 14px; border-radius: 999px; cursor: pointer; transition: all 0.2s;
    font-size: 13px; font-family: 'Space Grotesk', sans-serif;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  }
  .implemento-btn:hover { border-color: rgba(255,255,255,0.2); color: #fff; }
  .implemento-btn.selected {
    border-color: rgba(79,140,255,0.6);
    background: rgba(79,140,255,0.2); color: #fff;
  }

  .section-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px; color: rgba(255,255,255,0.5);
    letter-spacing: 0.15em; text-transform: uppercase;
    margin-bottom: 10px; display: block;
  }

  .btn-primary {
    width: 100%; padding: 16px; border-radius: 14px; border: none; cursor: pointer;
    background: linear-gradient(135deg, #4f8cff, #2563ff);
    color: #fff; font-family: 'Space Grotesk', sans-serif;
    font-weight: 600; font-size: 15px;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(37,99,255,0.4);
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(37,99,255,0.5); }
  .btn-primary:disabled { opacity: 0.4; transform: none; cursor: not-allowed; }

  .btn-secondary {
    width: 100%; padding: 14px; border-radius: 14px; cursor: pointer;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.6);
    font-family: 'Space Grotesk', sans-serif; font-size: 14px; transition: all 0.2s;
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.1); color: #fff; }

  input[type=range] { width: 100%; accent-color: #4f8cff; }

  .toggle-switch {
    width: 44px; height: 24px; border-radius: 999px; border: none; cursor: pointer;
    position: relative; transition: all 0.3s;
  }
  .toggle-knob {
    position: absolute; top: 3px; width: 18px; height: 18px;
    border-radius: 50%; background: #fff; transition: left 0.3s;
  }

  @keyframes float-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  .float-in { animation: float-in 0.35s ease forwards; }
`
function SelectorEjercicios({ label, value, onChange, placeholder }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [seleccionados, setSeleccionados] = useState(
    value ? value.split(',').map(e => e.trim()).filter(Boolean) : []
  )

  const filtrados = busqueda.length > 1
    ? LISTA_EJERCICIOS.filter(e => e.toLowerCase().includes(busqueda.toLowerCase()) && !seleccionados.includes(e)).slice(0, 6)
    : []

  function agregar(ejercicio) {
    const nuevos = [...seleccionados, ejercicio]
    setSeleccionados(nuevos)
    onChange(nuevos.join(', '))
    setBusqueda('')
  }

  function quitar(ejercicio) {
    const nuevos = seleccionados.filter(e => e !== ejercicio)
    setSeleccionados(nuevos)
    onChange(nuevos.join(', '))
  }

  return (
    <div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>{label}</span>

      {seleccionados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {seleccionados.map(ej => (
            <div key={ej} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', background: 'rgba(79,140,255,0.2)', border: '1px solid rgba(79,140,255,0.4)' }}>
              <span style={{ fontSize: '12px', color: '#fff' }}>{ej}</span>
              <button onClick={() => quitar(ej)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 200)}
          placeholder={placeholder}
          className="glass-input"
          style={{ fontSize: '14px' }}
        />
        {abierto && filtrados.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '4px', borderRadius: '14px', background: 'rgba(10,15,35,0.95)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            {filtrados.map(ej => (
              <button key={ej} onMouseDown={() => agregar(ej)} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: '14px', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.target.style.background = 'rgba(79,140,255,0.15)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >
                {ej}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const [paso, setPaso] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  // Paso 1
  const [nombre, setNombre] = useState('')
  const [objetivos, setObjetivos] = useState([])
  const [nivel, setNivel] = useState(null)
  const [lesiones, setLesiones] = useState('')
  const [experienciaDeportiva, setExperienciaDeportiva] = useState('')

  // Paso 2
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [sexo, setSexo] = useState(null)
  const [unidadPeso, setUnidadPeso] = useState('kg')
  const [unidadAltura, setUnidadAltura] = useState('cm')
  const [usaCicloMenstrual, setUsaCicloMenstrual] = useState(false)

  // Paso 3
  const [diasSemana, setDiasSemana] = useState(3)
  const [horario, setHorario] = useState(null)
  const [nivelEstres, setNivelEstres] = useState(null)
  const [tipoTrabajo, setTipoTrabajo] = useState(null)

  // Paso 4
  const [estiloEntrenamiento, setEstiloEntrenamiento] = useState(null)
  const [ejerciciosFavoritos, setEjerciciosFavoritos] = useState('')
  const [ejerciciosEvitar, setEjerciciosEvitar] = useState('')
  const [rmSentadilla, setRmSentadilla] = useState('')
  const [rmPeseMuerto, setRmPeseMuerto] = useState('')
  const [rmPressBanca, setRmPressBanca] = useState('')
  const [rmPressHombro, setRmPressHombro] = useState('')

  // Paso 5
  const [ubicaciones, setUbicaciones] = useState([{ nombre: '', tipo: 'gimnasio', implementos: [] }])

  function toggleObjetivo(id) {
    setObjetivos(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    )
  }

  function toggleImplemento(uIndex, implemento) {
    setUbicaciones(prev => prev.map((u, i) => {
      if (i !== uIndex) return u
      const existe = u.implementos.includes(implemento)
      return { ...u, implementos: existe ? u.implementos.filter(x => x !== implemento) : [...u.implementos, implemento] }
    }))
  }

  async function guardarYTerminar() {
    setSaving(true)
    setError(null)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) { setError('Sesión no activa.'); setSaving(false); router.push('/auth'); return }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      nombre,
      objetivo: objetivos[0] || null,
      objetivos_multiples: objetivos,
      nivel, lesiones,
      experiencia_deportiva: experienciaDeportiva,
      fecha_nacimiento: fechaNacimiento || null,
      peso: peso ? (unidadPeso === 'lb' ? parseFloat(peso) * 0.453592 : parseFloat(peso)) : null,
      altura: altura ? (unidadAltura === 'ft' ? Math.round(parseFloat(altura) * 30.48) : parseInt(altura)) : null,
      sexo,
      usa_ciclo_menstrual: usaCicloMenstrual,
      dias_semana: diasSemana,
      horario_preferido: horario,
      nivel_estres: nivelEstres,
      tipo_trabajo: tipoTrabajo,
      estilo_entrenamiento: estiloEntrenamiento,
      ejercicios_favoritos: ejerciciosFavoritos,
      ejercicios_evitar: ejerciciosEvitar,
      rm_sentadilla: rmSentadilla ? parseFloat(rmSentadilla) : null,
      rm_peso_muerto: rmPeseMuerto ? parseFloat(rmPeseMuerto) : null,
      rm_press_banca: rmPressBanca ? parseFloat(rmPressBanca) : null,
      rm_press_hombro: rmPressHombro ? parseFloat(rmPressHombro) : null,
    })

    if (profileError) { setError('Error: ' + profileError.message); setSaving(false); return }

    for (const ub of ubicaciones) {
      if (!ub.nombre) continue
      await supabase.from('user_locations').insert({ user_id: user.id, nombre: ub.nombre, tipo: ub.tipo, implementos: ub.implementos })
    }

    router.push('/dashboard')
  }

  const pasoTitulos = [
    { num: '01', titulo: 'Tu perfil', sub: 'La base de tu entrenamiento' },
    { num: '02', titulo: 'Tu cuerpo', sub: 'Para calcular cargas precisas' },
    { num: '03', titulo: 'Tu estilo de vida', sub: 'El contexto afecta el rendimiento' },
    { num: '04', titulo: 'Tu rendimiento', sub: 'Ejercicios y marcadores de fuerza' },
    { num: '05', titulo: '¿Dónde entrenas?', sub: 'Implementos disponibles por ubicación' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '24px 16px 60px', fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
      <style>{STYLES}</style>
      <div className="bg-gradient"></div>
      <div className="bg-noise"></div>

      {/* Logo */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', marginTop: '8px' }}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7ab6ff" />
              <stop offset="100%" stopColor="#2563ff" />
            </linearGradient>
          </defs>
          <path d="M6 6 L16 16 L6 26" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="22" cy="16" r="3.2" fill="url(#lg)" />
        </svg>
        <span style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '-0.02em', color: '#fff' }}>
          Pyfit<span style={{ color: '#7ab6ff' }}>.</span>
        </span>
      </div>

      <div className="glass-card float-in">

        {/* Progress */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '28px' }}>
          {PASOS.map((_, i) => (
            <div key={i} style={{
              height: '3px', flex: 1, borderRadius: '2px',
              background: i < paso ? '#4f8cff' : i === paso ? 'linear-gradient(90deg,#4f8cff,#7ab6ff)' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.4s',
              boxShadow: i <= paso ? '0 0 6px rgba(79,140,255,0.5)' : 'none'
            }} />
          ))}
        </div>

        {/* Título del paso */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
            PASO {pasoTitulos[paso].num} DE 05
          </p>
          <h1 style={{ fontSize: 'clamp(22px,4vw,28px)', fontWeight: '600', color: '#fff', letterSpacing: '-0.03em', lineHeight: '1.1', marginBottom: '4px' }}>
            {pasoTitulos[paso].titulo}
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.5' }}>
            {pasoTitulos[paso].sub}
          </p>
        </div>

        {/* PASO 1 */}
        {paso === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="section-label">Nombre</span>
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="¿Cómo te llamamos?" className="glass-input" />
            </div>

            <div>
              <span className="section-label">Objetivos <span style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '12px' }}>(puedes elegir varios)</span></span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {OBJETIVOS.map(o => (
                  <button key={o.id} className={`opcion-btn${objetivos.includes(o.id) ? ' selected' : ''}`} onClick={() => toggleObjetivo(o.id)}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{o.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: objetivos.includes(o.id) ? '#fff' : 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>{o.label}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{o.desc}</p>
                    </div>
                    {objetivos.includes(o.id) && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4f8cff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="section-label">Nivel de experiencia</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {NIVELES.map(n => (
                  <button key={n.id} className={`opcion-btn${nivel === n.id ? ' selected' : ''}`} onClick={() => setNivel(n.id)}>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: nivel === n.id ? '#fff' : 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>{n.label}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{n.desc}</p>
                    </div>
                    {nivel === n.id && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4f8cff', display: 'grid', placeItems: 'center', marginLeft: 'auto' }}>
                        <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="section-label">Experiencia deportiva <span style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '12px' }}>(opcional)</span></span>
              <textarea value={experienciaDeportiva} onChange={e => setExperienciaDeportiva(e.target.value)} placeholder="Ej: 5 años de fútbol, 2 años de crossfit..." rows={2} maxLength={200} className="glass-input" />
            </div>

            <div>
              <span className="section-label">Lesiones o limitaciones <span style={{ color: 'rgba(255,255,255,0.3)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '12px' }}>(opcional)</span></span>
              <textarea value={lesiones} onChange={e => setLesiones(e.target.value)} placeholder="Ej: dolor lumbar crónico, lesión de rodilla..." rows={2} maxLength={200} className="glass-input" />
            </div>

            <button className="btn-primary" onClick={() => setPaso(1)} disabled={!nombre || objetivos.length === 0 || !nivel}>
              Continuar →
            </button>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="section-label">Sexo biológico</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ id: 'masculino', label: 'Masculino' }, { id: 'femenino', label: 'Femenino' }, { id: 'otro', label: 'Prefiero no decir' }].map(s => (
                  <button key={s.id} className={`pill-btn${sexo === s.id ? ' selected' : ''}`} onClick={() => setSexo(s.id)} style={{ flex: 1, textAlign: 'center', fontSize: '13px' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {sexo === 'femenino' && (
              <div style={{ padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#fff', marginBottom: '3px' }}>Considerar ciclo menstrual</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Pyfit ajusta la carga según tu fase hormonal</p>
                </div>
                <button onClick={() => setUsaCicloMenstrual(!usaCicloMenstrual)} className="toggle-switch" style={{ background: usaCicloMenstrual ? 'linear-gradient(90deg,#4f8cff,#7ab6ff)' : 'rgba(255,255,255,0.15)', boxShadow: usaCicloMenstrual ? '0 0 10px rgba(79,140,255,0.4)' : 'none' }}>
                  <span className="toggle-knob" style={{ left: usaCicloMenstrual ? '23px' : '3px' }}></span>
                </button>
              </div>
            )}

            <div>
  <span className="section-label">Fecha de nacimiento</span>
  <input
    type="date"
    value={fechaNacimiento}
    max={new Date().toISOString().split('T')[0]}
    min="1920-01-01"
    onChange={e => setFechaNacimiento(e.target.value)}
    className="glass-input"
    style={{colorScheme: 'dark'}}
  />
</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
              {[
                { label: 'PESO', placeholder: '—', value: peso, set: setPeso, unit: unidadPeso, toggle: true, opciones: ['kg', 'lb'], setUnit: setUnidadPeso, min: 1, max: 500 },
                { label: 'ALTURA', placeholder: '—', value: altura, set: setAltura, unit: unidadAltura, toggle: true, opciones: ['cm', 'ft'], setUnit: setUnidadAltura, min: 1, max: 300 },
              ].map((f, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="section-label" style={{ marginBottom: 0 }}>{f.label}</span>
                    {f.toggle && (
                      <div style={{ display: 'flex', gap: '3px' }}>
                        {f.opciones.map(u => (
                          <button key={u} onClick={() => f.setUnit(u)} style={{ padding: '2px 6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', letterSpacing: '0.05em', background: f.unit === u ? 'rgba(79,140,255,0.3)' : 'transparent', color: f.unit === u ? '#7ab6ff' : 'rgba(255,255,255,0.3)', transition: 'all 0.2s' }}>
                            {u}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={f.value} min={f.min} max={f.max} onChange={e => {
                      const val = parseFloat(e.target.value)
                      if (e.target.value === '' || (val >= f.min && val <= f.max)) f.set(e.target.value)
                    }} placeholder={f.placeholder} className="glass-input" style={{ paddingRight: '36px', fontSize: '14px', padding: '12px 36px 12px 14px' }} />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>{f.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn-primary" onClick={() => setPaso(2)} disabled={!sexo}>Continuar →</button>
              <button className="btn-secondary" onClick={() => setPaso(0)}>← Atrás</button>
            </div>
          </div>
        )}

        {/* PASO 3 */}
        {paso === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="section-label" style={{ marginBottom: 0 }}>Días de entrenamiento por semana</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: '600', color: '#7ab6ff' }}>{diasSemana}</span>
              </div>
              <input type="range" min="1" max="7" step="1" value={diasSemana} onChange={e => setDiasSemana(parseInt(e.target.value))} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                <span>1 DÍA</span><span>7 DÍAS</span>
              </div>
            </div>

            <div>
              <span className="section-label">Horario preferido</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ id: 'mañana', label: '🌅 Mañana' }, { id: 'tarde', label: '☀️ Tarde' }, { id: 'noche', label: '🌙 Noche' }].map(h => (
                  <button key={h.id} className={`pill-btn${horario === h.id ? ' selected' : ''}`} onClick={() => setHorario(h.id)} style={{ flex: 1, textAlign: 'center', fontSize: '13px' }}>
                    {h.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="section-label">Nivel de estrés habitual</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ id: 'bajo', label: '😌 Bajo' }, { id: 'moderado', label: '😐 Moderado' }, { id: 'alto', label: '😰 Alto' }].map(e => (
                  <button key={e.id} className={`pill-btn${nivelEstres === e.id ? ' selected' : ''}`} onClick={() => setNivelEstres(e.id)} style={{ flex: 1, textAlign: 'center', fontSize: '13px' }}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="section-label">Tipo de trabajo</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[{ id: 'sedentario', label: '💻 Sedentario' }, { id: 'mixto', label: '🚶 Mixto' }, { id: 'activo', label: '⚡ Activo' }].map(t => (
                  <button key={t.id} className={`pill-btn${tipoTrabajo === t.id ? ' selected' : ''}`} onClick={() => setTipoTrabajo(t.id)} style={{ flex: 1, textAlign: 'center', fontSize: '13px' }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn-primary" onClick={() => setPaso(3)} disabled={!horario || !nivelEstres || !tipoTrabajo}>Continuar →</button>
              <button className="btn-secondary" onClick={() => setPaso(1)}>← Atrás</button>
            </div>
          </div>
        )}

        {/* PASO 4 */}
        {paso === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="section-label">Estilo de entrenamiento preferido</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ESTILOS.map(e => (
                  <button key={e.id} className={`opcion-btn${estiloEntrenamiento === e.id ? ' selected' : ''}`} onClick={() => setEstiloEntrenamiento(e.id)}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{e.icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: estiloEntrenamiento === e.id ? '#fff' : 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>{e.label}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{e.desc}</p>
                    </div>
                    {estiloEntrenamiento === e.id && (
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#4f8cff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        <span style={{ color: '#fff', fontSize: '11px' }}>✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <SelectorEjercicios
              label="Ejercicios favoritos"
              value={ejerciciosFavoritos}
              onChange={setEjerciciosFavoritos}
              placeholder="Busca y selecciona ejercicios..."
            />

            <SelectorEjercicios
              label="Ejercicios a evitar"
              value={ejerciciosEvitar}
              onChange={setEjerciciosEvitar}
              placeholder="Busca ejercicios a evitar..."
            />

            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>1RM aproximado</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', marginBottom: '12px' }}>OPCIONAL · DEJA EN BLANCO SI NO LO SABES</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px' }}>
                {[
                  { label: 'SENTADILLA', value: rmSentadilla, set: setRmSentadilla },
                  { label: 'PESO MUERTO', value: rmPeseMuerto, set: setRmPeseMuerto },
                  { label: 'PRESS BANCA', value: rmPressBanca, set: setRmPressBanca },
                  { label: 'PRESS HOMBRO', value: rmPressHombro, set: setRmPressHombro },
                ].map((r, i) => (
                  <div key={i}>
                    <span className="section-label">{r.label}</span>
                    <div style={{ position: 'relative' }}>
                      <input type="number" value={r.value} onChange={e => r.set(e.target.value)} placeholder="—" className="glass-input" style={{ paddingRight: '36px', fontSize: '14px', padding: '12px 36px 12px 14px' }} />
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>kg</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn-primary" onClick={() => setPaso(4)} disabled={!estiloEntrenamiento}>Continuar →</button>
              <button className="btn-secondary" onClick={() => setPaso(2)}>← Atrás</button>
            </div>
          </div>
        )}

        {/* PASO 5 */}
        {paso === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {ubicaciones.map((ub, i) => (
              <div key={i} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span className="section-label">Nombre</span>
                  <input value={ub.nombre} onChange={e => setUbicaciones(prev => prev.map((u, j) => j === i ? { ...u, nombre: e.target.value } : u))} placeholder="Ej: Mi gimnasio, Casa, Parque" className="glass-input" />
                </div>
                <div>
                  <span className="section-label">Tipo</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['gimnasio', 'casa', 'exterior'].map(tipo => (
                      <button key={tipo} className={`pill-btn${ub.tipo === tipo ? ' selected' : ''}`} onClick={() => setUbicaciones(prev => prev.map((u, j) => j === i ? { ...u, tipo } : u))} style={{ flex: 1, textAlign: 'center', textTransform: 'capitalize', fontSize: '13px' }}>
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="section-label">Implementos disponibles</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {IMPLEMENTOS_OPCIONES.map(imp => (
                      <button key={imp} className={`implemento-btn${ub.implementos.includes(imp) ? ' selected' : ''}`} onClick={() => toggleImplemento(i, imp)}>
                        {imp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => setUbicaciones(prev => [...prev, { nombre: '', tipo: 'casa', implementos: [] }])} style={{ padding: '14px', borderRadius: '14px', cursor: 'pointer', background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', transition: 'all 0.2s' }}>
              + Agregar otra ubicación
            </button>

            {error && (
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.25)', color: 'rgba(255,120,120,0.9)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn-primary" onClick={guardarYTerminar} disabled={saving || !ubicaciones[0].nombre}>
                {saving ? 'Guardando...' : 'Empezar con Pyfit →'}
              </button>
              <button className="btn-secondary" onClick={() => setPaso(3)}>← Atrás</button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}