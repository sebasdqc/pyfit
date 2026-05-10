'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NavBar from '../components/NavBar'

function MiniBarChart({ data, color, maxVal }) {
  const max = maxVal || Math.max(...data.map(d => d.valor), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            background: d.highlight
              ? `linear-gradient(180deg, ${color}, ${color}88)`
              : `${color}33`,
            height: `${Math.max((d.valor / max) * 100, d.valor > 0 ? 8 : 0)}%`,
            minHeight: d.valor > 0 ? '4px' : '0',
            transition: 'height 0.5s ease',
            border: d.highlight ? `1px solid ${color}` : 'none',
            boxShadow: d.highlight ? `0 0 8px ${color}66` : 'none'
          }} />
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function LineChart({ data, color }) {
  if (!data || data.length < 2) return (
    <div style={{ height: '60px', display: 'grid', placeItems: 'center' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>INSUFICIENTES DATOS</span>
    </div>
  )

  const max = Math.max(...data.map(d => d.valor), 10)
  const min = Math.min(...data.map(d => d.valor), 0)
  const range = max - min || 1
  const w = 300; const h = 60; const pad = 4

  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - ((d.valor - min) / range) * (h - pad * 2)
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '60px' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`}/>
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }}/>
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.8"/>
      ))}
    </svg>
  )
}

function GaugeCircle({ porcentaje, color, label, sublabel, size = 110 }) {
  const radio = (size - 14) / 2
  const circunferencia = 2 * Math.PI * radio
  const offset = circunferencia - (Math.min(porcentaje, 100) / 100) * circunferencia

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={radio} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
          <circle cx={size/2} cy={size/2} r={radio} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circunferencia} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s ease', filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
          <span style={{ fontSize: '20px', fontWeight: '700', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>{Math.round(porcentaje)}%</span>
          {sublabel && <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>{sublabel}</span>}
        </div>
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center' }}>{label}</span>
    </div>
  )
}

export default function Estadisticas() {
  const [perfil, setPerfil] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [seccion, setSeccion] = useState('rendimiento')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const [{ data: p }, { data: s }, { data: c }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('sessions').select('*, session_feedback(*), daily_checkin(estado_animo, calidad_sueno, hrv, foco_entrenamiento, dolor_hoy)').eq('user_id', user.id).order('fecha', { ascending: true }),
        supabase.from('daily_checkin').select('*').eq('user_id', user.id).order('fecha', { ascending: true })
      ])

      setPerfil(p)
      setSesiones(s || [])
      setCheckins(c || [])
      setLoading(false)
    }
    cargar()
  }, [])

  // Calcular métricas
  const conFeedback = sesiones.filter(s => s.session_feedback?.length > 0)
  const ultimas8Semanas = (() => {
    const semanas = []
    const hoy = new Date()
    for (let i = 7; i >= 0; i--) {
      const inicio = new Date(hoy)
      inicio.setDate(hoy.getDate() - i * 7 - 6)
      inicio.setHours(0, 0, 0, 0)
      const fin = new Date(hoy)
      fin.setDate(hoy.getDate() - i * 7)
      fin.setHours(23, 59, 59, 999)
      const sessSemana = sesiones.filter(s => {
        const f = new Date(s.fecha)
        return f >= inicio && f <= fin
      })
      const label = `S${8 - i}`
      semanas.push({
        label,
        sesiones: sessSemana.length,
        volumen: sessSemana.reduce((acc, s) => {
          const fases = s.respuesta_claude?.fases || []
          return acc + fases.reduce((a, f) => a + (f.ejercicios?.reduce((b, e) => b + (e.series || 0), 0) || 0), 0)
        }, 0),
        cumplimiento: sessSemana.filter(s => s.session_feedback?.length > 0).length > 0
          ? Math.round(sessSemana.filter(s => s.session_feedback?.length > 0).reduce((acc, s) => acc + (s.session_feedback[0]?.cumplimiento || 0), 0) / sessSemana.filter(s => s.session_feedback?.length > 0).length)
          : 0,
        rpeReal: sessSemana.filter(s => s.session_feedback?.length > 0).length > 0
          ? parseFloat((sessSemana.filter(s => s.session_feedback?.length > 0).reduce((acc, s) => acc + (s.session_feedback[0]?.rpe_real || 0), 0) / sessSemana.filter(s => s.session_feedback?.length > 0).length).toFixed(1))
          : 0,
        highlight: i === 0
      })
    }
    return semanas
  })()

  const rpeData = conFeedback.slice(-10).map((s, i) => ({
    valor: s.session_feedback[0]?.rpe_real || 0,
    label: `${i + 1}`
  }))

  const suenoProm = checkins.length > 0
    ? (checkins.reduce((acc, c) => acc + (c.calidad_sueno || 0), 0) / checkins.length).toFixed(1)
    : null

  const cumplimientoProm = conFeedback.length > 0
    ? Math.round(conFeedback.reduce((acc, s) => acc + (s.session_feedback[0]?.cumplimiento || 0), 0) / conFeedback.length)
    : 0

  const rpeProm = conFeedback.length > 0
    ? parseFloat((conFeedback.reduce((acc, s) => acc + (s.session_feedback[0]?.rpe_real || 0), 0) / conFeedback.length).toFixed(1))
    : 0

  const rpeObj = sesiones.length > 0
    ? parseFloat((sesiones.reduce((acc, s) => acc + (s.rpe_target || 0), 0) / sesiones.length).toFixed(1))
    : 0

  const volumenTotal = sesiones.reduce((acc, s) => {
    const fases = s.respuesta_claude?.fases || []
    return acc + fases.reduce((a, f) => a + (f.ejercicios?.reduce((b, e) => b + (e.series || 0), 0) || 0), 0)
  }, 0)

  const ultimas72h = sesiones.filter(s => (new Date() - new Date(s.fecha)) / (1000 * 60 * 60) <= 72)
  const fatiga = Math.min(Math.round((ultimas72h.length / 3) * 100), 100)

  const distribucionFoco = (() => {
    const map = {}
    checkins.forEach(c => {
      if (c.foco_entrenamiento) {
        c.foco_entrenamiento.forEach(f => {
          map[f] = (map[f] || 0) + 1
        })
      }
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
  })()

  const alertas = (() => {
    const lista = []
    if (fatiga >= 80) lista.push({ tipo: 'riesgo', msg: 'Fatiga alta detectada — considera un día de descanso activo', icon: '⚠️' })
    if (suenoProm && parseFloat(suenoProm) < 6.5) lista.push({ tipo: 'riesgo', msg: `Promedio de sueño bajo (${suenoProm}h) — el sueño impacta directamente la recuperación muscular`, icon: '😴' })
    if (rpeProm > 8.5 && conFeedback.length >= 3) lista.push({ tipo: 'riesgo', msg: 'RPE promedio elevado en últimas sesiones — riesgo de sobreentrenamiento', icon: '🔴' })
    if (perfil?.lesiones && fatiga >= 60) lista.push({ tipo: 'precaucion', msg: `Tienes lesiones registradas (${perfil.lesiones}) — modera la intensidad con fatiga moderada-alta`, icon: '🩹' })
    if (cumplimientoProm >= 85 && fatiga < 60) lista.push({ tipo: 'bien', msg: 'Excelente adherencia y fatiga controlada — momento ideal para progresar', icon: '✅' })
    if (sesiones.length >= 5 && fatiga < 40) lista.push({ tipo: 'bien', msg: 'Recuperación óptima — puedes aumentar el volumen esta semana', icon: '💪' })
    return lista
  })()

  const estaSemana = sesiones.filter(s => (new Date() - new Date(s.fecha)) / (1000 * 60 * 60 * 24) <= 7)
  const semanaAnterior = sesiones.filter(s => {
    const dias = (new Date() - new Date(s.fecha)) / (1000 * 60 * 60 * 24)
    return dias > 7 && dias <= 14
  })

  const SECCIONES = [
    { id: 'rendimiento', label: 'Rendimiento' },
    { id: 'carga', label: 'Carga' },
    { id: 'prevencion', label: 'Prevención' },
    { id: 'progresion', label: 'Progresión' },
  ]

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
        .seccion-btn {
          padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 0.08em;
          text-transform: uppercase; transition: all 0.2s; white-space: nowrap;
        }
        .seccion-btn.active { background: rgba(79,140,255,0.2); color: #4f8cff; }
        .seccion-btn.inactive { background: transparent; color: rgba(255,255,255,0.3); }
        .alerta-card {
          padding: 12px 14px; border-radius: 14px; display: flex; align-items: flex-start; gap: 10px;
        }
        .stat-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .stat-row:last-child { border-bottom: none; }
      `}</style>

      <div className="bg-gradient"></div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 16px', position: 'relative', zIndex: 2 }}>

        {/* HEADER */}
        <div style={{ padding: '56px 0 24px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>ESTADÍSTICAS</p>
          <h1 style={{ fontSize: '26px', fontWeight: '600', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
            Tu <span style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', color: '#7ab6ff' }}>rendimiento</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
            {sesiones.length} sesiones · {checkins.length} check-ins registrados
          </p>
        </div>

        {/* TABS DE SECCIÓN */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px', scrollbarWidth: 'none' }}>
          {SECCIONES.map(s => (
            <button key={s.id} className={`seccion-btn ${seccion === s.id ? 'active' : 'inactive'}`} onClick={() => setSeccion(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── RENDIMIENTO ── */}
        {seccion === 'rendimiento' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* RPE Real vs Objetivo */}
            <div className="card">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>RPE REAL VS OBJETIVO</p>
              {conFeedback.length >= 2 ? (
                <>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '28px', fontWeight: '600', color: '#4f8cff', letterSpacing: '-0.03em', lineHeight: 1 }}>{rpeProm}</p>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>REAL PROM.</p>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.07)' }} />
                    <div>
                      <p style={{ fontSize: '28px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.03em', lineHeight: 1 }}>{rpeObj}</p>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>OBJETIVO PROM.</p>
                    </div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: Math.abs(rpeProm - rpeObj) <= 0.5 ? '#32c896' : Math.abs(rpeProm - rpeObj) <= 1 ? '#ffaa32' : '#ff6464' }}>
                        {rpeProm > rpeObj ? '+' : ''}{(rpeProm - rpeObj).toFixed(1)}
                      </p>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', marginTop: '3px' }}>DIFERENCIA</p>
                    </div>
                  </div>
                  <LineChart data={rpeData} color="#4f8cff" />
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.2)', marginTop: '6px', letterSpacing: '0.04em' }}>ÚLTIMAS {rpeData.length} SESIONES</p>
                </>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Necesitas al menos 2 sesiones con feedback</p>
              )}
            </div>

            {/* Cumplimiento semanal */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>CUMPLIMIENTO · 8 SEMANAS</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: '600', color: cumplimientoProm >= 80 ? '#32c896' : cumplimientoProm >= 60 ? '#ffaa32' : '#ff6464' }}>{cumplimientoProm}%</p>
              </div>
              <MiniBarChart
                data={ultimas8Semanas.map(s => ({ valor: s.cumplimiento, label: s.label, highlight: s.highlight }))}
                color="#32c896"
              />
            </div>

            {/* Stats rápidas */}
            <div className="card">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>RESUMEN GENERAL</p>
              {[
                { label: 'Total sesiones', valor: sesiones.length, color: '#fff' },
                { label: 'Sesiones con feedback', valor: conFeedback.length, color: '#fff' },
                { label: 'Mejor racha', valor: `${perfil?.mejor_racha || 0} días`, color: '#ffaa32' },
                { label: 'Sueño promedio', valor: suenoProm ? `${suenoProm}h` : '—', color: suenoProm && parseFloat(suenoProm) >= 7 ? '#32c896' : '#ffaa32' },
              ].map((s, i) => (
                <div key={i} className="stat-row">
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: '600', color: s.color }}>{s.valor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CARGA ── */}
        {seccion === 'carga' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Círculos fatiga + volumen */}
            <div className="card">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '20px' }}>ESTADO ACTUAL</p>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <GaugeCircle
                  porcentaje={fatiga}
                  color={fatiga >= 80 ? '#ff4444' : fatiga >= 50 ? '#ffaa32' : '#32c896'}
                  label="Fatiga 72h"
                  sublabel={fatiga >= 80 ? 'ALTO' : fatiga >= 50 ? 'MEDIO' : 'BAJO'}
                />
                <GaugeCircle
                  porcentaje={Math.min(Math.round((estaSemana.length / (perfil?.dias_semana || 3)) * 100), 100)}
                  color="#4f8cff"
                  label="Vol. semanal"
                  sublabel={`${estaSemana.length}/${perfil?.dias_semana || 3} días`}
                />
              </div>
            </div>

            {/* Volumen en series */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>VOLUMEN EN SERIES · 8 SEMANAS</p>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: '600', color: '#7ab6ff' }}>{volumenTotal} total</p>
              </div>
              <MiniBarChart
                data={ultimas8Semanas.map(s => ({ valor: s.volumen, label: s.label, highlight: s.highlight }))}
                color="#7ab6ff"
              />
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '8px', letterSpacing: '0.04em' }}>
                ESTA SEMANA: {ultimas8Semanas[7]?.volumen || 0} SERIES · SEMANA ANTERIOR: {ultimas8Semanas[6]?.volumen || 0} SERIES
              </p>
            </div>

            {/* Sesiones por semana */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SESIONES POR SEMANA</p>
              </div>
              <MiniBarChart
                data={ultimas8Semanas.map(s => ({ valor: s.sesiones, label: s.label, highlight: s.highlight }))}
                color="#4f8cff"
                maxVal={perfil?.dias_semana || 5}
              />
            </div>

            {/* Distribución de foco muscular */}
            {distribucionFoco.length > 0 && (
              <div className="card">
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>DISTRIBUCIÓN DE FOCO MUSCULAR</p>
                {distribucionFoco.map(([foco, count], i) => {
                  const max = distribucionFoco[0][1]
                  const pct = Math.round((count / max) * 100)
                  const colores = ['#4f8cff', '#7ab6ff', '#32c896', '#ffaa32', '#ff8c32', '#a855f7']
                  return (
                    <div key={i} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', textTransform: 'capitalize' }}>{foco.replace('_', ' ')}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: colores[i] }}>{count}x</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colores[i], borderRadius: '2px', boxShadow: `0 0 6px ${colores[i]}66`, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Tendencia sueño */}
            {checkins.length >= 3 && (
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TENDENCIA DE SUEÑO</p>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px', fontWeight: '600', color: suenoProm && parseFloat(suenoProm) >= 7 ? '#32c896' : '#ffaa32' }}>
                    {suenoProm}h prom.
                  </p>
                </div>
                <LineChart
                  data={checkins.slice(-10).map((c, i) => ({ valor: c.calidad_sueno || 0, label: `${i + 1}` }))}
                  color="#a855f7"
                />
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>ÚLTIMOS 10 CHECK-INS</p>
              </div>
            )}
          </div>
        )}

        {/* ── PREVENCIÓN ── */}
        {seccion === 'prevencion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Alertas */}
            <div className="card">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
                ALERTAS Y RECOMENDACIONES
              </p>
              {alertas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {alertas.map((a, i) => (
                    <div key={i} className="alerta-card" style={{
                      background: a.tipo === 'riesgo' ? 'rgba(255,80,80,0.08)' : a.tipo === 'precaucion' ? 'rgba(255,170,50,0.08)' : 'rgba(50,200,150,0.08)',
                      border: `1px solid ${a.tipo === 'riesgo' ? 'rgba(255,80,80,0.2)' : a.tipo === 'precaucion' ? 'rgba(255,170,50,0.2)' : 'rgba(50,200,150,0.2)'}`
                    }}>
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>{a.icon}</span>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.45' }}>{a.msg}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ fontSize: '28px', marginBottom: '8px' }}>✅</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Sin alertas activas</p>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '4px' }}>Necesitas más datos para generar recomendaciones</p>
                </div>
              )}
            </div>

            {/* Lesiones registradas */}
            <div className="card">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>PERFIL DE RIESGO</p>
              {[
                { label: 'Lesiones declaradas', valor: perfil?.lesiones || 'Ninguna', color: perfil?.lesiones ? '#ffaa32' : '#32c896' },
                { label: 'Fatiga actual', valor: fatiga >= 80 ? 'Alta ⚠️' : fatiga >= 50 ? 'Moderada' : 'Baja ✓', color: fatiga >= 80 ? '#ff6464' : fatiga >= 50 ? '#ffaa32' : '#32c896' },
                { label: 'Sueño promedio', valor: suenoProm ? `${suenoProm}h` : '—', color: suenoProm && parseFloat(suenoProm) >= 7 ? '#32c896' : '#ffaa32' },
                { label: 'Nivel de estrés habitual', valor: perfil?.nivel_estres || '—', color: perfil?.nivel_estres === 'alto' ? '#ff6464' : perfil?.nivel_estres === 'moderado' ? '#ffaa32' : '#32c896' },
              ].map((s, i) => (
                <div key={i} className="stat-row">
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: '600', color: s.color, textAlign: 'right', maxWidth: '55%' }}>{s.valor}</span>
                </div>
              ))}
            </div>

            {/* Zonas de riesgo */}
            <div className="card" style={{ background: 'rgba(255,80,80,0.04)', borderColor: 'rgba(255,80,80,0.12)' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,120,120,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>SEÑALES DE SOBREENTRENAMIENTO</p>
              {[
                { señal: 'RPE real consistentemente > 8.5', activa: rpeProm > 8.5 },
                { señal: 'Más de 2 sesiones en 72h', activa: ultimas72h.length >= 2 },
                { señal: 'Sueño promedio < 6.5h', activa: suenoProm && parseFloat(suenoProm) < 6.5 },
                { señal: 'Cumplimiento cayendo semana a semana', activa: ultimas8Semanas[7]?.cumplimiento < ultimas8Semanas[6]?.cumplimiento && ultimas8Semanas[6]?.cumplimiento < ultimas8Semanas[5]?.cumplimiento },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.activa ? '#ff4444' : '#32c896', flexShrink: 0, boxShadow: s.activa ? '0 0 6px #ff4444' : 'none' }} />
                  <span style={{ fontSize: '13px', color: s.activa ? 'rgba(255,180,180,0.8)' : 'rgba(255,255,255,0.35)' }}>{s.señal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROGRESIÓN ── */}
        {seccion === 'progresion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Esta semana vs anterior */}
            <div className="card">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>ESTA SEMANA VS ANTERIOR</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  {
                    label: 'Sesiones',
                    actual: estaSemana.length,
                    anterior: semanaAnterior.length,
                    formato: (v) => v
                  },
                  {
                    label: 'Volumen (series)',
                    actual: ultimas8Semanas[7]?.volumen || 0,
                    anterior: ultimas8Semanas[6]?.volumen || 0,
                    formato: (v) => v
                  },
                  {
                    label: 'Cumplimiento',
                    actual: ultimas8Semanas[7]?.cumplimiento || 0,
                    anterior: ultimas8Semanas[6]?.cumplimiento || 0,
                    formato: (v) => `${v}%`
                  },
                  {
                    label: 'RPE real',
                    actual: ultimas8Semanas[7]?.rpeReal || 0,
                    anterior: ultimas8Semanas[6]?.rpeReal || 0,
                    formato: (v) => v || '—',
                    invertir: true
                  },
                ].map((m, i) => {
                  const diff = m.actual - m.anterior
                  const positivo = m.invertir ? diff <= 0 : diff >= 0
                  const color = diff === 0 ? 'rgba(255,255,255,0.4)' : positivo ? '#32c896' : '#ff6464'
                  return (
                    <div key={i} style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginBottom: '8px' }}>{m.label.toUpperCase()}</p>
                      <p style={{ fontSize: '22px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>{m.formato(m.actual)}</p>
                      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color }}>
                        {diff > 0 ? '+' : ''}{m.formato(diff)} vs ant.
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Nivel y racha */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255,170,50,0.1), rgba(255,100,0,0.05))', borderColor: 'rgba(255,170,50,0.2)' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,170,50,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>NIVEL Y RACHA</p>
              {(() => {
                const NIVELES = [
                  { nombre: 'Rookie', min: 0, max: 5 },
                  { nombre: 'Atleta', min: 5, max: 15 },
                  { nombre: 'Élite', min: 15, max: 30 },
                  { nombre: 'Leyenda', min: 30, max: 9999 },
                ]
                const nivel = NIVELES.find(n => sesiones.length >= n.min && sesiones.length < n.max) || NIVELES[0]
                const siguiente = NIVELES[NIVELES.indexOf(nivel) + 1]
                const progreso = siguiente ? ((sesiones.length - nivel.min) / (siguiente.min - nivel.min)) * 100 : 100
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <p style={{ fontSize: '20px', fontWeight: '600', color: '#ffaa32', letterSpacing: '-0.02em' }}>{nivel.nombre}</p>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{sesiones.length} SESIONES</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '20px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em' }}>{perfil?.racha_actual || 0} días</p>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>RACHA ACTUAL</p>
                      </div>
                    </div>
                    {siguiente && (
                      <>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ height: '100%', width: `${Math.min(progreso, 100)}%`, background: 'linear-gradient(90deg, #ffaa32, #ff6400)', borderRadius: '2px', boxShadow: '0 0 8px rgba(255,170,50,0.5)' }} />
                        </div>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>
                          {siguiente.min - sesiones.length} SESIONES PARA {siguiente.nombre.toUpperCase()}
                        </p>
                      </>
                    )}
                  </>
                )
              })()}
            </div>

            {/* Proyección */}
            <div className="card">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>PROYECCIÓN A 4 SEMANAS</p>
              {(() => {
                const promSemanal = sesiones.length > 0 ? sesiones.length / Math.max(1, Math.ceil((new Date() - new Date(sesiones[0]?.fecha)) / (1000 * 60 * 60 * 24 * 7))) : 0
                const proyectadas = Math.round(promSemanal * 4)
                const totalProyectado = sesiones.length + proyectadas
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.15)', textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontWeight: '600', color: '#4f8cff', letterSpacing: '-0.02em' }}>{proyectadas}</p>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>SESIONES PROYECTADAS</p>
                      </div>
                      <div style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'rgba(50,200,150,0.08)', border: '1px solid rgba(50,200,150,0.15)', textAlign: 'center' }}>
                        <p style={{ fontSize: '24px', fontWeight: '600', color: '#32c896', letterSpacing: '-0.02em' }}>{totalProyectado}</p>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>TOTAL ACUMULADO</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.5', textAlign: 'center' }}>
                      Basado en un promedio de {promSemanal.toFixed(1)} sesiones por semana
                    </p>
                  </div>
                )
              })()}
            </div>

          </div>
        )}

      </div>

      <NavBar />
    </div>
  )
}