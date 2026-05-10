'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const FOCOS = [
  { id: 'pecho', label: 'Pecho', emoji: '💪' },
  { id: 'espalda', label: 'Espalda', emoji: '🔙' },
  { id: 'hombros', label: 'Hombros', emoji: '🏋️' },
  { id: 'biceps', label: 'Bíceps', emoji: '💪' },
  { id: 'triceps', label: 'Tríceps', emoji: '💪' },
  { id: 'cuadriceps', label: 'Cuádriceps', emoji: '🦵' },
  { id: 'femoral', label: 'Femoral', emoji: '🦵' },
  { id: 'gluteos', label: 'Glúteos', emoji: '🍑' },
  { id: 'core', label: 'Core', emoji: '🎯' },
  { id: 'cuerpo_completo', label: 'Cuerpo completo', emoji: '⚡' },
  { id: 'cardio', label: 'Cardio', emoji: '🏃' },
  { id: 'movilidad', label: 'Movilidad', emoji: '🧘' },
  { id: 'fuerza', label: 'Fuerza', emoji: '🏆' },
  { id: 'libre', label: 'Lo que toque', emoji: '🎲' },
]

const ANIMOS = [
  { valor: 1, emoji: '😩', label: 'Pésimo' },
  { valor: 2, emoji: '😕', label: 'Mal' },
  { valor: 3, emoji: '😐', label: 'Regular' },
  { valor: 4, emoji: '😊', label: 'Bien' },
  { valor: 5, emoji: '🔥', label: 'Excelente' },
]

export default function CheckIn() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [ubicaciones, setUbicaciones] = useState([])
  const [yaHizoCheckin, setYaHizoCheckin] = useState(false)

  const [estadoAnimo, setEstadoAnimo] = useState(null)
  const [calidadSueno, setCalidadSueno] = useState(7)
  const [hrv, setHrv] = useState('')
  const [locationId, setLocationId] = useState(null)
  const [duracion, setDuracion] = useState(60)
  const [notas, setNotas] = useState('')
  const [focoEntrenamiento, setFocoEntrenamiento] = useState([])
  const [dolorHoy, setDolorHoy] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const hoy = new Date().toISOString().split('T')[0]
      const { data: checkinExistente } = await supabase.from('daily_checkin').select('id').eq('user_id', user.id).eq('fecha', hoy).single()
      if (checkinExistente) { setYaHizoCheckin(true); setLoading(false); return }
      const { data: locs } = await supabase.from('user_locations').select('*').eq('user_id', user.id)
      if (locs && locs.length > 0) { setUbicaciones(locs); setLocationId(locs[0].id) }
      setLoading(false)
    }
    cargarDatos()
  }, [])

  function toggleFoco(id) {
    if (id === 'libre') { setFocoEntrenamiento(['libre']); return }
    setFocoEntrenamiento(prev => {
      const sinLibre = prev.filter(f => f !== 'libre')
      return sinLibre.includes(id) ? sinLibre.filter(f => f !== id) : [...sinLibre, id]
    })
  }

  async function guardarCheckin() {
    setSaving(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    const { error } = await supabase.from('daily_checkin').insert({
      user_id: user.id,
      estado_animo: estadoAnimo,
      calidad_sueno: calidadSueno,
      hrv: hrv ? parseInt(hrv) : null,
      location_id: locationId,
      duracion_disponible: duracion,
      notas: notas || null,
      foco_entrenamiento: focoEntrenamiento.length > 0 ? focoEntrenamiento : null,
      dolor_hoy: dolorHoy || null
    })
    if (error) { setError(error.message); setSaving(false); return }
    router.push('/generate')
  }

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .bg-gradient { position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,255,0.28), transparent 70%); }
    .animo-btn { flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 12px 6px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04); cursor: pointer; transition: all 0.2s; }
    .animo-btn:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.07); }
    .animo-btn.selected { border-color: rgba(79,140,255,0.5); background: rgba(79,140,255,0.12); }
    .foco-btn { display: flex; align-items: center; gap: 7px; padding: 9px 13px;
      border-radius: 999px; border: 1px solid rgba(255,255,255,0.09);
      background: rgba(255,255,255,0.04); cursor: pointer; transition: all 0.2s;
      font-family: 'Space Grotesk', sans-serif; font-size: 13px; color: rgba(255,255,255,0.6); }
    .foco-btn:hover { border-color: rgba(255,255,255,0.2); color: #fff; }
    .foco-btn.selected { border-color: rgba(79,140,255,0.5); background: rgba(79,140,255,0.15); color: #fff; }
    .ubicacion-btn { width: 100%; text-align: left; padding: 14px 16px; border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
      cursor: pointer; transition: all 0.2s; }
    .ubicacion-btn:hover { border-color: rgba(255,255,255,0.15); }
    .ubicacion-btn.selected { border-color: rgba(79,140,255,0.5); background: rgba(79,140,255,0.1); }
    .glass-input { width: 100%; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px; padding: 14px 16px; color: #fff; font-family: 'Space Grotesk', sans-serif;
      font-size: 14px; outline: none; transition: all 0.2s; resize: none; }
    .glass-input:focus { border-color: rgba(79,140,255,0.5); background: rgba(255,255,255,0.09); }
    .glass-input::placeholder { color: rgba(255,255,255,0.25); }
    input[type=range] { width: 100%; accent-color: #4f8cff; }
    .section-label { font-family: 'JetBrains Mono', monospace; font-size: 10px;
      color: rgba(255,255,255,0.4); letter-spacing: 0.14em; text-transform: uppercase;
      margin-bottom: 10px; display: block; }
    .btn-primary { width: 100%; padding: 16px; border-radius: 14px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #4f8cff, #2563ff); color: #fff;
      font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px;
      transition: all 0.2s; box-shadow: 0 4px 20px rgba(37,99,255,0.35); }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(37,99,255,0.45); }
    .btn-primary:disabled { opacity: 0.35; transform: none; cursor: not-allowed; }
    .nav-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 16px 20px;
      display: flex; align-items: center; justify-content: space-between;
      backdrop-filter: blur(20px); background: rgba(0,0,0,0.7);
      border-bottom: 1px solid rgba(255,255,255,0.06); }
  `

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(79,140,255,0.3)', borderTop: '2px solid #4f8cff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    )
  }

  if (yaHizoCheckin) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
        <style>{STYLES}</style>
        <div className="bg-gradient"></div>
        <div style={{ textAlign: 'center', maxWidth: '360px', position: 'relative', zIndex: 2 }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(79,140,255,0.2), rgba(108,229,255,0.1))', border: '1px solid rgba(79,140,255,0.3)', display: 'grid', placeItems: 'center', margin: '0 auto 20px', fontSize: '28px' }}>✦</div>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>CHECK-IN COMPLETADO</p>
          <p style={{ fontSize: '22px', fontWeight: '600', color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px' }}>Ya registraste tu estado hoy</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginBottom: '32px' }}>Puedes ir directo a generar tu sesión</p>
          <button onClick={() => router.push('/generate')} className="btn-primary">
            Generar mi sesión →
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

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '76px 16px 40px', position: 'relative', zIndex: 2 }}>

        {/* HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>CHECK-IN DIARIO</p>
          <h1 style={{ fontSize: 'clamp(26px,5vw,36px)', fontWeight: '600', color: '#fff', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
            ¿Cómo estás <span style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', color: '#7ab6ff' }}>hoy</span>?
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginTop: '6px' }}>Pyfit ajusta tu sesión según tus señales del día</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* FOCO */}
          <div>
            <span className="section-label">¿Qué quieres entrenar? <span style={{ color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '11px' }}>(varios)</span></span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FOCOS.map(f => (
                <button key={f.id} className={`foco-btn${focoEntrenamiento.includes(f.id) ? ' selected' : ''}`} onClick={() => toggleFoco(f.id)}>
                  <span style={{ fontSize: '14px' }}>{f.emoji}</span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* DOLOR */}
          <div>
            <span className="section-label">¿Tienes dolor o molestia hoy? <span style={{ color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '11px' }}>(opcional)</span></span>
            <textarea value={dolorHoy} onChange={e => setDolorHoy(e.target.value)} placeholder="Ej: dolor leve en rodilla derecha, tensión lumbar..." rows={2} className="glass-input" maxLength={200} />
            {dolorHoy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,160,50,0.08)', border: '1px solid rgba(255,160,50,0.25)' }}>
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,170,50,0.8)', letterSpacing: '0.06em' }}>PYFIT EVITARÁ EJERCICIOS EN LAS ZONAS INDICADAS</p>
              </div>
            )}
          </div>

          {/* ESTADO DE ÁNIMO */}
          <div>
            <span className="section-label">Estado de ánimo</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {ANIMOS.map(a => (
                <button key={a.valor} className={`animo-btn${estadoAnimo === a.valor ? ' selected' : ''}`} onClick={() => setEstadoAnimo(a.valor)}>
                  <span style={{ fontSize: '24px', marginBottom: '5px' }}>{a.emoji}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: estadoAnimo === a.valor ? '#7ab6ff' : 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SUEÑO */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Horas de sueño</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: '700', color: '#7ab6ff', letterSpacing: '-0.02em' }}>{calidadSueno}<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>h</span></span>
            </div>
            <input type="range" min="3" max="12" step="0.5" value={calidadSueno} onChange={e => setCalidadSueno(parseFloat(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', letterSpacing: '0.06em' }}>
              <span>3H</span><span>12H</span>
            </div>
          </div>

          {/* HRV */}
          <div>
            <span className="section-label">HRV <span style={{ color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '11px' }}>(opcional — wearable)</span></span>
            <input type="number" value={hrv} onChange={e => setHrv(e.target.value)} placeholder="Ej: 65" className="glass-input" />
          </div>

          {/* UBICACIÓN */}
          {ubicaciones.length > 0 && (
            <div>
              <span className="section-label">¿Dónde entrenas hoy?</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ubicaciones.map(ub => (
                  <button key={ub.id} className={`ubicacion-btn${locationId === ub.id ? ' selected' : ''}`} onClick={() => setLocationId(ub.id)}>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: locationId === ub.id ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>{ub.nombre}</p>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {ub.tipo} · {ub.implementos?.length || 0} IMPLEMENTOS
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DURACIÓN */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Tiempo disponible</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: '700', color: '#7ab6ff', letterSpacing: '-0.02em' }}>{duracion}<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}> min</span></span>
            </div>
            <input type="range" min="20" max="120" step="5" value={duracion} onChange={e => setDuracion(parseInt(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', letterSpacing: '0.06em' }}>
              <span>20 MIN</span><span>120 MIN</span>
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <span className="section-label">Notas adicionales <span style={{ color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '11px' }}>(opcional)</span></span>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Cualquier cosa que Pyfit deba saber hoy..." rows={2} className="glass-input" maxLength={200} />
          </div>

          {error && (
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,120,120,0.9)' }}>{error}</p>
            </div>
          )}

          <button className="btn-primary" onClick={guardarCheckin} disabled={saving || !estadoAnimo || !locationId}>
            {saving ? 'Guardando...' : 'Continuar a mi sesión →'}
          </button>

        </div>
      </div>
    </div>
  )
}