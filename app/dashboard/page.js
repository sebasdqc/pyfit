'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '../components/NavBar'

const NIVELES = [
  { nombre: 'Rookie', min: 0, max: 5, color: '#6b7aa0', icon: '🌱' },
  { nombre: 'Atleta', min: 5, max: 15, color: '#4f8cff', icon: '⚡' },
  { nombre: 'Élite', min: 15, max: 30, color: '#7ab6ff', icon: '🔥' },
  { nombre: 'Leyenda', min: 30, max: 9999, color: '#ffaa32', icon: '👑' },
]

const LOGROS_CONFIG = [
  { id: 'primera_sesion', label: 'Primera sesión', icon: '🎯', condicion: (s) => s >= 1 },
  { id: 'racha_3', label: 'Racha de 3', icon: '🔥', condicion: (_, r) => r >= 3 },
  { id: 'racha_7', label: 'Semana perfecta', icon: '💎', condicion: (_, r) => r >= 7 },
  { id: 'sesiones_10', label: '10 sesiones', icon: '⚡', condicion: (s) => s >= 10 },
  { id: 'sesiones_25', label: '25 sesiones', icon: '🏆', condicion: (s) => s >= 25 },
  { id: 'sesiones_50', label: '50 sesiones', icon: '👑', condicion: (s) => s >= 50 },
  { id: 'consistencia', label: 'Consistente', icon: '🎖️', condicion: (_, __, c) => c >= 90 },
]

function CirculoProgreso({ porcentaje, color, label, valor, size = 100 }) {
  const radio = (size - 12) / 2
  const circunferencia = 2 * Math.PI * radio
  const offset = circunferencia - (Math.min(porcentaje, 100) / 100) * circunferencia

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radio} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle cx={size / 2} cy={size / 2} r={radio} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circunferencia} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{valor}</span>
        </div>
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

function CalendarioSemana({ sesiones }) {
  const hoy = new Date()
  const diaSemana = (hoy.getDay() + 6) % 7
  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  const dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() - diaSemana + i)
    fecha.setHours(0, 0, 0, 0)
    const key = fecha.toISOString().split('T')[0]
    const entrenado = sesiones.some(s => {
      const sf = new Date(s.fecha)
      sf.setHours(0, 0, 0, 0)
      return sf.toISOString().split('T')[0] === key
    })
    const esHoy = i === diaSemana
    return { dia: DIAS[i], num: fecha.getDate(), entrenado, esHoy }
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
      {dias.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: d.esHoy ? '#fff' : 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{d.dia}</span>
          <div style={{
            width: '36px', height: '36px', borderRadius: '12px',
            background: d.entrenado
              ? 'linear-gradient(135deg, #4f8cff, #2563ff)'
              : d.esHoy
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(255,255,255,0.04)',
            border: d.esHoy && !d.entrenado ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
            display: 'grid', placeItems: 'center',
            boxShadow: d.entrenado ? '0 4px 12px rgba(37,99,255,0.4)' : 'none',
            transition: 'all 0.3s'
          }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: d.esHoy ? '700' : '400', color: d.entrenado ? '#fff' : d.esHoy ? '#fff' : 'rgba(255,255,255,0.4)' }}>{d.num}</span>
          </div>
          {d.entrenado && (
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#4f8cff', boxShadow: '0 0 6px #4f8cff' }} />
          )}
          {!d.entrenado && <div style={{ width: '4px', height: '4px' }} />}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [perfil, setPerfil] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [todasSesiones, setTodasSesiones] = useState([])
  const [metricas, setMetricas] = useState(null)
  const [gamificacion, setGamificacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function cargarDatos() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: perfilData }, { data: sesionesData }, { data: todasData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sessions').select('*, session_feedback(*), user_locations(nombre,tipo)').eq('user_id', user.id).order('fecha', { ascending: false }).limit(3),
        supabase.from('sessions').select('fecha, session_feedback(rpe_real,cumplimiento,rating), rpe_target').eq('user_id', user.id).order('fecha', { ascending: false })
      ])

      setPerfil(perfilData)
      setSesiones(sesionesData || [])
      setTodasSesiones(todasData || [])

      if (todasData) {
        const conFeedback = todasData.filter(s => s.session_feedback?.length > 0)
        const estaSemana = todasData.filter(s => (new Date() - new Date(s.fecha)) / (1000 * 60 * 60 * 24) <= 7)
        const ultimas72h = todasData.filter(s => (new Date() - new Date(s.fecha)) / (1000 * 60 * 60) <= 72)
        const cumplimiento = conFeedback.length > 0
          ? Math.round(conFeedback.reduce((acc, s) => acc + (s.session_feedback[0]?.cumplimiento || 0), 0) / conFeedback.length)
          : null
        const rpeReal = conFeedback.length > 0
          ? (conFeedback.reduce((acc, s) => acc + (s.session_feedback[0]?.rpe_real || 0), 0) / conFeedback.length).toFixed(1)
          : null

        const diasObjetivo = perfilData?.dias_semana || 3
        const porcentajeCarga = Math.round((estaSemana.length / diasObjetivo) * 100)
        const porcentajeFatiga = Math.min(Math.round((ultimas72h.length / 3) * 100), 100)

        const racha = calcularRacha(todasData)
        const mejorRacha = perfilData?.mejor_racha || 0
        const nivel = NIVELES.find(n => todasData.length >= n.min && todasData.length < n.max) || NIVELES[0]
        const siguienteNivel = NIVELES[NIVELES.indexOf(nivel) + 1]
        const progresoNivel = siguienteNivel ? ((todasData.length - nivel.min) / (siguienteNivel.min - nivel.min)) * 100 : 100
        const logrosDesbloqueados = LOGROS_CONFIG.filter(l => l.condicion(todasData.length, racha, cumplimiento || 0))

        setMetricas({ totalSesiones: todasData.length, estaSemana: estaSemana.length, diasObjetivo, cumplimiento, rpeReal, porcentajeCarga, porcentajeFatiga })
        setGamificacion({ racha, mejorRacha, nivel, siguienteNivel, progresoNivel, logrosDesbloqueados })

        if (racha > mejorRacha) {
          await supabase.from('profiles').update({ racha_actual: racha, mejor_racha: racha }).eq('id', user.id)
        } else {
          await supabase.from('profiles').update({ racha_actual: racha }).eq('id', user.id)
        }
      }
      setLoading(false)
    }
    cargarDatos()
  }, [])

  function calcularRacha(sesiones) {
    if (!sesiones || sesiones.length === 0) return 0
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    let racha = 0
    let fechaCheck = new Date(hoy)
    const fechas = new Set(sesiones.map(s => { const d = new Date(s.fecha); d.setHours(0, 0, 0, 0); return d.toISOString().split('T')[0] }))
    for (let i = 0; i < 365; i++) {
      const key = fechaCheck.toISOString().split('T')[0]
      if (fechas.has(key)) { racha++; fechaCheck.setDate(fechaCheck.getDate() - 1) }
      else if (i === 0) { fechaCheck.setDate(fechaCheck.getDate() - 1) }
      else break
    }
    return racha
  }

  function getIniciales(nombre) {
    if (!nombre) return 'U'
    return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function getRatingEmoji(rating) {
    return { 1: '😩', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' }[Math.round(rating)] || '—'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(79,140,255,0.3)', borderTop: '2px solid #4f8cff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Space Grotesk, system-ui, sans-serif', color: '#fff', paddingBottom: '100px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .bg-gradient {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,255,0.35), transparent 70%),
            radial-gradient(ellipse 50% 40% at 90% 90%, rgba(108,229,255,0.1), transparent 60%);
        }
        .card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 18px;
          position: relative; overflow: hidden;
        }
        .card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
        }
        .session-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 14px;
          transition: all 0.2s; cursor: pointer;
        }
        .session-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.12); }
        .ranking-card {
          background: linear-gradient(135deg, rgba(255,170,50,0.15), rgba(255,100,0,0.08));
          border: 1px solid rgba(255,170,50,0.3);
          border-radius: 20px; padding: 20px;
          position: relative; overflow: hidden; cursor: pointer;
          transition: all 0.2s;
        }
        .ranking-card:hover { border-color: rgba(255,170,50,0.5); transform: translateY(-1px); }
        .ranking-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,170,50,0.5), transparent);
        }
        @keyframes fire { 0%,100%{transform:scale(1) rotate(-2deg)} 50%{transform:scale(1.1) rotate(2deg)} }
        @keyframes glow { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes float-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .float-in { animation: float-in 0.4s ease forwards; }
      `}</style>

      <div className="bg-gradient"></div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 2 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #4f8cff, #2563ff)',
              display: 'grid', placeItems: 'center',
              fontSize: '16px', fontWeight: '700', color: '#fff',
              boxShadow: '0 4px 16px rgba(37,99,255,0.4)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              {getIniciales(perfil?.nombre)}
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', marginBottom: '2px' }}>BIENVENIDO DE VUELTA</p>
              <p style={{ fontSize: '20px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {perfil?.nombre?.split(' ')[0] || 'Atleta'} <span style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', color: '#7ab6ff' }}>.</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => alert('Notificaciones — próximamente')}
            style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        </div>

        <div className="float-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* CALENDARIO SEMANAL */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button onClick={() => router.push('/historial?vista=calendario')} style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', background:'none', border:'none', cursor:'pointer', padding:0}}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  ESTA SEMANA
                </p>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4f8cff', boxShadow: '0 0 6px #4f8cff', animation: 'glow 2s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#4f8cff', letterSpacing: '0.08em' }}>
                  {metricas?.estaSemana || 0}/{metricas?.diasObjetivo || 3} DÍAS
                </span>
              </div>
            </div>
            <CalendarioSemana sesiones={todasSesiones} />
          </div>

          {/* CÍRCULOS — FATIGA Y CARGA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: '4px' }}>
              <CirculoProgreso
                porcentaje={metricas?.porcentajeFatiga || 0}
                color={metricas?.porcentajeFatiga >= 80 ? '#ff4444' : metricas?.porcentajeFatiga >= 50 ? '#ffaa32' : '#32c896'}
                label="Fatiga"
                valor={`${metricas?.porcentajeFatiga || 0}%`}
              />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '4px', lineHeight: '1.4' }}>
                {metricas?.porcentajeFatiga >= 80 ? 'Descansa hoy' : metricas?.porcentajeFatiga >= 50 ? 'Carga moderada' : 'Listo para entrenar'}
              </p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px', gap: '4px' }}>
              <CirculoProgreso
                porcentaje={metricas?.porcentajeCarga || 0}
                color={metricas?.porcentajeCarga >= 100 ? '#32c896' : metricas?.porcentajeCarga >= 50 ? '#4f8cff' : '#ffaa32'}
                label="Volumen semanal"
                valor={`${Math.min(metricas?.porcentajeCarga || 0, 100)}%`}
              />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: '4px', lineHeight: '1.4' }}>
                {metricas?.porcentajeCarga >= 100 ? '¡Objetivo cumplido!' : `${(metricas?.diasObjetivo || 3) - (metricas?.estaSemana || 0)} sesiones restantes`}
              </p>
            </div>
          </div>

          {/* RANKING / NIVEL */}
          {gamificacion && (
            <div className="ranking-card" onClick={() => alert('Ranking global — próximamente 🏆')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(255,170,50,0.3), rgba(255,100,0,0.2))',
                    border: '1px solid rgba(255,170,50,0.4)',
                    display: 'grid', placeItems: 'center', fontSize: '28px',
                    animation: gamificacion.racha >= 3 ? 'fire 1.5s ease-in-out infinite' : 'none'
                  }}>
                    {gamificacion.nivel.icon}
                  </div>
                  <div>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,170,50,0.7)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
                      NIVEL · {gamificacion.nivel.nombre.toUpperCase()}
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {metricas?.totalSesiones || 0} sesiones
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                      {gamificacion.racha > 0 ? `🔥 ${gamificacion.racha} días de racha` : 'Empieza tu racha hoy'}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,170,50,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>

              {gamificacion.siguienteNivel && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>PROGRESO AL SIGUIENTE NIVEL</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,170,50,0.7)', letterSpacing: '0.06em' }}>{Math.round(gamificacion.progresoNivel)}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(gamificacion.progresoNivel, 100)}%`, background: 'linear-gradient(90deg, #ffaa32, #ff6400)', borderRadius: '2px', boxShadow: '0 0 8px rgba(255,170,50,0.5)', transition: 'width 1s ease' }} />
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
                    → {gamificacion.siguienteNivel.nombre} en {gamificacion.siguienteNivel.min - (metricas?.totalSesiones || 0)} sesiones
                  </p>
                </div>
              )}
            </div>
          )}

          {/* HISTORIAL */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>ÚLTIMAS SESIONES</p>
              <button onClick={() => router.push('/historial?vista=lista')} style={{ background: 'none', border: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#4f8cff', letterSpacing: '0.08em', cursor: 'pointer' }}>VER TODO →</button>
            </div>

            {sesiones.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sesiones.map(sesion => {
                  const feedback = sesion.session_feedback?.[0]
                  const datos = sesion.respuesta_claude
                  return (
                    <div key={sesion.id} className="session-card" onClick={() => router.push(`/ejecutar/${sesion.id}`)}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', color: '#fff', marginBottom: '2px' }}>{datos?.titulo || 'Sesión de entrenamiento'}</p>
                          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
                            {formatearFecha(sesion.fecha)} · {sesion.user_locations?.nombre}
                          </p>
                        </div>
                        {feedback && <span style={{ fontSize: '18px', marginLeft: '8px' }}>{getRatingEmoji(feedback.rating)}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                          RPE {sesion.rpe_target}
                        </span>
                        {feedback && (
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: feedback.cumplimiento >= 80 ? '#32c896' : 'rgba(255,255,255,0.4)', background: feedback.cumplimiento >= 80 ? 'rgba(50,200,150,0.08)' : 'rgba(255,255,255,0.06)', border: `1px solid ${feedback.cumplimiento >= 80 ? 'rgba(50,200,150,0.2)' : 'rgba(255,255,255,0.08)'}`, padding: '3px 8px', borderRadius: '6px' }}>
                            {feedback.cumplimiento}% completado
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: '36px', marginBottom: '12px' }}>🏋️</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>TU HISTORIA EMPIEZA HOY</p>
              </div>
            )}
          </div>

        </div>
      </div>

      <NavBar />
    </div>
  )
}