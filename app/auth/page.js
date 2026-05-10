'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else router.push('/onboarding')
    }
    setLoading(false)
  }

  async function handleReset() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`
    })
    if (error) setError(error.message)
    else setResetSent(true)
    setLoading(false)
  }

  async function handleKeyDown(e) {
    if (e.key === 'Enter') resetMode ? handleReset() : handleSubmit()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Fondo animado */
        .bg-gradient {
          position: fixed; inset: 0; z-index: 0;
          background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,255,0.5), transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(108,229,255,0.2), transparent 60%),
            radial-gradient(ellipse 50% 40% at 20% 90%, rgba(120,60,255,0.2), transparent 60%);
        }
        .bg-noise {
          position: fixed; inset: 0; z-index: 0; opacity: 0.04;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }

        /* Card glassmorphism */
        .glass-card {
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 28px;
          padding: 36px 32px;
          width: 100%;
          max-width: 400px;
          position: relative;
          z-index: 10;
          box-shadow: 0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
        }

        /* Input */
        .glass-input {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 16px 18px;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px;
          outline: none;
          transition: all 0.2s;
        }
        .glass-input:focus {
          border-color: rgba(79,140,255,0.6);
          background: rgba(255,255,255,0.1);
          box-shadow: 0 0 0 3px rgba(79,140,255,0.15);
        }
        .glass-input::placeholder { color: rgba(255,255,255,0.3); }

        /* Botón primario */
        .btn-main {
          width: 100%; padding: 16px; border-radius: 14px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #4f8cff, #2563ff);
          color: #fff; font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 15px; letter-spacing: -0.01em;
          transition: all 0.2s;
          box-shadow: 0 4px 20px rgba(37,99,255,0.4);
        }
        .btn-main:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(37,99,255,0.5); }
        .btn-main:active { transform: translateY(0); }
        .btn-main:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Botón social */
        .btn-social {
          width: 100%; padding: 14px 18px; border-radius: 14px; cursor: pointer;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff; font-family: 'Space Grotesk', sans-serif;
          font-weight: 500; font-size: 14px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s;
        }
        .btn-social:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }

        /* Toggle tabs */
        .tab-container {
          display: flex; gap: 2px; padding: 4px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px; margin-bottom: 28px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .tab-btn {
          flex: 1; padding: 10px; border-radius: 9px; border: none; cursor: pointer;
          font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 500;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: rgba(255,255,255,0.12);
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .tab-btn.inactive { background: transparent; color: rgba(255,255,255,0.4); }
        .tab-btn.inactive:hover { color: rgba(255,255,255,0.7); }

        .divider {
          display: flex; align-items: center; gap: 12px; margin: 20px 0;
        }
        .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.1); }
        .divider-text { font-size: 12px; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.1em; }

        .error-box {
          padding: 12px 14px; border-radius: 10px;
          background: rgba(255,60,60,0.1); border: 1px solid rgba(255,60,60,0.25);
          color: rgba(255,120,120,0.9); font-size: 13px; line-height: 1.4;
        }
        .success-box {
          padding: 12px 14px; border-radius: 10px;
          background: rgba(50,200,150,0.1); border: 1px solid rgba(50,200,150,0.25);
          color: rgba(50,200,150,0.9); font-size: 13px; line-height: 1.4;
        }

        @keyframes float-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .float-in { animation: float-in 0.4s ease forwards; }
      `}</style>

      {/* Fondo */}
      <div className="bg-gradient"></div>
      <div className="bg-noise"></div>

      {/* Logo arriba */}
      <Link href="/landing" style={{position:'relative', zIndex:10, display:'flex', alignItems:'center', gap:'10px', textDecoration:'none', marginBottom:'32px'}}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7ab6ff"/>
              <stop offset="100%" stopColor="#2563ff"/>
            </linearGradient>
          </defs>
          <path d="M6 6 L16 16 L6 26" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="22" cy="16" r="3.2" fill="url(#lg)"/>
        </svg>
        <span style={{fontWeight:'700', fontSize:'20px', letterSpacing:'-0.02em', color:'#fff'}}>
          Pyfit<span style={{color:'#7ab6ff'}}>.</span>
        </span>
      </Link>

      {/* Card principal */}
      <div className="glass-card float-in">

        {/* Modo reset */}
        {resetMode ? (
          <div>
            <button onClick={() => { setResetMode(false); setResetSent(false); setError(null) }} style={{background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'13px', cursor:'pointer', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.08em', marginBottom:'20px', display:'flex', alignItems:'center', gap:'6px'}}>
              ← VOLVER
            </button>
            <h2 style={{fontSize:'22px', fontWeight:'500', color:'#fff', marginBottom:'8px', letterSpacing:'-0.02em'}}>Recuperar contraseña</h2>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'24px', lineHeight:'1.5'}}>Te enviaremos un enlace para restablecer tu contraseña</p>

            {resetSent ? (
              <div className="success-box">
                ✓ Revisa tu email — te enviamos el enlace de recuperación
              </div>
            ) : (
              <>
                <div style={{marginBottom:'16px'}}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} placeholder="tu@email.com" className="glass-input"/>
                </div>
                {error && <div className="error-box" style={{marginBottom:'16px'}}>{error}</div>}
                <button className="btn-main" onClick={handleReset} disabled={loading || !email}>
                  {loading ? 'Enviando...' : 'Enviar enlace →'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{textAlign:'center', marginBottom:'28px'}}>
              <h1 style={{fontSize:'26px', fontWeight:'600', color:'#fff', letterSpacing:'-0.03em', marginBottom:'6px'}}>
                {mode === 'login' ? 'Bienvenido de vuelta' : 'Empieza hoy'}
              </h1>
              <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)'}}>
                {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta gratis'}
              </p>
            </div>

            {/* Toggle */}
            <div className="tab-container">
              <button className={`tab-btn ${mode === 'login' ? 'active' : 'inactive'}`} onClick={() => { setMode('login'); setError(null) }}>
                Iniciar sesión
              </button>
              <button className={`tab-btn ${mode === 'register' ? 'active' : 'inactive'}`} onClick={() => { setMode('register'); setError(null) }}>
                Registrarse
              </button>
            </div>

            {/* Inputs */}
            <div style={{display:'flex', flexDirection:'column', gap:'12px', marginBottom:'16px'}}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Email"
                className="glass-input"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Contraseña"
                className="glass-input"
              />
            </div>

            {/* Olvidé contraseña */}
            {mode === 'login' && (
              <div style={{textAlign:'right', marginBottom:'16px'}}>
                <button onClick={() => { setResetMode(true); setError(null) }} style={{background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:'13px', cursor:'pointer', fontFamily:'Space Grotesk, sans-serif'}}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {error && <div className="error-box" style={{marginBottom:'16px'}}>{error}</div>}

            {/* Botón principal */}
            <button className="btn-main" onClick={handleSubmit} disabled={loading || !email || !password}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar →' : 'Crear cuenta →'}
            </button>

            {/* Divider */}
            <div className="divider">
              <div className="divider-line"></div>
              <span className="divider-text">O</span>
              <div className="divider-line"></div>
            </div>

            {/* Botones sociales */}
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
              <button className="btn-social">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continuar con Google
              </button>

              <button className="btn-social">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continuar con Apple
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Footer */}
      <p style={{position:'relative', zIndex:10, marginTop:'24px', fontSize:'12px', color:'rgba(255,255,255,0.2)', fontFamily:'JetBrains Mono, monospace', letterSpacing:'0.06em', textAlign:'center'}}>
        © 2026 PYFIT · TODOS LOS DERECHOS RESERVADOS
      </p>

    </div>
  )
}