'use client'
import { useRouter, usePathname } from 'next/navigation'

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/')

  const TABS = [
    {
      id: 'dashboard',
      label: 'Inicio',
      path: '/dashboard',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8cff' : 'rgba(255,255,255,0.3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      )
    },
    {
      id: 'estadisticas',
      label: 'Stats',
      path: '/estadisticas',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8cff' : 'rgba(255,255,255,0.3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      )
    },
    {
      id: 'checkin',
      label: 'Entrenar',
      path: '/checkin',
      center: true,
      icon: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#050a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      )
    },
    {
      id: 'historial',
      label: 'Historial',
      path: '/historial',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8cff' : 'rgba(255,255,255,0.3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      )
    },
    {
      id: 'perfil',
      label: 'Perfil',
      path: '/perfil',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#4f8cff' : 'rgba(255,255,255,0.3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
        .navbar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
          background: rgba(0,0,0,0.88);
          backdrop-filter: blur(30px) saturate(180%);
          -webkit-backdrop-filter: blur(30px) saturate(180%);
          border-top: 1px solid rgba(255,255,255,0.07);
          padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
          display: flex; align-items: center; justify-content: space-around;
        }
        .nav-tab {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          cursor: pointer; transition: all 0.2s; padding: 6px 12px;
          border-radius: 14px; border: none; background: transparent; flex: 1;
          min-width: 0;
        }
        .nav-tab:hover { background: rgba(255,255,255,0.04); }
        .nav-tab.active { background: rgba(79,140,255,0.08); }
        .nav-center-wrap {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          flex: 1; min-width: 0;
        }
        .nav-center-btn {
          width: 50px; height: 50px; border-radius: 16px; border: none; cursor: pointer;
          background: linear-gradient(135deg, #ffffff, #d6e4ff);
          display: grid; place-items: center;
          box-shadow: 0 4px 20px rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.1);
          transition: all 0.2s; flex-shrink: 0;
        }
        .nav-center-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(255,255,255,0.3); }
        .nav-center-btn:active { transform: translateY(0); }
        .nav-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8px; letter-spacing: 0.06em; text-transform: uppercase;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 100%;
        }
        @keyframes pulse-center { 0%,100%{box-shadow:0 4px 20px rgba(255,255,255,0.2)} 50%{box-shadow:0 6px 24px rgba(255,255,255,0.35)} }
      `}</style>

      <nav className="navbar">
        {TABS.map(tab => {
          const active = isActive(tab.path)

          if (tab.center) {
            return (
              <div key={tab.id} className="nav-center-wrap">
                <button className="nav-center-btn" onClick={() => router.push(tab.path)} style={{ animation: 'pulse-center 3s ease-in-out infinite' }}>
                  {tab.icon()}
                </button>
                <span className="nav-label" style={{ color: 'rgba(255,255,255,0.4)' }}>{tab.label}</span>
              </div>
            )
          }

          return (
            <button key={tab.id} className={`nav-tab${active ? ' active' : ''}`} onClick={() => router.push(tab.path)}>
              {tab.icon(active)}
              <span className="nav-label" style={{ color: active ? '#4f8cff' : 'rgba(255,255,255,0.3)' }}>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}