'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function Ejecutar() {
  const [sesion, setSesion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [faseActual, setFaseActual] = useState(0)
  const [ejercicioActual, setEjercicioActual] = useState(0)
  const [serieActual, setSerieActual] = useState(1)
  const [estado, setEstado] = useState('ejercicio')
  const [timerSegundos, setTimerSegundos] = useState(0)
  const [timerActivo, setTimerActivo] = useState(false)
  const [demoData, setDemoData] = useState(null)
  const intervalRef = useRef(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    async function cargarSesion() {
      const { data } = await supabase
        .from('sessions')
        .select('respuesta_claude')
        .eq('id', params.id)
        .single()
      if (data) setSesion(data.respuesta_claude)
      setLoading(false)
    }
    cargarSesion()
  }, [])

  const fases = sesion?.fases || []
  const fase = fases[faseActual]
  const ejercicio = fase?.ejercicios?.[ejercicioActual]

  useEffect(() => {
    if (!sesion || !ejercicio?.nombre) return
    setDemoData(null)
    fetch(`/api/ejercicio-gif?nombre=${encodeURIComponent(ejercicio.nombre)}`)
      .then(r => r.json())
      .then(data => setDemoData(data))
      .catch(() => {})
  }, [sesion, faseActual, ejercicioActual])

  useEffect(() => {
    if (timerActivo && timerSegundos > 0) {
      intervalRef.current = setInterval(() => {
        setTimerSegundos(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setTimerActivo(false)
            setEstado('ejercicio')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [timerActivo, timerSegundos])

  function iniciarDescanso(segundos) {
    setTimerSegundos(segundos)
    setTimerActivo(true)
    setEstado('descanso')
  }

  function saltarDescanso() {
    clearInterval(intervalRef.current)
    setTimerActivo(false)
    setTimerSegundos(0)
    setEstado('ejercicio')
  }

  function siguienteEjercicio() {
    if (!sesion) return
    if (serieActual < ejercicio.series) {
      setSerieActual(prev => prev + 1)
      iniciarDescanso(ejercicio.descanso_segundos)
    } else if (ejercicioActual < fase.ejercicios.length - 1) {
      setEjercicioActual(prev => prev + 1)
      setSerieActual(1)
    } else if (faseActual < fases.length - 1) {
      setFaseActual(prev => prev + 1)
      setEjercicioActual(0)
      setSerieActual(1)
    } else {
      setEstado('fin')
    }
  }

  function anteriorEjercicio() {
    if (ejercicioActual > 0) {
      setEjercicioActual(prev => prev - 1)
      setSerieActual(1)
      setEstado('ejercicio')
    } else if (faseActual > 0) {
      const faseAnterior = sesion.fases[faseActual - 1]
      setFaseActual(prev => prev - 1)
      setEjercicioActual(faseAnterior.ejercicios.length - 1)
      setSerieActual(1)
      setEstado('ejercicio')
    }
  }

  function formatearTiempo(seg) {
    const m = Math.floor(seg / 60)
    const s = seg % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function calcularProgreso() {
    if (!sesion) return 0
    let total = 0
    let completados = 0
    sesion.fases.forEach((f, fi) => {
      f.ejercicios.forEach((ej, ei) => {
        total += ej.series
        if (fi < faseActual) completados += ej.series
        else if (fi === faseActual) {
          if (ei < ejercicioActual) completados += ej.series
          else if (ei === ejercicioActual) completados += serieActual - 1
        }
      })
    })
    return Math.round((completados / total) * 100)
  }

  const COLORES_FASE = [
    { color: '#ffaa32', bg: 'rgba(255,160,50,0.1)', border: 'rgba(255,160,50,0.3)', label: '🔥 CALENTAMIENTO' },
    { color: '#4f8cff', bg: 'rgba(79,140,255,0.1)', border: 'rgba(79,140,255,0.3)', label: '⚡ BLOQUE PRINCIPAL' },
    { color: '#32c896', bg: 'rgba(50,200,150,0.1)', border: 'rgba(50,200,150,0.3)', label: '❄️ VUELTA A LA CALMA' },
  ]

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .bg-gradient {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,255,0.2), transparent 70%);
    }
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes timer-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    @keyframes fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .fade-in { animation: fade-in 0.3s ease forwards; }
    .btn-main {
      width: 100%; padding: 18px; border-radius: 16px; border: none; cursor: pointer;
      font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 16px;
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .btn-main:hover { transform: translateY(-2px); }
    .btn-ghost {
      width: 100%; padding: 14px; border-radius: 14px; cursor: pointer;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.5); font-family: 'Space Grotesk', sans-serif;
      font-size: 14px; transition: all 0.2s;
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .nav-btn {
      background: none; border: none; color: rgba(255,255,255,0.3); font-size: 11px;
      cursor: pointer; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.1em;
      padding: 8px; transition: color 0.2s;
    }
    .nav-btn:hover { color: rgba(255,255,255,0.7); }
    .youtube-link {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px;
      border: 1px solid rgba(255,60,60,0.3); background: rgba(255,60,60,0.08);
      color: rgba(255,120,120,0.8); font-family: 'Space Grotesk', sans-serif;
      font-size: 12px; font-weight: 500; text-decoration: none; transition: all 0.2s;
    }
    .youtube-link:hover { background: rgba(255,60,60,0.15); color: #fff; }
  `

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(79,140,255,0.3)', borderTop: '2px solid #4f8cff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  if (!sesion) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>No se encontró la sesión</p>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px', borderRadius: '999px', background: 'linear-gradient(135deg,#4f8cff,#2563ff)', color: '#fff', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
            Volver
          </button>
        </div>
      </div>
    )
  }

  const colorFase = COLORES_FASE[faseActual % COLORES_FASE.length]
  const progreso = calcularProgreso()
  const rir = Math.max(0, 10 - (ejercicio?.rpe_sugerido || 7))
  const esUltimo = faseActual === fases.length - 1 &&
    ejercicioActual === fase?.ejercicios.length - 1 &&
    serieActual === ejercicio?.series

  if (estado === 'fin') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
        <style>{STYLES}</style>
        <div className="bg-gradient"></div>
        <div style={{ textAlign: 'center', maxWidth: '360px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: '56px', marginBottom: '20px' }}>🏆</div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
            SESIÓN COMPLETADA
          </p>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            ¡Excelente trabajo!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginBottom: '36px' }}>
            {sesion.titulo}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => router.push(`/feedback/${params.id}`)}
              style={{ padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8cff,#2563ff)', color: '#fff', fontFamily: 'Space Grotesk, sans-serif', fontWeight: '600', fontSize: '15px', boxShadow: '0 4px 20px rgba(37,99,255,0.4)' }}
            >
              Dar feedback →
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              style={{ padding: '14px', borderRadius: '14px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '14px' }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Space Grotesk, system-ui, sans-serif', color: '#fff' }}>
      <style>{STYLES}</style>
      <div className="bg-gradient"></div>

      {/* BARRA DE PROGRESO */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
          <div style={{
            height: '100%',
            width: `${progreso}%`,
            background: `linear-gradient(90deg, ${colorFase.color}, #4f8cff)`,
            transition: 'width 0.5s ease',
            boxShadow: `0 0 8px ${colorFase.color}`
          }}></div>
        </div>
      </div>

      {/* NAV */}
      <div style={{
        position: 'fixed', top: '3px', left: 0, right: 0, zIndex: 50,
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <button className="nav-btn" onClick={anteriorEjercicio}>← ANTERIOR</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: colorFase.color, letterSpacing: '0.1em' }}>
            {colorFase.label}
          </p>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em', marginTop: '1px' }}>
            {progreso}% COMPLETADO
          </p>
        </div>
        <button className="nav-btn" onClick={() => router.push(`/feedback/${params.id}`)}>SALIR →</button>
      </div>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '76px 16px 40px', position: 'relative', zIndex: 2 }}>

        {estado === 'descanso' ? (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '32px' }}>
              DESCANSO
            </p>

            <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto 28px' }}>
              <svg width="180" height="180" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
                <circle
                  cx="90" cy="90" r="80" fill="none"
                  stroke={colorFase.color} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * (1 - timerSegundos / (ejercicio?.descanso_segundos || 60))}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 8px ${colorFase.color})` }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  fontSize: '44px', fontWeight: '700', letterSpacing: '-0.04em',
                  fontFamily: 'JetBrains Mono, monospace', color: '#fff',
                  animation: 'timer-pulse 1s ease-in-out infinite'
                }}>
                  {formatearTiempo(timerSegundos)}
                </span>
              </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginBottom: '6px' }}>Siguiente</p>
            <p style={{ color: '#fff', fontSize: '18px', fontWeight: '500', letterSpacing: '-0.02em', marginBottom: '36px' }}>
              {ejercicioActual < fase.ejercicios.length - 1
                ? fase.ejercicios[ejercicioActual + 1]?.nombre
                : faseActual < fases.length - 1
                  ? fases[faseActual + 1]?.ejercicios[0]?.nombre
                  : 'Último ejercicio'}
            </p>

            <button
              onClick={saltarDescanso}
              style={{
                padding: '13px 28px', borderRadius: '999px', background: 'transparent',
                border: `1px solid ${colorFase.border}`, color: colorFase.color,
                fontFamily: 'Space Grotesk, sans-serif', fontWeight: '500', fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Saltar descanso →
            </button>
          </div>

        ) : (
          <div className="fade-in">

            {/* Fase + posición */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ padding: '5px 12px', borderRadius: '999px', background: colorFase.bg, border: `1px solid ${colorFase.border}` }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: colorFase.color, letterSpacing: '0.1em' }}>
                  {colorFase.label}
                </span>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                {ejercicioActual + 1}/{fase.ejercicios.length}
              </span>
            </div>

            {/* Nombre */}
            <h1 style={{ fontSize: 'clamp(24px,5vw,36px)', fontWeight: '600', letterSpacing: '-0.03em', lineHeight: '1.1', marginBottom: '16px', color: '#fff' }}>
              {ejercicio?.nombre}
            </h1>

            {/* Demo */}
            {demoData && demoData.youtubeQuery && (
              <div style={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', marginBottom: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: colorFase.bg, border: `1px solid ${colorFase.border}`, display: 'grid', placeItems: 'center', fontSize: '26px', flexShrink: 0 }}>
                  {demoData.muscleEmoji || '💪'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    DEMOSTRACIÓN
                  </p>
                  <a
                    href={'https://www.youtube.com/results?search_query=' + encodeURIComponent(demoData.youtubeQuery + ' exercise tutorial')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="youtube-link"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M10 15V9l5 3-5 3z"/>
                      <path d="M21.593 7.203a2.506 2.506 0 0 0-1.762-1.766C18.265 5.007 12 5 12 5s-6.264-.007-7.831.44a2.56 2.56 0 0 0-1.766 1.763c-.44 1.58-.44 4.8-.44 4.8s0 3.22.44 4.797a2.506 2.506 0 0 0 1.766 1.763c1.567.44 7.831.44 7.831.44s6.265 0 7.831-.44a2.506 2.506 0 0 0 1.762-1.763c.44-1.577.44-4.797.44-4.797s0-3.22-.44-4.797z"/>
                    </svg>
                    Ver tutorial en YouTube
                  </a>
                </div>
              </div>
            )}

            {/* Nota técnica */}
            {ejercicio?.notas && (
              <div style={{ padding: '12px 14px', borderRadius: '12px', background: colorFase.bg, border: `1px solid ${colorFase.border}`, marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5' }}>
                  {ejercicio.notas}
                </p>
              </div>
            )}

            {/* Card serie actual */}
            <div style={{ background: colorFase.bg, border: `1px solid ${colorFase.border}`, borderRadius: '20px', padding: '20px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg,transparent,${colorFase.color}60,transparent)` }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    SERIE
                  </p>
                  <p style={{ fontSize: '44px', fontWeight: '700', letterSpacing: '-0.04em', lineHeight: 1, color: colorFase.color }}>
                    {serieActual}
                    <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.25)', fontWeight: '400' }}>
                      /{ejercicio?.series}
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: '2px' }}>RPE</p>
                    <p style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: 1, color: colorFase.color }}>{ejercicio?.rpe_sugerido}</p>
                  </div>
                  <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.15)', lineHeight: 1, marginBottom: '2px' }}>·</p>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: '2px' }}>RIR</p>
                    <p style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.03em', lineHeight: 1, color: colorFase.color }}>{rir}</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'REPS', valor: ejercicio?.repeticiones },
                  { label: 'DESCANSO', valor: `${ejercicio?.descanso_segundos}s` },
                ].map((d, i) => (
                  <div key={i} style={{ padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: '4px' }}>
                      {d.label}
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>
                      {d.valor}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Indicadores series */}
            <div style={{ display: 'flex', gap: '5px', marginBottom: '24px' }}>
              {Array.from({ length: ejercicio?.series || 0 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '4px', flex: 1, borderRadius: '2px',
                    background: i < serieActual - 1
                      ? colorFase.color
                      : i === serieActual - 1
                        ? `${colorFase.color}50`
                        : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s',
                    boxShadow: i < serieActual - 1 ? `0 0 6px ${colorFase.color}` : 'none'
                  }}
                ></div>
              ))}
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn-main"
                onClick={siguienteEjercicio}
                style={{ background: 'linear-gradient(135deg,#4f8cff,#2563ff)', color: '#fff', boxShadow: '0 4px 20px rgba(37,99,255,0.4)' }}
              >
                {esUltimo
                  ? '🏆 Finalizar sesión'
                  : serieActual < (ejercicio?.series || 0)
                    ? `Serie completada → Descanso ${ejercicio?.descanso_segundos}s`
                    : 'Siguiente ejercicio →'}
              </button>
              {serieActual < (ejercicio?.series || 0) && (
                <button className="btn-ghost" onClick={siguienteEjercicio}>
                  Saltar descanso
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}