'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Generate() {
  const [loading, setLoading] = useState(true)
  const [sesion, setSesion] = useState(null)
  const [sesionId, setSesionId] = useState(null)
  const [error, setError] = useState(null)
  const [regenerando, setRegenerando] = useState(null)
  const [faseAbierta, setFaseAbierta] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function generarSesion() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        })
        const data = await res.json()
        if (data.error) setError(data.error)
        else { setSesion(data.sesion); setSesionId(data.sesionId) }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    generarSesion()
  }, [])

  async function regenerarEjercicio(faseIndex, ejercicioIndex) {
    const key = `${faseIndex}-${ejercicioIndex}`
    setRegenerando(key)

    const ejercicioActual = sesion.fases[faseIndex].ejercicios[ejercicioIndex]
    const fase = sesion.fases[faseIndex]

    try {
      const res = await fetch('/api/regenerar-ejercicio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ejercicioActual: ejercicioActual.nombre,
          faseName: fase.nombre,
          rpeTarget: ejercicioActual.rpe_sugerido,
          series: ejercicioActual.series,
          repeticiones: ejercicioActual.repeticiones,
          sesionId,
          contexto: sesion.objetivo_sesion
        })
      })
      const data = await res.json()
      if (data.ejercicio) {
        setSesion(prev => {
          const nuevaSesion = JSON.parse(JSON.stringify(prev))
          nuevaSesion.fases[faseIndex].ejercicios[ejercicioIndex] = data.ejercicio
          return nuevaSesion
        })
      }
    } catch (err) {
      console.error('Error regenerando:', err)
    } finally {
      setRegenerando(null)
    }
  }

  const COLORES_FASE = [
    { bg: 'rgba(255,160,50,0.08)', border: 'rgba(255,160,50,0.25)', tag: '#ffaa32', label: '🔥 CALENTAMIENTO' },
    { bg: 'rgba(79,140,255,0.08)', border: 'rgba(79,140,255,0.28)', tag: '#4f8cff', label: '⚡ BLOQUE PRINCIPAL' },
    { bg: 'rgba(50,200,150,0.08)', border: 'rgba(50,200,150,0.25)', tag: '#32c896', label: '❄️ VUELTA A LA CALMA' },
  ]

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .bg-gradient { position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,255,0.25), transparent 70%); }
    .nav-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between;
      backdrop-filter: blur(20px); background: rgba(0,0,0,0.75);
      border-bottom: 1px solid rgba(255,255,255,0.06); }
    .ejercicio-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px; padding: 14px; transition: all 0.2s; position: relative; }
    .ejercicio-card:hover { border-color: rgba(255,255,255,0.12); }
    .fase-header { display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-radius: 14px; cursor: pointer; transition: background 0.2s; }
    .fase-header:hover { background: rgba(255,255,255,0.03); }
    .btn-primary { width: 100%; padding: 16px; border-radius: 14px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #4f8cff, #2563ff); color: #fff;
      font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px;
      transition: all 0.2s; box-shadow: 0 4px 20px rgba(37,99,255,0.35); }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(37,99,255,0.45); }
    .btn-secondary { width: 100%; padding: 14px; border-radius: 14px; cursor: pointer;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.5); font-family: 'Space Grotesk', sans-serif;
      font-size: 14px; transition: all 0.2s; }
    .btn-secondary:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .regen-btn { width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05); display: grid; place-items: center;
      cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
    .regen-btn:hover { border-color: rgba(79,140,255,0.4); background: rgba(79,140,255,0.1); }
    @keyframes spin { to { transform: rotate(360deg) } }
    @keyframes regen-spin { to { transform: rotate(360deg) } }
    @keyframes fade-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    .fade-in { animation: fade-in 0.3s ease forwards; }
  `

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
        <div style={{ position: 'relative', width: '60px', height: '60px' }}>
          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(79,140,255,0.15)', borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', inset: 0, border: '2px solid transparent', borderTopColor: '#4f8cff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <div style={{ position: 'absolute', inset: '14px', background: 'rgba(79,140,255,0.1)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#7ab6ff', fontSize: '16px' }}>✦</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: '16px', fontWeight: '500', marginBottom: '6px' }}>Diseñando tu sesión</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', animation: 'pulse 2s ease-in-out infinite' }}>ANALIZANDO TUS SEÑALES DEL DÍA</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', marginBottom: '10px' }}>ERROR</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>{error}</p>
          <button onClick={() => router.push('/dashboard')} style={{ padding: '14px 28px', borderRadius: '999px', background: 'linear-gradient(135deg,#4f8cff,#2563ff)', color: '#fff', fontWeight: '600', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Space Grotesk, system-ui, sans-serif', color: '#fff', paddingBottom: '40px' }}>
      <style>{STYLES}</style>
      <div className="bg-gradient"></div>

      {/* NAV */}
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7ab6ff"/><stop offset="100%" stopColor="#2563ff"/></linearGradient></defs>
            <path d="M6 6 L16 16 L6 26" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="22" cy="16" r="3.2" fill="url(#lg)"/>
          </svg>
          <span style={{ fontWeight: '700', fontSize: '17px', letterSpacing: '-0.02em', color: '#fff' }}>Pyfit<span style={{ color: '#7ab6ff' }}>.</span></span>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
          ← INICIO
        </button>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '72px 16px 40px', position: 'relative', zIndex: 2 }}>

        {/* HEADER SESIÓN */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 12px', borderRadius: '999px', background: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)', marginBottom: '14px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4f8cff', boxShadow: '0 0 6px #4f8cff', display: 'inline-block' }}></span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#7ab6ff', letterSpacing: '0.1em' }}>SESIÓN GENERADA POR IA</span>
          </div>
          <h1 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: '600', letterSpacing: '-0.03em', lineHeight: '1.15', marginBottom: '8px', color: '#fff' }}>
            {sesion.titulo}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: '1.5' }}>{sesion.objetivo_sesion}</p>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { valor: sesion.duracion_total, unidad: 'min', label: 'DURACIÓN' },
            { valor: sesion.rpe_target, unidad: '/10', label: 'RPE' },
            { valor: `RIR ${10 - sesion.rpe_target}`, unidad: '', label: 'RESERVA' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 10px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)' }}></div>
              <p style={{ fontSize: '20px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
                {s.valor}<span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>{s.unidad}</span>
              </p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* NOTA DEL ENTRENADOR */}
        {sesion.nota_del_entrenador && (
          <div style={{ background: 'rgba(79,140,255,0.06)', border: '1px solid rgba(79,140,255,0.18)', borderRadius: '16px', padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '9px', background: 'linear-gradient(135deg,#4f8cff,#6ce5ff)', display: 'grid', placeItems: 'center', color: '#050a1a', fontWeight: '700', fontSize: '12px', flexShrink: 0 }}>✦</div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.55' }}>
              {sesion.nota_del_entrenador.length > 180
                ? sesion.nota_del_entrenador.slice(0, 180).trim() + '…'
                : sesion.nota_del_entrenador}
            </p>
          </div>
        )}

        {/* FASES */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '12px' }}>PROGRAMA</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sesion.fases?.map((fase, fi) => {
              const color = COLORES_FASE[fi % COLORES_FASE.length]
              const abierta = faseAbierta === fi
              return (
                <div key={fi} style={{ background: color.bg, border: `1px solid ${color.border}`, borderRadius: '18px', overflow: 'hidden' }}>
                  <div className="fase-header" onClick={() => setFaseAbierta(abierta ? null : fi)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: `${color.tag}18`, border: `1px solid ${color.tag}35`, display: 'grid', placeItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: color.tag, fontWeight: '600', flexShrink: 0 }}>
                        {fi + 1}
                      </div>
                      <div>
                        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: color.tag, letterSpacing: '0.1em', marginBottom: '2px' }}>{color.label}</p>
                        <p style={{ fontSize: '14px', fontWeight: '500', color: '#fff' }}>{fase.nombre}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>{fase.duracion_minutos} MIN</span>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', transition: 'transform 0.3s', display: 'inline-block', transform: abierta ? 'rotate(180deg)' : 'none' }}>⌄</span>
                    </div>
                  </div>

                  {abierta && (
                    <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {fase.ejercicios?.map((ej, ei) => {
                        const regenKey = `${fi}-${ei}`
                        const isRegenerando = regenerando === regenKey
                        const rir = Math.max(0, 10 - (ej.rpe_sugerido || 7))
                        return (
                          <div key={ei} className={`ejercicio-card fade-in`}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
                              <p style={{ fontSize: '14px', fontWeight: '500', color: '#fff', flex: 1, lineHeight: '1.3' }}>{ej.nombre}</p>
                              <button
                                className="regen-btn"
                                onClick={() => !isRegenerando && regenerarEjercicio(fi, ei)}
                                title="Cambiar ejercicio"
                                style={{ opacity: isRegenerando ? 0.5 : 1 }}
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isRegenerando ? '#4f8cff' : 'rgba(255,255,255,0.5)'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isRegenerando ? 'regen-spin 0.8s linear infinite' : 'none' }}>
                                  <polyline points="23 4 23 10 17 10"/>
                                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                </svg>
                              </button>
                            </div>

                            {/* Métricas */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: ej.notas ? '10px' : '0' }}>
                              {[
                                { label: `${ej.series} series` },
                                { label: ej.repeticiones },
                                { label: `${ej.descanso_segundos}s desc.` },
                                { label: `RPE ${ej.rpe_sugerido}`, color: color.tag },
                                { label: `RIR ${rir}`, color: color.tag },
                              ].map((m, mi) => (
                                <span key={mi} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: m.color || 'rgba(255,255,255,0.4)', background: m.color ? `${m.color}12` : 'rgba(255,255,255,0.05)', border: `1px solid ${m.color ? `${m.color}25` : 'rgba(255,255,255,0.07)'}`, padding: '3px 8px', borderRadius: '6px' }}>
                                  {m.label}
                                </span>
                              ))}
                            </div>

                            {ej.notas && (
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', lineHeight: '1.5', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>{ej.notas}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* BOTONES */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button className="btn-primary" onClick={() => router.push(`/ejecutar/${sesionId}`)}>
            ▶ Ejecutar sesión →
          </button>
          <button className="btn-secondary" onClick={() => router.push(`/feedback/${sesionId}`)}>
            Marcar como completada sin ejecutar
          </button>
        </div>

      </div>
    </div>
  )
}