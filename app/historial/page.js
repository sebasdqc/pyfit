'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import NavBar from '../components/NavBar'

function CalendarioMes({ sesiones, mes, anio, onDiaClick }) {
  const hoy = new Date()
  const primerDia = new Date(anio, mes, 1)
  const ultimoDia = new Date(anio, mes + 1, 0)
  const diasEnMes = ultimoDia.getDate()
  const iniciaSemana = (primerDia.getDay() + 6) % 7

  const mapaFechas = {}
  sesiones.forEach(s => {
    const fecha = new Date(s.fecha)
    if (fecha.getMonth() === mes && fecha.getFullYear() === anio) {
      const key = fecha.getDate()
      const feedback = s.session_feedback?.[0]
      mapaFechas[key] = { sesion: s, cumplimiento: feedback?.cumplimiento || null, rating: feedback?.rating || null }
    }
  })

  function getColor(dia) {
    const d = mapaFechas[dia]
    const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio
    if (!d && esHoy) return { bg: 'rgba(255,170,50,0.15)', border: 'rgba(255,170,50,0.4)', text: '#ffaa32' }
    if (!d) return { bg: 'transparent', border: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.25)' }
    if (!d.cumplimiento) return { bg: 'rgba(79,140,255,0.2)', border: 'rgba(79,140,255,0.4)', text: '#4f8cff' }
    if (d.cumplimiento >= 90) return { bg: 'rgba(50,200,150,0.2)', border: 'rgba(50,200,150,0.5)', text: '#32c896' }
    if (d.cumplimiento >= 70) return { bg: 'rgba(50,180,120,0.15)', border: 'rgba(50,180,120,0.35)', text: '#28a870' }
    return { bg: 'rgba(255,140,50,0.15)', border: 'rgba(255,140,50,0.4)', text: '#ff8c32' }
  }

  const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const celdas = []
  for (let i = 0; i < iniciaSemana; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  const nombreMes = new Date(anio, mes, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  const sesionesEsteMes = Object.keys(mapaFechas).length

  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {nombreMes.toUpperCase()}
        </p>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#4f8cff', letterSpacing: '0.08em' }}>
          {sesionesEsteMes} SESIÓN{sesionesEsteMes !== 1 ? 'ES' : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', marginBottom: '6px' }}>
        {DIAS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', padding: '3px 0', letterSpacing: '0.06em' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
        {celdas.map((dia, i) => {
          if (!dia) return <div key={i} />
          const color = getColor(dia)
          const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio
          const tieneData = mapaFechas[dia]
          return (
            <div
              key={i}
              onClick={() => tieneData && onDiaClick && onDiaClick(mapaFechas[dia].sesion)}
              style={{
                aspectRatio: '1', borderRadius: '8px',
                border: `1px solid ${color.border}`,
                background: color.bg,
                display: 'grid', placeItems: 'center',
                cursor: tieneData ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: color.text, fontWeight: esHoy ? '700' : '400' }}>{dia}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HistorialContent() {
  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('lista')
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const vistaParam = searchParams.get('vista')
    if (vistaParam === 'calendario' || vistaParam === 'lista') {
      setVista(vistaParam)
    }
  }, [searchParams])

  useEffect(() => {
    async function cargarSesiones() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase
        .from('sessions')
        .select('*, session_feedback(*), user_locations(nombre, tipo)')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
      setSesiones(data || [])
      setLoading(false)
    }
    cargarSesiones()
  }, [])

  function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  function getRatingEmoji(rating) {
    return { 1: '😩', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' }[Math.round(rating)] || '—'
  }

  const sesionesAgrupadas = sesiones.reduce((acc, sesion) => {
    const fecha = new Date(sesion.fecha)
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    const label = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = { label, sesiones: [] }
    acc[key].sesiones.push(sesion)
    return acc
  }, {})

  const mesesCalendario = (() => {
    const meses = []
    const hoy = new Date()
    for (let i = 0; i < 6; i++) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      meses.push({ mes: fecha.getMonth(), anio: fecha.getFullYear() })
    }
    return meses
  })()

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
          background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,255,0.3), transparent 70%);
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
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }
        .session-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px; padding: 14px;
          transition: all 0.2s; cursor: pointer;
        }
        .session-card:hover { background: rgba(255,255,255,0.07); }
        .toggle-btn {
          flex: 1; padding: 10px; border-radius: 10px; border: none; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: '10px'; letter-spacing: '0.08em';
          text-transform: uppercase; transition: all 0.2s; font-size: 10px; letter-spacing: 0.08em;
        }
        .toggle-btn.active { background: rgba(79,140,255,0.2); color: #4f8cff; }
        .toggle-btn.inactive { background: transparent; color: rgba(255,255,255,0.3); }
        .modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.8); backdrop-filter: blur(10px);
          display: flex; align-items: flex-end; justify-content: center;
          padding: 16px;
        }
        .modal-card {
          background: rgba(15,20,40,0.95);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 24px; padding: 24px;
          width: 100%; max-width: 480px;
          max-height: 80vh; overflow-y: auto;
        }
      `}</style>

      <div className="bg-gradient"></div>

      {/* Modal sesión */}
      {sesionSeleccionada && (
        <div className="modal-overlay" onClick={() => setSesionSeleccionada(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                  {formatearFecha(sesionSeleccionada.fecha).toUpperCase()}
                </p>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                  {sesionSeleccionada.respuesta_claude?.titulo || 'Sesión de entrenamiento'}
                </p>
              </div>
              <button onClick={() => setSesionSeleccionada(null)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.5)', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px' }}>×</button>
            </div>

            {sesionSeleccionada.respuesta_claude?.objetivo_sesion && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px', lineHeight: '1.5' }}>
                {sesionSeleccionada.respuesta_claude.objetivo_sesion}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', padding: '4px 10px', borderRadius: '8px' }}>
                RPE objetivo {sesionSeleccionada.rpe_target}
              </span>
              {sesionSeleccionada.session_feedback?.[0] && (
                <>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#4f8cff', background: 'rgba(79,140,255,0.1)', border: '1px solid rgba(79,140,255,0.2)', padding: '4px 10px', borderRadius: '8px' }}>
                    RPE real {sesionSeleccionada.session_feedback[0].rpe_real}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: sesionSeleccionada.session_feedback[0].cumplimiento >= 80 ? '#32c896' : 'rgba(255,255,255,0.4)', background: sesionSeleccionada.session_feedback[0].cumplimiento >= 80 ? 'rgba(50,200,150,0.1)' : 'rgba(255,255,255,0.06)', border: `1px solid ${sesionSeleccionada.session_feedback[0].cumplimiento >= 80 ? 'rgba(50,200,150,0.2)' : 'rgba(255,255,255,0.08)'}`, padding: '4px 10px', borderRadius: '8px' }}>
                    {sesionSeleccionada.session_feedback[0].cumplimiento}% completado
                  </span>
                  <span style={{ fontSize: '20px' }}>{getRatingEmoji(sesionSeleccionada.session_feedback[0].rating)}</span>
                </>
              )}
            </div>

            {sesionSeleccionada.respuesta_claude?.fases?.map((fase, fi) => (
              <div key={fi} style={{ marginBottom: '12px' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: fi === 0 ? '#ffaa32' : fi === 1 ? '#4f8cff' : '#32c896', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  {fi === 0 ? '🔥 ' : fi === 1 ? '⚡ ' : '❄️ '}{fase.nombre.toUpperCase()}
                </p>
                {fase.ejercicios?.map((ej, ei) => (
                  <div key={ei} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '6px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#fff', marginBottom: '4px' }}>{ej.nombre}</p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                      {ej.series} series · {ej.repeticiones} · RPE {ej.rpe_sugerido}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            <button onClick={() => router.push(`/ejecutar/${sesionSeleccionada.id}`)} style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f8cff, #2563ff)', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: '600', fontSize: '14px', marginTop: '8px' }}>
              Ver sesión completa →
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 2 }}>

        {/* HEADER */}
        <div style={{ padding: '56px 0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>HISTORIAL</p>
            <h1 style={{ fontSize: '26px', fontWeight: '600', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              Tu <span style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', color: '#7ab6ff' }}>historia</span>
            </h1>
          </div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
            {sesiones.length} SESIONES
          </p>
        </div>

        {/* TOGGLE VISTA */}
        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', marginBottom: '20px' }}>
          <button className={`toggle-btn ${vista === 'lista' ? 'active' : 'inactive'}`} onClick={() => setVista('lista')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Lista
          </button>
          <button className={`toggle-btn ${vista === 'calendario' ? 'active' : 'inactive'}`} onClick={() => setVista('calendario')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Calendario
          </button>
        </div>

        {/* VISTA CALENDARIO */}
        {vista === 'calendario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Leyenda */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingBottom: '4px' }}>
              {[
                { color: '#32c896', bg: 'rgba(50,200,150,0.2)', label: '≥90%' },
                { color: '#28a870', bg: 'rgba(50,180,120,0.15)', label: '70-89%' },
                { color: '#4f8cff', bg: 'rgba(79,140,255,0.2)', label: 'Sin feedback' },
                { color: '#ff8c32', bg: 'rgba(255,140,50,0.15)', label: '<70%' },
                { color: '#ffaa32', bg: 'rgba(255,170,50,0.15)', label: 'Hoy' },
              ].map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: l.bg, border: `1px solid ${l.color}` }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>{l.label}</span>
                </div>
              ))}
            </div>

            {mesesCalendario.map(({ mes, anio }) => (
              <div key={`${anio}-${mes}`} className="card">
                <CalendarioMes
                  sesiones={sesiones}
                  mes={mes}
                  anio={anio}
                  onDiaClick={(sesion) => setSesionSeleccionada(sesion)}
                />
              </div>
            ))}
          </div>
        )}

        {/* VISTA LISTA */}
        {vista === 'lista' && (
          <div>
            {/* Resumen */}
            {sesiones.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
                {[
                  { valor: sesiones.length, label: 'TOTAL' },
                  {
                    valor: sesiones.filter(s => s.session_feedback?.length > 0).length > 0
                      ? Math.round(sesiones.filter(s => s.session_feedback?.length > 0).reduce((acc, s) => acc + (s.session_feedback[0]?.cumplimiento || 0), 0) / sesiones.filter(s => s.session_feedback?.length > 0).length) + '%'
                      : '—',
                    label: 'CUMPL.'
                  },
                  {
                    valor: sesiones.filter(s => s.session_feedback?.length > 0).length > 0
                      ? (sesiones.filter(s => s.session_feedback?.length > 0).reduce((acc, s) => acc + (s.session_feedback[0]?.rpe_real || 0), 0) / sesiones.filter(s => s.session_feedback?.length > 0).length).toFixed(1)
                      : '—',
                    label: 'RPE REAL'
                  },
                ].map((m, i) => (
                  <div key={i} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>{m.valor}</p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(sesionesAgrupadas).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {Object.entries(sesionesAgrupadas).map(([key, grupo]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {grupo.label.toUpperCase()}
                      </p>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {grupo.sesiones.length} SESIÓN{grupo.sesiones.length !== 1 ? 'ES' : ''}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {grupo.sesiones.map(sesion => {
                        const feedback = sesion.session_feedback?.[0]
                        const datos = sesion.respuesta_claude
                        const color = sesion.user_locations?.tipo === 'gimnasio' ? '#4f8cff' : sesion.user_locations?.tipo === 'casa' ? '#32c896' : '#ffaa32'

                        return (
                          <div key={sesion.id} className="session-card" onClick={() => setSesionSeleccionada(sesion)}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
                                  <p style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{datos?.titulo || 'Sesión de entrenamiento'}</p>
                                </div>
                                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', paddingLeft: '13px' }}>
                                  {formatearFecha(sesion.fecha)} · {sesion.user_locations?.nombre}
                                </p>
                              </div>
                              {feedback && <span style={{ fontSize: '16px', marginLeft: '8px' }}>{getRatingEmoji(feedback.rating)}</span>}
                            </div>

                            {datos?.objetivo_sesion && (
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', lineHeight: '1.4', paddingLeft: '13px' }}>
                                {datos.objetivo_sesion}
                              </p>
                            )}

                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingLeft: '13px' }}>
                              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: '6px' }}>
                                RPE {sesion.rpe_target}
                              </span>
                              {feedback && (
                                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: feedback.cumplimiento >= 80 ? '#32c896' : 'rgba(255,255,255,0.3)', background: feedback.cumplimiento >= 80 ? 'rgba(50,200,150,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${feedback.cumplimiento >= 80 ? 'rgba(50,200,150,0.2)' : 'rgba(255,255,255,0.07)'}`, padding: '2px 8px', borderRadius: '6px' }}>
                                  {feedback.cumplimiento}% completado
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <p style={{ fontSize: '40px', marginBottom: '16px' }}>📋</p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>NO HAY SESIONES AÚN</p>
              </div>
            )}
          </div>
        )}

      </div>

      <NavBar />
    </div>
  )
}

export default function Historial() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(79,140,255,0.3)', borderTop: '2px solid #4f8cff', borderRadius: '50%' }}></div>
      </div>
    }>
      <HistorialContent />
    </Suspense>
  )
}