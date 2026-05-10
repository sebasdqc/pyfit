'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '../components/NavBar'

const LISTA_EJERCICIOS = [
  'Sentadilla con barra', 'Sentadilla frontal', 'Sentadilla sumo', 'Sentadilla goblet',
  'Sentadilla búlgara', 'Peso muerto convencional', 'Peso muerto rumano', 'Peso muerto sumo',
  'Press banca plano', 'Press banca inclinado', 'Press banca declinado', 'Aperturas con mancuernas',
  'Fondos en paralelas', 'Press militar con barra', 'Press hombro con mancuernas',
  'Elevaciones laterales', 'Elevaciones frontales', 'Face pull', 'Pájaros',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna', 'Remo en polea',
  'Curl de bíceps con barra', 'Curl de bíceps con mancuernas', 'Curl martillo',
  'Extensión de tríceps en polea', 'Press francés', 'Patada de tríceps', 'Fondos en banco',
  'Hip thrust', 'Puente de glúteos', 'Patada de glúteo en polea', 'Abducción de cadera',
  'Zancadas', 'Zancadas caminando', 'Estocadas laterales', 'Prensa de piernas',
  'Extensión de cuádriceps', 'Curl femoral', 'Elevación de gemelos de pie',
  'Plancha', 'Plancha lateral', 'Crunch', 'Crunch inverso', 'Elevación de piernas',
  'Rueda abdominal', 'Russian twist', 'Dead bug', 'Bird dog', 'Superman',
  'Swing con kettlebell', 'Turkish get up', 'Burpees', 'Mountain climbers',
  'Movilidad torácica', 'Movilidad de cadera', 'Foam roller',
]

const IMPLEMENTOS_OPCIONES = [
  'Barra olímpica', 'Mancuernas', 'Kettlebells', 'Máquinas',
  'Bandas elásticas', 'TRX', 'Peso corporal', 'Cardio (cinta/bici)'
]

const OBJETIVOS = [
  { id: 'perdida_grasa', label: 'Pérdida de grasa', icon: '🔥' },
  { id: 'ganancia_muscular', label: 'Ganancia muscular', icon: '💪' },
  { id: 'rendimiento', label: 'Rendimiento deportivo', icon: '⚡' },
  { id: 'salud_general', label: 'Salud general', icon: '❤️' },
  { id: 'resistencia', label: 'Resistencia', icon: '🏃' },
]

const NIVELES = [
  { id: 'principiante', label: 'Principiante' },
  { id: 'intermedio', label: 'Intermedio' },
  { id: 'avanzado', label: 'Avanzado' },
]

function SelectorEjercicios({ label, value, onChange }) {
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [seleccionados, setSeleccionados] = useState(
    value ? value.split(',').map(e => e.trim()).filter(Boolean) : []
  )

  useEffect(() => {
    setSeleccionados(value ? value.split(',').map(e => e.trim()).filter(Boolean) : [])
  }, [value])

  const filtrados = busqueda.length > 1
    ? LISTA_EJERCICIOS.filter(e => e.toLowerCase().includes(busqueda.toLowerCase()) && !seleccionados.includes(e)).slice(0, 6)
    : []

  function agregar(ejercicio) {
    const nuevos = [...seleccionados, ejercicio]
    setSeleccionados(nuevos)
    onChange(nuevos.join(', '))
    setBusqueda('')
    setAbierto(false)
  }

  function quitar(ejercicio) {
    const nuevos = seleccionados.filter(e => e !== ejercicio)
    setSeleccionados(nuevos)
    onChange(nuevos.join(', '))
  }

  return (
    <div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>{label}</span>
      {seleccionados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
          {seleccionados.map(ej => (
            <div key={ej} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', background: 'rgba(79,140,255,0.15)', border: '1px solid rgba(79,140,255,0.3)' }}>
              <span style={{ fontSize: '12px', color: '#fff' }}>{ej}</span>
              <button onClick={() => quitar(ej)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setAbierto(true) }} onFocus={() => setAbierto(true)} onBlur={() => setTimeout(() => setAbierto(false), 200)} placeholder="Busca y selecciona ejercicios..." style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '13px 16px', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', outline: 'none' }} />
        {abierto && filtrados.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: '4px', borderRadius: '14px', background: 'rgba(8,12,30,0.98)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}>
            {filtrados.map(ej => (
              <button key={ej} onMouseDown={() => agregar(ej)} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '14px', cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif', borderBottom: '1px solid rgba(255,255,255,0.05)' }} onMouseEnter={e => e.target.style.background = 'rgba(79,140,255,0.15)'} onMouseLeave={e => e.target.style.background = 'none'}>{ej}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Modal({ titulo, subtitulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', overflowY: 'auto' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px 80px', minHeight: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingTop: '8px' }}>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>{subtitulo}</p>
            <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em' }}>{titulo}</h2>
          </div>
          <button onClick={onClose} style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '20px', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function RowItem({ icon, label, sublabel, onClick, color, accent }) {
  return (
    <button onClick={onClick} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 16px', borderRadius: '16px', background: accent ? `linear-gradient(135deg, ${accent}18, ${accent}08)` : 'rgba(255,255,255,0.04)', border: `1px solid ${accent ? `${accent}30` : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.2s' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: accent ? `${accent}20` : 'rgba(255,255,255,0.06)', border: `1px solid ${accent ? `${accent}35` : 'rgba(255,255,255,0.09)'}`, display: 'grid', placeItems: 'center', fontSize: '19px', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: '500', color: color || '#fff', marginBottom: '2px', letterSpacing: '-0.01em' }}>{label}</p>
          {sublabel && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.3' }}>{sublabel}</p>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent ? `${accent}80` : 'rgba(255,255,255,0.2)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </button>
  )
}

export default function Perfil() {
  const [perfil, setPerfil] = useState(null)
  const [ubicaciones, setUbicaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [modal, setModal] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  const [objetivos, setObjetivos] = useState([])
  const [nivel, setNivel] = useState('')
  const [diasSemana, setDiasSemana] = useState(3)
  const [nivelEstres, setNivelEstres] = useState('')
  const [tipoTrabajo, setTipoTrabajo] = useState('')
  const [lesiones, setLesiones] = useState('')
  const [ejerciciosFavoritos, setEjerciciosFavoritos] = useState('')
  const [ejerciciosEvitar, setEjerciciosEvitar] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [{ data: p }, { data: locs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_locations').select('*').eq('user_id', user.id)
      ])
      if (p) {
        setPerfil({ ...p, email: user.email })
        setObjetivos(p.objetivos_multiples || (p.objetivo ? [p.objetivo] : []))
        setNivel(p.nivel || '')
        setDiasSemana(p.dias_semana || 3)
        setNivelEstres(p.nivel_estres || '')
        setTipoTrabajo(p.tipo_trabajo || '')
        setLesiones(p.lesiones || '')
        setEjerciciosFavoritos(p.ejercicios_favoritos || '')
        setEjerciciosEvitar(p.ejercicios_evitar || '')
      }
      setUbicaciones(locs || [])
      setLoading(false)
    }
    cargar()
  }, [])

  function toggleObjetivo(id) {
    setObjetivos(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id])
  }

  function toggleImplemento(uIndex, implemento) {
    setUbicaciones(prev => prev.map((u, i) => {
      if (i !== uIndex) return u
      const existe = u.implementos?.includes(implemento)
      return { ...u, implementos: existe ? u.implementos.filter(x => x !== implemento) : [...(u.implementos || []), implemento] }
    }))
  }

  async function agregarUbicacion() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('user_locations').insert({ user_id: user.id, nombre: 'Nueva ubicación', tipo: 'gimnasio', implementos: [] }).select().single()
    if (data) setUbicaciones(prev => [...prev, data])
  }

  async function guardar() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update({
      objetivo: objetivos[0] || null, objetivos_multiples: objetivos,
      nivel, dias_semana: diasSemana, nivel_estres: nivelEstres,
      tipo_trabajo: tipoTrabajo, lesiones,
      ejercicios_favoritos: ejerciciosFavoritos, ejercicios_evitar: ejerciciosEvitar
    }).eq('id', user.id)
    for (const ub of ubicaciones) {
      if (ub.id) await supabase.from('user_locations').update({ nombre: ub.nombre, tipo: ub.tipo, implementos: ub.implementos }).eq('id', ub.id)
    }
    setSaving(false)
    setSuccess(true)
    setTimeout(() => { setSuccess(false); setModal(null) }, 2000)
  }

  function getIniciales(nombre) {
    if (!nombre) return 'U'
    return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function getNivelLabel() {
    return { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' }[perfil?.nivel] || '—'
  }

  function getObjetivosLabel() {
    return objetivos.map(id => OBJETIVOS.find(o => o.id === id)?.label).filter(Boolean).join(' · ') || '—'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(79,140,255,0.3)', borderTop: '2px solid #4f8cff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .bg-gradient { position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,255,0.28), transparent 70%); }
    .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 18px;
      position: relative; overflow: hidden; }
    .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); }
    .pill-btn { padding: 9px 14px; border-radius: 999px; cursor: pointer; transition: all 0.2s;
      font-size: 13px; font-family: 'Space Grotesk', sans-serif;
      border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); }
    .pill-btn:hover { border-color: rgba(255,255,255,0.2); color: #fff; }
    .pill-btn.selected { border-color: rgba(79,140,255,0.5); background: rgba(79,140,255,0.15); color: #fff; }
    .opcion-btn { width: 100%; text-align: left; padding: 12px 14px; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 10px; }
    .opcion-btn:hover { border-color: rgba(255,255,255,0.15); }
    .opcion-btn.selected { border-color: rgba(79,140,255,0.5); background: rgba(79,140,255,0.12); }
    .implemento-btn { padding: 8px 12px; border-radius: 999px; cursor: pointer; transition: all 0.2s;
      font-size: 12px; font-family: 'Space Grotesk', sans-serif;
      border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); }
    .implemento-btn:hover { border-color: rgba(255,255,255,0.2); color: #fff; }
    .implemento-btn.selected { border-color: rgba(79,140,255,0.5); background: rgba(79,140,255,0.15); color: #fff; }
    .btn-primary { width: 100%; padding: 15px; border-radius: 14px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #4f8cff, #2563ff); color: #fff;
      font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px;
      transition: all 0.2s; box-shadow: 0 4px 20px rgba(37,99,255,0.3); }
    .btn-primary:hover { transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.5; transform: none; cursor: not-allowed; }
    input[type=range] { width: 100%; accent-color: #4f8cff; }
    .info-row { display: flex; align-items: center; justify-content: space-between;
      padding: 13px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .info-row:last-child { border-bottom: none; }
    .section-group { display: flex; flex-direction: column; gap: '4px'; }
    .section-label-sm { font-family: 'JetBrains Mono', monospace; font-size: 10px;
      color: rgba(255,255,255,0.35); letter-spacing: 0.12em; text-transform: uppercase;
      padding: 0 4px; margin-bottom: 6px; display: block; }
  `

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Space Grotesk, system-ui, sans-serif', color: '#fff', paddingBottom: '100px' }}>
      <style>{STYLES}</style>
      <div className="bg-gradient"></div>

      {/* ── MODALES ── */}

      {modal === 'datos_personales' && (
        <Modal titulo="Datos personales" subtitulo="PERFIL" onClose={() => setModal(null)}>
          <div className="card">
            {[
              { label: 'Nombre', valor: perfil?.nombre || '—' },
              { label: 'Correo', valor: perfil?.email || '—' },
              { label: 'Fecha de nacimiento', valor: perfil?.fecha_nacimiento ? new Date(perfil.fecha_nacimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Peso', valor: perfil?.peso ? `${Math.round(perfil.peso)} kg` : '—' },
              { label: 'Altura', valor: perfil?.altura ? `${perfil.altura} cm` : '—' },
              { label: 'Sexo biológico', valor: perfil?.sexo ? perfil.sexo.charAt(0).toUpperCase() + perfil.sexo.slice(1) : '—' },
            ].map((item, i, arr) => (
              <div key={i} className="info-row" style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>{item.valor}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: '12px', letterSpacing: '0.06em' }}>
            PARA MODIFICAR ESTOS DATOS CONTACTA A SOPORTE
          </p>
        </Modal>
      )}

      {modal === 'entrenamiento' && (
        <Modal titulo="Datos de entrenamiento" subtitulo="EDITAR" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span className="section-label-sm">OBJETIVOS</span>
              {OBJETIVOS.map(o => (
                <button key={o.id} className={`opcion-btn${objetivos.includes(o.id) ? ' selected' : ''}`} onClick={() => toggleObjetivo(o.id)}>
                  <span style={{ fontSize: '17px' }}>{o.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: objetivos.includes(o.id) ? '#fff' : 'rgba(255,255,255,0.7)' }}>{o.label}</span>
                  {objetivos.includes(o.id) && <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#4f8cff', display: 'grid', placeItems: 'center', marginLeft: 'auto', flexShrink: 0 }}><span style={{ color: '#fff', fontSize: '10px' }}>✓</span></div>}
                </button>
              ))}
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span className="section-label-sm">NIVEL Y FRECUENCIA</span>
              <div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Nivel</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {NIVELES.map(n => <button key={n.id} className={`pill-btn${nivel === n.id ? ' selected' : ''}`} onClick={() => setNivel(n.id)} style={{ flex: 1, textAlign: 'center' }}>{n.label}</button>)}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Días por semana</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '18px', fontWeight: '600', color: '#7ab6ff' }}>{diasSemana}</span>
                </div>
                <input type="range" min="1" max="7" step="1" value={diasSemana} onChange={e => setDiasSemana(parseInt(e.target.value))} />
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span className="section-label-sm">LIFESTYLE</span>
              <div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Nivel de estrés</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ id: 'bajo', l: '😌 Bajo' }, { id: 'moderado', l: '😐 Moderado' }, { id: 'alto', l: '😰 Alto' }].map(e => <button key={e.id} className={`pill-btn${nivelEstres === e.id ? ' selected' : ''}`} onClick={() => setNivelEstres(e.id)} style={{ flex: 1, textAlign: 'center', fontSize: '12px' }}>{e.l}</button>)}
                </div>
              </div>
              <div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Tipo de trabajo</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ id: 'sedentario', l: '💻 Sedentario' }, { id: 'mixto', l: '🚶 Mixto' }, { id: 'activo', l: '⚡ Activo' }].map(t => <button key={t.id} className={`pill-btn${tipoTrabajo === t.id ? ' selected' : ''}`} onClick={() => setTipoTrabajo(t.id)} style={{ flex: 1, textAlign: 'center', fontSize: '12px' }}>{t.l}</button>)}
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span className="section-label-sm">RESTRICCIONES Y EJERCICIOS</span>
              <div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Lesiones o limitaciones</span>
                <textarea value={lesiones} onChange={e => setLesiones(e.target.value)} maxLength={200} rows={2} placeholder="Ej: dolor lumbar, lesión de rodilla..." style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '13px 16px', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', outline: 'none', resize: 'none' }} />
              </div>
              <SelectorEjercicios label="Ejercicios favoritos" value={ejerciciosFavoritos} onChange={setEjerciciosFavoritos} />
              <SelectorEjercicios label="Ejercicios a evitar" value={ejerciciosEvitar} onChange={setEjerciciosEvitar} />
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span className="section-label-sm">UBICACIONES</span>
              {ubicaciones.map((ub, i) => (
                <div key={ub.id || i} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input value={ub.nombre} onChange={e => setUbicaciones(prev => prev.map((u, j) => j === i ? { ...u, nombre: e.target.value } : u))} placeholder="Nombre" style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '11px 14px', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px', outline: 'none' }} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['gimnasio', 'casa', 'exterior'].map(tipo => <button key={tipo} className={`pill-btn${ub.tipo === tipo ? ' selected' : ''}`} onClick={() => setUbicaciones(prev => prev.map((u, j) => j === i ? { ...u, tipo } : u))} style={{ flex: 1, textAlign: 'center', fontSize: '12px', textTransform: 'capitalize' }}>{tipo}</button>)}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {IMPLEMENTOS_OPCIONES.map(imp => <button key={imp} className={`implemento-btn${ub.implementos?.includes(imp) ? ' selected' : ''}`} onClick={() => toggleImplemento(i, imp)}>{imp}</button>)}
                  </div>
                </div>
              ))}
              <button onClick={agregarUbicacion} style={{ padding: '12px', borderRadius: '12px', cursor: 'pointer', background: 'transparent', border: '1px dashed rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.35)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '13px', width: '100%' }}>+ Agregar ubicación</button>
            </div>

            {success && (
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(50,200,150,0.1)', border: '1px solid rgba(50,200,150,0.25)', textAlign: 'center' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#32c896', letterSpacing: '0.08em' }}>✓ GUARDADO CORRECTAMENTE</p>
              </div>
            )}
            <button className="btn-primary" onClick={guardar} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios →'}</button>
          </div>
        </Modal>
      )}

      {modal === 'suscripcion' && (
        <Modal titulo="Suscripción" subtitulo="PLAN" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(37,99,255,0.22), rgba(79,140,255,0.12))', border: '1px solid rgba(79,140,255,0.35)', borderRadius: '18px', padding: '20px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(79,140,255,0.6), transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(120,180,255,0.6)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>PLAN ACTUAL</p>
                  <p style={{ fontSize: '28px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>Free</p>
                </div>
                <div style={{ padding: '7px 14px', borderRadius: '999px', background: 'rgba(79,140,255,0.2)', border: '1px solid rgba(79,140,255,0.4)' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#7ab6ff', letterSpacing: '0.1em', fontWeight: '600' }}>ACTIVO ✦</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Rutinas con IA', 'Check-in diario', 'Historial', 'Estadísticas', 'Gamificación'].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <span style={{ color: '#7ab6ff', fontSize: '9px' }}>✓</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {[
              { nombre: 'Core', precio: '$14', color: '#7ab6ff', features: ['Todo lo de Free', 'Auto-regulación avanzada', 'Wearables', 'Periodización hormonal', 'Soporte prioritario'], popular: true },
              { nombre: 'Elite', precio: '$79', color: '#ffaa32', features: ['Todo lo de Core', 'Coach humano', 'Video-revisión semanal', 'Llamada estratégica'], popular: false },
            ].map((plan, i) => (
              <div key={i} style={{ borderRadius: '18px', padding: '18px', background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)`, opacity: 0.75 }}>
                {plan.popular && <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', background: `${plan.color}25`, border: `1px solid ${plan.color}40`, fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: plan.color, letterSpacing: '0.08em', marginBottom: '12px' }}>MÁS POPULAR</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ fontSize: '20px', fontWeight: '600', color: plan.color }}>{plan.nombre}</p>
                  <p style={{ fontSize: '22px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em' }}>{plan.precio}<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>/mes</span></p>
                </div>
                {plan.features.map((f, fi) => (
                  <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: plan.color, fontSize: '10px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{f}</span>
                  </div>
                ))}
                <button onClick={() => alert('Próximamente 🚀')} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${plan.color}35`, background: `${plan.color}10`, color: plan.color, fontFamily: 'Space Grotesk, sans-serif', fontWeight: '600', fontSize: '14px', cursor: 'pointer', marginTop: '12px' }}>Próximamente</button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'referir' && (
        <Modal titulo="Refiere a un amigo" subtitulo="GANA 1 MES PRO" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '56px' }}>🎁</div>
            <div>
              <p style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>Comparte Pyfit</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6', maxWidth: '300px' }}>Cada amigo que se una con tu código te da <span style={{ color: '#fff', fontWeight: '600' }}>1 mes del plan Pro completamente gratis</span></p>
            </div>
            <div style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'rgba(79,140,255,0.1)', border: '1px solid rgba(79,140,255,0.25)' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>TU CÓDIGO</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '24px', fontWeight: '700', color: '#7ab6ff', letterSpacing: '0.15em' }}>PRÓXIMAMENTE</p>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', lineHeight: '1.5' }}>El sistema de referidos estará disponible pronto. Te notificaremos cuando puedas empezar a ganar meses gratis.</p>
          </div>
        </Modal>
      )}

      {modal === 'feedback' && (
        <Modal titulo="Dar feedback" subtitulo="AYÚDANOS A MEJORAR" onClose={() => setModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6' }}>Tu opinión es fundamental para hacer Pyfit mejor cada día. Cuéntanos qué mejorarías, qué te gusta y qué falta.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[{ icon: '🐛', label: 'Reportar un error', sub: 'Algo no funciona como debería' }, { icon: '💡', label: 'Sugerir una mejora', sub: 'Tienes una idea para Pyfit' }, { icon: '⭐', label: 'Dejar una reseña', sub: 'Comparte tu experiencia' }].map((item, i) => (
                <button key={i} onClick={() => alert('Próximamente — formulario de feedback 💬')} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'all 0.2s' }}>
                  <span style={{ fontSize: '22px' }}>{item.icon}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#fff', marginBottom: '2px' }}>{item.label}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{item.sub}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ── PÁGINA PRINCIPAL ── */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 2 }}>

        {/* HEADER */}
        <div style={{ padding: '56px 0 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, #4f8cff, #2563ff)', display: 'grid', placeItems: 'center', fontSize: '22px', fontWeight: '700', color: '#fff', boxShadow: '0 4px 20px rgba(37,99,255,0.45)', border: '1px solid rgba(255,255,255,0.18)', flexShrink: 0 }}>
            {getIniciales(perfil?.nombre)}
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>{perfil?.nombre || 'Atleta'}</h1>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: '4px' }}>{getNivelLabel().toUpperCase()}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: '1.3' }}>{getObjetivosLabel()}</p>
          </div>
        </div>

        {/* LISTA DE ITEMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Grupo 1 — Cuenta */}
          <span className="section-label-sm">CUENTA</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <RowItem icon="👤" label="Datos personales" sublabel="Nombre, correo, datos físicos" onClick={() => setModal('datos_personales')} />
            <RowItem icon="📱" label="Dispositivos conectados" sublabel="Wearables y sensores" onClick={() => alert('Dispositivos — próximamente')} />
          </div>

          {/* Grupo 2 — Entrenamiento */}
          <span className="section-label-sm" style={{ marginTop: '8px' }}>ENTRENAMIENTO</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <RowItem icon="⚙️" label="Datos de entrenamiento" sublabel="Objetivos, nivel, ubicaciones, ejercicios" onClick={() => setModal('entrenamiento')} />
          </div>

          {/* Grupo 3 — Plan */}
          <span className="section-label-sm" style={{ marginTop: '8px' }}>PLAN</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <RowItem icon="✦" label="Suscripción" sublabel="Plan Free — ver planes Pro" onClick={() => setModal('suscripcion')} accent="#4f8cff" />
            <RowItem icon="🎁" label="Refiere a un amigo" sublabel="Gana 1 mes Pro gratis" onClick={() => setModal('referir')} accent="#4f8cff" />
          </div>

          {/* Grupo 4 — Soporte */}
          <span className="section-label-sm" style={{ marginTop: '8px' }}>SOPORTE</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <RowItem icon="💬" label="Dar feedback" sublabel="Ayúdanos a mejorar Pyfit" onClick={() => setModal('feedback')} />
            <RowItem icon="❓" label="Centro de ayuda" sublabel="Preguntas frecuentes y soporte" onClick={() => alert('Centro de ayuda — próximamente')} />
          </div>

          {/* Cerrar sesión */}
          <div style={{ marginTop: '8px' }}>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }} style={{ width: '100%', padding: '15px', borderRadius: '16px', cursor: 'pointer', background: 'rgba(255,60,60,0.06)', border: '1px solid rgba(255,60,60,0.15)', color: 'rgba(255,100,100,0.7)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '15px', fontWeight: '500', transition: 'all 0.2s' }}>
              Cerrar sesión
            </button>
          </div>

          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.12)', textAlign: 'center', letterSpacing: '0.06em', marginTop: '4px', paddingBottom: '8px' }}>
            © 2026 PYFIT · v1.0 BETA
          </p>

        </div>
      </div>

      <NavBar />
    </div>
  )
}