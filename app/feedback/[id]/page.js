'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function Feedback() {
  const [rpeReal, setRpeReal] = useState(7)
  const [cumplimiento, setCumplimiento] = useState(100)
  const [rating, setRating] = useState(null)
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const RATINGS = [
    { valor: 1, emoji: '😩', label: 'Pésima' },
    { valor: 2, emoji: '😕', label: 'Mala' },
    { valor: 3, emoji: '😐', label: 'Regular' },
    { valor: 4, emoji: '😊', label: 'Buena' },
    { valor: 5, emoji: '🔥', label: 'Excelente' },
  ]

  async function guardarFeedback() {
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('session_feedback').insert({
      session_id: params.id,
      rpe_real: rpeReal,
      cumplimiento,
      rating,
      notas: notas || null
    })
    if (error) { setError(error.message); setSaving(false); return }
    router.push('/dashboard')
  }

  const STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .bg-gradient {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,255,0.25), transparent 70%);
    }
    .nav-bar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 50; padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between;
      backdrop-filter: blur(20px); background: rgba(0,0,0,0.75);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .rating-btn {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      padding: 12px 6px; border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04);
      cursor: pointer; transition: all 0.2s;
    }
    .rating-btn:hover { border-color: rgba(255,255,255,0.15); background: rgba(255,255,255,0.07); }
    .rating-btn.selected { border-color: rgba(79,140,255,0.5); background: rgba(79,140,255,0.12); }
    .glass-input {
      width: 100%; background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
      padding: 14px 16px; color: #fff;
      font-family: 'Space Grotesk', sans-serif; font-size: 14px;
      outline: none; transition: all 0.2s; resize: none;
    }
    .glass-input:focus { border-color: rgba(79,140,255,0.5); background: rgba(255,255,255,0.09); }
    .glass-input::placeholder { color: rgba(255,255,255,0.25); }
    input[type=range] { width: 100%; accent-color: #4f8cff; }
    .section-label {
      font-family: 'JetBrains Mono', monospace; font-size: 10px;
      color: rgba(255,255,255,0.4); letter-spacing: 0.14em;
      text-transform: uppercase; margin-bottom: 10px; display: block;
    }
    .btn-primary {
      width: 100%; padding: 16px; border-radius: 14px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #4f8cff, #2563ff); color: #fff;
      font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px;
      transition: all 0.2s; box-shadow: 0 4px 20px rgba(37,99,255,0.35);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(37,99,255,0.45); }
    .btn-primary:disabled { opacity: 0.35; transform: none; cursor: not-allowed; }
    .btn-secondary {
      width: 100%; padding: 14px; border-radius: 14px; cursor: pointer;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.5); font-family: 'Space Grotesk', sans-serif;
      font-size: 14px; transition: all 0.2s;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .btn-share {
      width: 100%; padding: 14px; border-radius: 14px; cursor: pointer;
      background: linear-gradient(135deg, rgba(29,161,242,0.15), rgba(0,119,255,0.1));
      border: 1px solid rgba(29,161,242,0.3);
      color: rgba(100,200,255,0.8); font-family: 'Space Grotesk', sans-serif;
      font-size: 14px; font-weight: 500; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-share:hover { background: linear-gradient(135deg, rgba(29,161,242,0.22), rgba(0,119,255,0.15)); color: #fff; border-color: rgba(29,161,242,0.5); }
  `

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'Space Grotesk, system-ui, sans-serif', color: '#fff', paddingBottom: '40px' }}>
      <style>{STYLES}</style>
      <div className="bg-gradient"></div>

      {/* NAV */}
      <nav className="nav-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7ab6ff"/>
                <stop offset="100%" stopColor="#2563ff"/>
              </linearGradient>
            </defs>
            <path d="M6 6 L16 16 L6 26" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="22" cy="16" r="3.2" fill="url(#lg)"/>
          </svg>
          <span style={{ fontWeight: '700', fontSize: '17px', letterSpacing: '-0.02em', color: '#fff' }}>
            Pyfit<span style={{ color: '#7ab6ff' }}>.</span>
          </span>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
          ← INICIO
        </button>
      </nav>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '76px 16px 40px', position: 'relative', zIndex: 2 }}>

        {/* HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
            POST-SESIÓN
          </p>
          <h1 style={{ fontSize: 'clamp(26px,5vw,36px)', fontWeight: '600', color: '#fff', letterSpacing: '-0.03em', lineHeight: '1.1' }}>
            ¿Cómo fue la <span style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', color: '#7ab6ff' }}>sesión</span>?
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', marginTop: '6px' }}>
            Tu feedback entrena a Pyfit para conocerte mejor cada día
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

          {/* RPE REAL */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="section-label" style={{ marginBottom: 0 }}>RPE real percibido</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: '700', color: '#7ab6ff', letterSpacing: '-0.02em' }}>
                {rpeReal}<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>/10</span>
              </span>
            </div>
            <input type="range" min="1" max="10" step="1" value={rpeReal} onChange={e => setRpeReal(parseInt(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', letterSpacing: '0.06em' }}>
              <span>1 — MUY FÁCIL</span>
              <span>10 — MÁXIMO</span>
            </div>
          </div>

          {/* CUMPLIMIENTO */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Sesión completada</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '22px', fontWeight: '700', color: cumplimiento >= 80 ? '#32c896' : cumplimiento >= 50 ? '#ffaa32' : '#ff6464', letterSpacing: '-0.02em' }}>
                {cumplimiento}<span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: '400' }}>%</span>
              </span>
            </div>
            <input type="range" min="0" max="100" step="5" value={cumplimiento} onChange={e => setCumplimiento(parseInt(e.target.value))} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', letterSpacing: '0.06em' }}>
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* RATING */}
          <div>
            <span className="section-label">Rating general</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {RATINGS.map(r => (
                <button key={r.valor} className={`rating-btn${rating === r.valor ? ' selected' : ''}`} onClick={() => setRating(r.valor)}>
                  <span style={{ fontSize: '24px', marginBottom: '5px' }}>{r.emoji}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: rating === r.valor ? '#7ab6ff' : 'rgba(255,255,255,0.25)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <span className="section-label">
              Notas{' '}
              <span style={{ color: 'rgba(255,255,255,0.2)', textTransform: 'none', letterSpacing: 'normal', fontFamily: 'Space Grotesk', fontSize: '11px' }}>
                (opcional)
              </span>
            </span>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Ej: me costó el press, el calentamiento estuvo perfecto..."
              rows={3}
              maxLength={200}
              className="glass-input"
            />
          </div>

          {error && (
            <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)' }}>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'rgba(255,120,120,0.9)' }}>{error}</p>
            </div>
          )}

          {/* BOTONES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-primary" onClick={guardarFeedback} disabled={saving || !rating}>
              {saving ? 'Guardando...' : 'Finalizar sesión →'}
            </button>

            <button
              className="btn-share"
              onClick={() => alert('Compartir en redes — próximamente 🚀')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Compartir mi sesión en redes
            </button>

            <button className="btn-secondary" onClick={() => router.push('/dashboard')}>
              Saltar feedback
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}