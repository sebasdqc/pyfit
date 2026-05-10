'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Landing() {
  const [faqOpen, setFaqOpen] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll)

    // Parallax
    function tick() {
      const evBg = document.getElementById('evidenceBg')
      if (evBg) {
        const rect = evBg.parentElement.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const pct = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
          evBg.style.transform = `translateY(${(pct - 0.5) * 80}px) scale(1.08)`
        }
      }
      const pBg = document.getElementById('parallaxBg')
      if (pBg) {
        const rect = pBg.parentElement.getBoundingClientRect()
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          const pct = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
          pBg.style.transform = `translateY(${(pct - 0.5) * 120}px) scale(1.12)`
        }
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const faqs = [
    { q: '¿En qué se diferencia Pyfit de un coach humano?', a: 'No reemplaza, complementa. La IA está disponible 24/7 con datos en tiempo real; nuestro plan Elite añade un coach certificado para criterio clínico, técnica y acompañamiento. Lo mejor de ambos.' },
    { q: '¿Qué quieren decir con "altos estándares de evidencia"?', a: 'Cada recomendación se contrasta contra revisiones sistemáticas, meta-análisis y ECAs publicados en revistas indexadas. Si la evidencia cambia, el modelo se reentrena. La base científica es pública y auditable.' },
    { q: '¿Qué wearables soporta?', a: 'Apple Watch, Garmin, Whoop, Polar, Oura y Fitbit a través de Health Connect. La integración es automática y bidireccional.' },
    { q: '¿Sirve si soy principiante absoluto?', a: 'Sí. El onboarding identifica tu nivel real con micro-tests y comienza con cargas conservadoras. La progresión se acelera solo cuando los datos confirman que estás listo.' },
    { q: '¿Puedo cancelar cuando quiera?', a: 'Sin permanencia, sin penalizaciones. Conservas tu historial completo de entrenamientos para siempre, incluso si cancelas.' },
  ]

  return (
    <>
      <style>{`
        :root {
          --bg-0: #03060f;
          --bg-1: #060b1d;
          --bg-2: #0a1430;
          --ink-0: #e8efff;
          --ink-1: #aab8d8;
          --ink-2: #6b7aa0;
          --ink-3: #3d4868;
          --line: rgba(120, 160, 230, 0.12);
          --line-bright: rgba(120, 160, 230, 0.28);
          --accent: #4f8cff;
          --accent-2: #7ab6ff;
          --accent-glow: #2563ff;
          --cyan: #6ce5ff;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: var(--bg-0);
          color: var(--ink-0);
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-weight: 400;
          line-height: 1.5;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .ambient {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(900px 700px at 12% 8%, rgba(37, 99, 255, 0.18), transparent 60%),
            radial-gradient(1100px 800px at 88% 18%, rgba(108, 229, 255, 0.10), transparent 65%),
            radial-gradient(800px 600px at 50% 110%, rgba(80, 140, 255, 0.18), transparent 60%);
        }
        .grid-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(120, 160, 230, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(120, 160, 230, 0.04) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 90% 80% at 50% 30%, #000 35%, transparent 100%);
        }
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          padding: 18px 40px;
          display: flex; align-items: center; justify-content: space-between;
          backdrop-filter: blur(14px) saturate(140%);
          background: linear-gradient(180deg, rgba(3, 6, 15, 0.6), rgba(3, 6, 15, 0));
          border-bottom: 1px solid transparent;
          transition: border-color 0.3s ease, background 0.3s ease;
        }
        .nav.scrolled { border-bottom-color: var(--line); background: rgba(3, 6, 15, 0.78); }
        .logo { display: flex; align-items: center; gap: 10px; font-family: 'Space Grotesk'; font-weight: 700; font-size: 22px; letter-spacing: -0.02em; }
        .logo-mark { width: 32px; height: 32px; position: relative; display: grid; place-items: center; }
        .logo-mark svg { width: 100%; height: 100%; }
        .logo-text { background: linear-gradient(180deg, #fff, #b4cdff); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .logo-text .dot { color: var(--accent-2); }
        .nav-links { display: flex; align-items: center; gap: 4px; background: rgba(8, 16, 38, 0.6); border: 1px solid var(--line); padding: 6px; border-radius: 999px; }
        .nav-links a { padding: 8px 18px; color: var(--ink-1); text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 999px; transition: all 0.2s; }
        .nav-links a:hover { color: var(--ink-0); background: rgba(120, 160, 230, 0.08); }
        .nav-links a.pill { background: rgba(79, 140, 255, 0.14); color: var(--ink-0); }
        .cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 999px; background: linear-gradient(180deg, #ffffff, #d6e4ff); color: #050a1a; font-weight: 600; font-size: 14px; border: 1px solid rgba(255,255,255,0.4); text-decoration: none; box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 8px 30px rgba(79, 140, 255, 0.35); transition: transform 0.18s ease, box-shadow 0.2s; cursor: pointer; }
        .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 12px 40px rgba(79, 140, 255, 0.5); }
        .hero { position: relative; min-height: 100vh; padding: 140px 40px 80px; overflow: hidden; z-index: 2; }
        .hero-grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 60px; align-items: center; position: relative; z-index: 5; }
        .eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 6px 14px 6px 8px; background: rgba(79, 140, 255, 0.08); border: 1px solid rgba(79, 140, 255, 0.22); border-radius: 999px; font-size: 12px; font-weight: 500; letter-spacing: 0.04em; color: var(--ink-1); font-family: 'JetBrains Mono', monospace; }
        .live-dot { width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(circle, var(--accent-2), var(--accent)); display: grid; place-items: center; box-shadow: 0 0 12px var(--accent); position: relative; }
        .live-dot::after { content: ''; position: absolute; inset: 4px; background: #fff; border-radius: 50%; }
        h1.hero-title { margin-top: 28px; font-size: clamp(48px, 6.4vw, 92px); line-height: 0.95; letter-spacing: -0.035em; font-weight: 500; color: var(--ink-0); }
        h1.hero-title .grad { background: linear-gradient(180deg, #ffffff 0%, #aac6ff 70%, #4f8cff 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        h1.hero-title em { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; color: var(--accent-2); }
        .hero-sub { margin-top: 28px; max-width: 540px; font-size: 18px; color: var(--ink-1); line-height: 1.55; }
        .hero-actions { margin-top: 36px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .btn-ghost { display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid var(--line-bright); color: var(--ink-0); font-weight: 500; font-size: 14px; text-decoration: none; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { background: rgba(120,160,230,0.08); border-color: rgba(120,160,230,0.45); }
        .play-ico { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); display: grid; place-items: center; color: #fff; font-size: 9px; }
        .trust-row { margin-top: 56px; display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
        .avatars { display: flex; }
        .av { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--bg-0); margin-left: -10px; }
        .avatars > *:first-child { margin-left: 0; }
        .trust-text { font-size: 13px; color: var(--ink-1); line-height: 1.4; }
        .trust-text strong { color: var(--ink-0); font-weight: 600; }
        .stars { color: #ffd34a; letter-spacing: 1px; font-size: 12px; }
        .hero-stage { position: relative; height: 640px; perspective: 1600px; }
        .hero-photo { position: absolute; inset: 0; border-radius: 32px; overflow: hidden; background: #050a1a; box-shadow: 0 60px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(120,160,230,0.18); }
        .hero-photo img { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.05) saturate(1.1); }
        .scan { position: absolute; inset: 0; z-index: 3; pointer-events: none; background: repeating-linear-gradient(180deg, transparent 0 3px, rgba(108,229,255,0.04) 3px 4px); mix-blend-mode: screen; }
        .widget { position: absolute; z-index: 8; background: rgba(8,16,38,0.78); backdrop-filter: blur(20px) saturate(160%); border: 1px solid var(--line-bright); border-radius: 18px; padding: 14px 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); color: var(--ink-0); }
        .w-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 6px; }
        .w-value { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
        .w-unit { font-size: 12px; color: var(--ink-2); margin-left: 4px; font-weight: 400; }
        .w-heart { top: 70px; left: -40px; display: flex; align-items: center; gap: 14px; padding: 14px 20px 14px 14px; }
        .pulse-ico { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, #ff527a, #ff2c6e); display: grid; place-items: center; box-shadow: 0 0 20px rgba(255,60,120,0.5); }
        .pulse-ico svg { width: 20px; height: 20px; }
        .w-graph { bottom: 90px; left: -50px; width: 270px; }
        .bars { display: flex; align-items: flex-end; gap: 5px; height: 50px; margin-top: 8px; }
        .bars span { flex: 1; background: linear-gradient(180deg, var(--accent-2), var(--accent)); border-radius: 3px 3px 1px 1px; box-shadow: 0 0 8px rgba(79,140,255,0.35); animation: bar-pulse 2.4s ease-in-out infinite; }
        @keyframes bar-pulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
        .w-ai { top: 30px; right: -30px; width: 250px; }
        .ai-row { display: flex; align-items: center; gap: 10px; }
        .ai-icon { width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #4f8cff, #6ce5ff); display: grid; place-items: center; color: #050a1a; font-weight: 700; box-shadow: 0 0 16px rgba(79,140,255,0.4); }
        .ai-text { font-size: 13px; color: var(--ink-0); font-weight: 500; }
        .ai-meta { font-size: 11px; color: var(--ink-2); margin-top: 2px; }
        .ai-progress { margin-top: 12px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; }
        .ai-progress span { display: block; height: 100%; width: 78%; background: linear-gradient(90deg, var(--accent), var(--cyan)); border-radius: 2px; box-shadow: 0 0 8px var(--accent); }
        .w-set { bottom: 30px; right: -30px; width: 230px; }
        .set-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
        .set-row:last-child { border-bottom: 0; }
        .set-row .name { color: var(--ink-1); }
        .set-row .val { font-family: 'JetBrains Mono', monospace; color: var(--ink-0); font-weight: 600; }
        .set-row .check { width: 16px; height: 16px; border-radius: 50%; background: rgba(79,140,255,0.2); border: 1.5px solid var(--accent); display: grid; place-items: center; color: var(--accent-2); font-size: 10px; }
        .marquee-band { position: relative; padding: 30px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); overflow: hidden; z-index: 2; }
        .marquee-band .label { position: absolute; left: 40px; top: 50%; transform: translateY(-50%); z-index: 3; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-2); letter-spacing: 0.15em; text-transform: uppercase; background: var(--bg-0); padding-right: 24px; }
        .marquee-track { display: flex; gap: 60px; padding-left: 280px; animation: scroll-x 32s linear infinite; width: max-content; }
        .marquee-track span { font-family: 'Instrument Serif', serif; font-size: 22px; font-style: italic; color: var(--ink-1); white-space: nowrap; display: flex; align-items: center; gap: 60px; }
        .marquee-track span::after { content: '✦'; color: var(--accent); font-style: normal; font-family: 'Space Grotesk'; }
        @keyframes scroll-x { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        section.bk { position: relative; padding: 140px 40px; z-index: 2; }
        .container { max-width: 1280px; margin: 0 auto; }
        .section-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent-2); }
        .section-eyebrow .num { color: var(--ink-3); padding-right: 12px; border-right: 1px solid var(--line); }
        h2.section-title { margin-top: 18px; font-size: clamp(40px, 5vw, 64px); line-height: 1.0; letter-spacing: -0.03em; font-weight: 500; max-width: 960px; }
        h2.section-title em { font-family: 'Instrument Serif', serif; font-style: italic; font-weight: 400; color: var(--accent-2); }
        h2.section-title .muted { color: var(--ink-2); font-weight: 400; }
        .section-lede { margin-top: 22px; max-width: 620px; font-size: 18px; color: var(--ink-1); }
        .pillars { margin-top: 80px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .pillar { position: relative; padding: 32px; border-radius: 24px; background: linear-gradient(180deg, rgba(10,20,48,0.55), rgba(6,11,29,0.35)); border: 1px solid var(--line); overflow: hidden; transition: border-color 0.3s, transform 0.3s; min-height: 360px; display: flex; flex-direction: column; }
        .pillar:hover { border-color: var(--line-bright); transform: translateY(-3px); }
        .pillar .num-tag { font-family: 'JetBrains Mono'; font-size: 12px; color: var(--ink-3); letter-spacing: 0.1em; }
        .pillar h3 { margin-top: 16px; font-size: 26px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.1; }
        .pillar h3 em { font-family: 'Instrument Serif', serif; font-style: italic; color: var(--accent-2); font-weight: 400; }
        .pillar p { margin-top: 14px; color: var(--ink-1); font-size: 15px; line-height: 1.55; flex: 1; }
        .pillar .visual { margin-top: 24px; height: 90px; border-radius: 12px; background: rgba(0,0,0,0.25); border: 1px solid var(--line); position: relative; overflow: hidden; display: grid; place-items: center; }
        .vis-mesh svg { width: 100%; height: 100%; }
        .vis-mesh circle { fill: var(--accent); }
        .vis-mesh line { stroke: rgba(120,200,255,0.4); }
        .vis-wave { padding: 0 16px; }
        .vis-wave .bars2 { display: flex; align-items: center; gap: 4px; height: 50px; width: 100%; }
        .vis-wave .bars2 span { flex: 1; background: linear-gradient(180deg, var(--cyan), var(--accent)); border-radius: 1px; animation: wave 1.8s ease-in-out infinite; }
        @keyframes wave { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        .vis-orbit { position: relative; }
        .vis-orbit .ring { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); border: 1px solid rgba(120,200,255,0.25); border-radius: 50%; }
        .vis-orbit .ring.r1 { width: 70px; height: 70px; }
        .vis-orbit .ring.r2 { width: 110px; height: 110px; border-color: rgba(120,200,255,0.15); }
        .vis-orbit .core { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); width: 10px; height: 10px; border-radius: 50%; background: var(--accent-2); box-shadow: 0 0 16px var(--accent); }
        .vis-orbit .planet { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 8px var(--cyan); animation: orbit 4s linear infinite; }
        @keyframes orbit { from{transform:rotate(0deg) translateX(35px) rotate(0deg)} to{transform:rotate(360deg) translateX(35px) rotate(-360deg)} }
        .evidence-bk { position: relative; padding: 0; }
        .evidence-strip { position: relative; height: 500px; overflow: hidden; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
        .evidence-bg { position: absolute; inset: 0; background-image: url('/assets/lifter.jpg'); background-size: cover; background-position: center 30%; filter: contrast(1.1); }
        .evidence-bg::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(3,6,15,0.95) 0%, rgba(3,6,15,0.4) 50%, rgba(3,6,15,0.85) 100%); }
        .evidence-content { position: relative; z-index: 2; height: 100%; display: flex; align-items: center; padding: 0 40px; }
        .evidence-inner { max-width: 1280px; margin: 0 auto; width: 100%; }
        .evidence-quote { max-width: 600px; font-family: 'Instrument Serif', serif; font-size: clamp(32px,3.6vw,48px); line-height: 1.1; font-weight: 400; color: var(--ink-0); }
        .evidence-quote em { font-style: italic; color: var(--accent-2); }
        .evidence-meta { margin-top: 28px; display: flex; align-items: center; gap: 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); }
        .evidence-meta::before { content: ''; width: 32px; height: 1px; background: var(--accent-2); }
        .preview-grid { margin-top: 80px; display: grid; grid-template-columns: 380px 1fr; gap: 40px; align-items: stretch; }
        .device { position: relative; width: 380px; height: 780px; border-radius: 56px; background: linear-gradient(180deg, #0a1430, #050a1a); padding: 12px; box-shadow: 0 80px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(120,160,230,0.2); }
        .device-screen { width: 100%; height: 100%; border-radius: 44px; background: linear-gradient(180deg, #060b1d, #03060f); overflow: hidden; position: relative; border: 1px solid rgba(120,160,230,0.1); }
        .device-notch { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 110px; height: 28px; background: #000; border-radius: 18px; z-index: 10; }
        .app-status { padding: 18px 24px 10px; display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-1); }
        .app-body { padding: 30px 22px 22px; }
        .app-greet { font-size: 13px; color: var(--ink-2); }
        .app-h { font-size: 22px; font-weight: 500; letter-spacing: -0.02em; margin-top: 4px; line-height: 1.2; }
        .app-h em { font-family: 'Instrument Serif', serif; font-style: italic; color: var(--accent-2); font-weight: 400; }
        .app-card { margin-top: 22px; padding: 18px; border-radius: 18px; background: linear-gradient(160deg, rgba(79,140,255,0.18), rgba(108,229,255,0.05)); border: 1px solid rgba(120,200,255,0.25); position: relative; overflow: hidden; }
        .card-tag { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--accent-2); letter-spacing: 0.1em; text-transform: uppercase; }
        .card-title { font-size: 18px; font-weight: 500; margin-top: 4px; }
        .card-meta { margin-top: 12px; display: flex; gap: 14px; font-size: 11px; color: var(--ink-1); font-family: 'JetBrains Mono', monospace; }
        .card-meta b { color: var(--ink-0); font-weight: 600; }
        .start-btn { margin-top: 14px; padding: 10px; background: rgba(255,255,255,0.92); color: #050a1a; border-radius: 12px; text-align: center; font-weight: 600; font-size: 13px; }
        .app-section-h { margin-top: 22px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--ink-2); font-family: 'JetBrains Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; }
        .app-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .app-item { padding: 12px; border-radius: 14px; background: rgba(120,160,230,0.05); border: 1px solid var(--line); display: flex; align-items: center; gap: 12px; }
        .app-item .ico { width: 36px; height: 36px; border-radius: 10px; background: rgba(79,140,255,0.15); display: grid; place-items: center; color: var(--accent-2); font-size: 14px; font-weight: 600; }
        .app-item .ttl { font-size: 13px; font-weight: 500; }
        .app-item .meta { font-size: 11px; color: var(--ink-2); margin-top: 2px; }
        .app-item .arrow { margin-left: auto; color: var(--ink-3); }
        .feat-stack { display: grid; grid-template-rows: 1fr 1fr 1fr; gap: 20px; height: 780px; }
        .feat-card { padding: 28px; border-radius: 24px; background: linear-gradient(135deg, rgba(10,20,48,0.6), rgba(6,11,29,0.4)); border: 1px solid var(--line); display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 24px; transition: border-color 0.3s; position: relative; overflow: hidden; }
        .feat-card:hover { border-color: var(--line-bright); }
        .feat-icon { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, rgba(79,140,255,0.18), rgba(108,229,255,0.05)); border: 1px solid rgba(120,200,255,0.3); display: grid; place-items: center; color: var(--accent-2); }
        .feat-icon svg { width: 28px; height: 28px; }
        .feat-card h4 { font-size: 22px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.15; }
        .feat-card h4 em { font-family: 'Instrument Serif', serif; font-style: italic; color: var(--accent-2); font-weight: 400; }
        .feat-card p { color: var(--ink-1); font-size: 14px; margin-top: 6px; line-height: 1.5; max-width: 460px; }
        .stat { text-align: right; font-family: 'JetBrains Mono', monospace; }
        .stat .big { font-size: 32px; font-weight: 600; background: linear-gradient(180deg, #fff, var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: -0.02em; }
        .stat .lab { font-size: 10px; color: var(--ink-2); letter-spacing: 0.1em; text-transform: uppercase; }
        .metrics { margin-top: 80px; display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line); border-radius: 24px; overflow: hidden; background: rgba(6,11,29,0.4); }
        .metric { padding: 36px 28px; border-right: 1px solid var(--line); position: relative; }
        .metric:last-child { border-right: 0; }
        .metric .v { font-size: 56px; font-weight: 500; letter-spacing: -0.04em; background: linear-gradient(180deg, #fff, #6c9eff); -webkit-background-clip: text; background-clip: text; color: transparent; line-height: 1; }
        .metric .v .sym { font-family: 'Instrument Serif', serif; font-style: italic; color: var(--accent-2); }
        .metric .lab { margin-top: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-2); }
        .metric .desc { margin-top: 8px; font-size: 13px; color: var(--ink-1); }
        .parallax-section { position: relative; height: 700px; overflow: hidden; }
        .parallax-bg { position: absolute; inset: -10%; background-image: url('/assets/runner.jpg'); background-size: cover; background-position: center 35%; will-change: transform; }
        .parallax-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at center, transparent 0%, rgba(3,6,15,0.6) 70%, var(--bg-0) 100%), linear-gradient(180deg, rgba(3,6,15,0.4), rgba(3,6,15,0.85)); }
        .parallax-content { position: relative; z-index: 2; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 40px; }
        .parallax-content h2 { font-size: clamp(40px,6vw,88px); font-weight: 500; letter-spacing: -0.04em; line-height: 0.95; max-width: 1100px; color: var(--ink-0); }
        .parallax-content h2 em { font-family: 'Instrument Serif', serif; font-style: italic; color: var(--accent-2); font-weight: 400; }
        .parallax-content p { margin-top: 28px; max-width: 560px; font-size: 18px; color: var(--ink-1); }
        .price-grid { margin-top: 80px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .price-card { padding: 36px 32px; border-radius: 24px; background: linear-gradient(180deg, rgba(10,20,48,0.5), rgba(6,11,29,0.3)); border: 1px solid var(--line); display: flex; flex-direction: column; position: relative; transition: all 0.3s; }
        .price-card.featured { background: linear-gradient(180deg, rgba(37,99,255,0.18), rgba(10,20,48,0.4)); border-color: rgba(120,200,255,0.5); box-shadow: 0 30px 80px rgba(37,99,255,0.25); }
        .plan-name { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2); }
        .plan-h { margin-top: 6px; font-size: 24px; font-weight: 500; }
        .plan-h em { font-family: 'Instrument Serif', serif; font-style: italic; color: var(--accent-2); font-weight: 400; }
        .price { margin-top: 24px; display: flex; align-items: baseline; gap: 8px; }
        .amt { font-size: 56px; font-weight: 500; letter-spacing: -0.04em; line-height: 1; }
        .cur { font-size: 22px; color: var(--ink-1); }
        .per { font-size: 13px; color: var(--ink-2); }
        .plan-desc { margin-top: 12px; color: var(--ink-1); font-size: 14px; min-height: 42px; }
        .features { list-style: none; margin-top: 24px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
        .features li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: var(--ink-1); }
        .features li::before { content: '✓'; flex-shrink: 0; width: 16px; height: 16px; border-radius: 50%; background: rgba(79,140,255,0.15); border: 1px solid rgba(79,140,255,0.4); display: grid; place-items: center; color: var(--accent-2); font-size: 9px; margin-top: 2px; }
        .plan-cta { margin-top: 32px; padding: 14px 22px; border-radius: 12px; background: rgba(120,160,230,0.06); border: 1px solid var(--line-bright); color: var(--ink-0); font-weight: 600; font-size: 14px; text-align: center; cursor: pointer; transition: all 0.2s; text-decoration: none; display: block; }
        .price-card.featured .plan-cta { background: linear-gradient(180deg, #fff, #d6e4ff); color: #050a1a; border-color: transparent; }
        .testimonial-grid { margin-top: 80px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .test-card { padding: 28px; border-radius: 20px; background: linear-gradient(180deg, rgba(10,20,48,0.5), rgba(6,11,29,0.3)); border: 1px solid var(--line); }
        .quote-mark { font-family: 'Instrument Serif', serif; font-size: 60px; color: var(--accent); line-height: 0.5; height: 22px; }
        .test-text { margin-top: 18px; font-size: 15px; color: var(--ink-0); line-height: 1.5; }
        .test-author { margin-top: 22px; display: flex; align-items: center; gap: 12px; }
        .av-blob { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--cyan)); flex-shrink: 0; display: grid; place-items: center; color: #050a1a; font-weight: 700; font-size: 14px; }
        .test-card .name { font-size: 14px; font-weight: 600; }
        .test-card .role { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
        .faq-list { margin-top: 60px; max-width: 880px; }
        .faq-item { padding: 24px 0; border-bottom: 1px solid var(--line); cursor: pointer; }
        .faq-q { display: flex; justify-content: space-between; align-items: center; font-size: 19px; font-weight: 500; letter-spacing: -0.01em; color: var(--ink-0); }
        .plus { width: 28px; height: 28px; border-radius: 50%; background: rgba(120,160,230,0.08); border: 1px solid var(--line-bright); display: grid; place-items: center; color: var(--accent-2); transition: transform 0.3s; flex-shrink: 0; }
        .faq-a { max-height: 0; overflow: hidden; transition: max-height 0.4s ease, margin-top 0.3s ease; color: var(--ink-1); font-size: 15px; line-height: 1.55; max-width: 740px; }
        .faq-a.open { max-height: 220px; margin-top: 12px; }
        .plus.open { transform: rotate(45deg); }
        .final-cta { position: relative; margin: 0 40px 80px; padding: 100px 60px; border-radius: 36px; background: radial-gradient(ellipse at 30% 0%, rgba(108,229,255,0.18), transparent 50%), radial-gradient(ellipse at 70% 100%, rgba(37,99,255,0.25), transparent 50%), linear-gradient(160deg, #0a1430, #050a1a); border: 1px solid rgba(120,200,255,0.25); overflow: hidden; text-align: center; z-index: 2; }
        .final-cta h2 { font-size: clamp(40px,6vw,84px); font-weight: 500; letter-spacing: -0.04em; line-height: 0.95; max-width: 1000px; margin: 0 auto; }
        .final-cta h2 em { font-family: 'Instrument Serif', serif; font-style: italic; color: var(--accent-2); font-weight: 400; }
        .final-cta p { margin: 24px auto 0; max-width: 540px; font-size: 17px; color: var(--ink-1); }
        .final-cta .actions { margin-top: 40px; display: inline-flex; align-items: center; gap: 16px; }
        footer { padding: 60px 40px 40px; border-top: 1px solid var(--line); position: relative; z-index: 2; }
        .foot-grid { max-width: 1280px; margin: 0 auto; display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; }
        .foot-brand { color: var(--ink-1); font-size: 14px; max-width: 360px; line-height: 1.55; margin-top: 16px; }
        .foot-col h5 { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-2); margin-bottom: 16px; }
        .foot-col ul { list-style: none; display: flex; flex-direction: column; gap: 10px; }
        .foot-col a { color: var(--ink-1); text-decoration: none; font-size: 14px; }
        .foot-col a:hover { color: var(--ink-0); }
        .foot-bottom { margin-top: 60px; padding-top: 24px; border-top: 1px solid var(--line); max-width: 1280px; margin-left: auto; margin-right: auto; display: flex; justify-content: space-between; color: var(--ink-2); font-size: 13px; font-family: 'JetBrains Mono', monospace; }
        @media (max-width: 1100px) {
          .hero-grid { grid-template-columns: 1fr; }
          .hero-stage { height: 480px; max-width: 600px; }
          .pillars, .price-grid, .testimonial-grid { grid-template-columns: 1fr; }
          .preview-grid { grid-template-columns: 1fr; }
          .feat-stack { height: auto; }
          .device { margin: 0 auto; }
          .metrics { grid-template-columns: repeat(2,1fr); }
          .nav-links { display: none; }
          .foot-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 600px) {
          .hero { padding: 120px 20px 60px; }
          section.bk { padding: 80px 20px; }
          .nav { padding: 14px 20px; }
          .final-cta { margin: 0 20px 60px; padding: 60px 24px; }
          .metrics { grid-template-columns: 1fr; }
          .foot-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ambient"></div>
      <div className="grid-bg"></div>

      {/* NAV */}
      <nav className={`nav${scrolled ? ' scrolled' : ''}`} id="nav">
        <div className="logo">
          <div className="logo-mark">
            <svg viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#7ab6ff"/>
                  <stop offset="100%" stopColor="#2563ff"/>
                </linearGradient>
              </defs>
              <path d="M6 6 L16 16 L6 26" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="22" cy="16" r="3.2" fill="url(#lg)"/>
            </svg>
          </div>
          <span className="logo-text">Pyfit<span className="dot">.</span></span>
        </div>
        <div className="nav-links">
          <a href="#how">Cómo funciona</a>
          <a href="#features">Producto</a>
          <a href="#evidence">Evidencia</a>
          <a href="#pricing">Planes</a>
          <a href="#faq" className="pill">Beta IA</a>
        </div>
        <Link href="/auth" className="cta-btn">Empezar gratis <span className="arr">→</span></Link>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-left">
            <div className="eyebrow">
              <span className="live-dot"></span>
              <span>SISTEMA v1.0 · IA EN TIEMPO REAL</span>
            </div>
            <h1 className="hero-title">
              <span className="grad">Entrenamiento</span><br/>
              de <em>precisión</em>,<br/>
              respaldado por <span className="grad">evidencia.</span>
            </h1>
            <p className="hero-sub">
              Pyfit usa modelos de IA y los más altos estándares de la ciencia del ejercicio para diseñar tu plan, ajustar cada sesión y proyectar tu progreso — adaptado a ti, semana tras semana.
            </p>
            <div className="hero-actions">
              <Link href="/auth" className="cta-btn">Comenzar mi plan <span className="arr">→</span></Link>
              <a href="#features" className="btn-ghost"><span className="play-ico">▶</span> Ver el sistema</a>
            </div>
            <div className="trust-row">
              <div className="avatars">
                <div className="av" style={{background:'linear-gradient(135deg,#4f8cff,#0a1430)'}}></div>
                <div className="av" style={{background:'linear-gradient(135deg,#6ce5ff,#1a3a6f)'}}></div>
                <div className="av" style={{background:'linear-gradient(135deg,#7ab6ff,#243a6f)'}}></div>
                <div className="av" style={{background:'linear-gradient(135deg,#90c5ff,#0a1430)'}}></div>
              </div>
              <div className="trust-text">
                <strong>Beta abierta</strong> — únete a los primeros usuarios<br/>
                <span className="stars">★★★★★</span> Entrenamiento adaptativo con IA
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-stage" id="heroStage">
              <div className="hero-photo">
                <img src="/assets/lifter.jpg" alt="Atleta entrenando" />
                <div className="scan"></div>
              </div>
              <div className="widget w-heart">
                <div className="pulse-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h4l3-7 4 14 3-7h4"/>
                  </svg>
                </div>
                <div>
                  <div className="w-label">FC en zona</div>
                  <div className="w-value">142<span className="w-unit">bpm</span></div>
                </div>
              </div>
              <div className="widget w-graph">
                <div className="w-label">Volumen semanal · Push</div>
                <div className="w-value">14,820<span className="w-unit">kg · +8.2%</span></div>
                <div className="bars">
                  {[30,45,38,60,52,72,88].map((h,i) => (
                    <span key={i} style={{height:`${h}%`, animationDelay:`${i*0.1}s`}}></span>
                  ))}
                </div>
              </div>
              <div className="widget w-ai">
                <div className="ai-row">
                  <div className="ai-icon">✦</div>
                  <div>
                    <div className="ai-text">RPE ajustado a 7</div>
                    <div className="ai-meta">basado en tu check-in de hoy</div>
                  </div>
                </div>
                <div className="ai-progress"><span></span></div>
              </div>
              <div className="widget w-set">
                <div className="w-label">Sentadilla · Serie 3/4</div>
                <div className="set-row"><span className="name">Carga</span><span className="val">82.5 kg</span></div>
                <div className="set-row"><span className="name">Reps</span><span className="val">8 / 8</span></div>
                <div className="set-row"><span className="name">RPE</span><span className="val">7.5</span><span className="check">✓</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-band">
        <div className="label">PRINCIPIOS · CIENCIA</div>
        <div className="marquee-track">
          {['Sobrecarga progresiva','Volumen efectivo','RPE auto-regulado','Periodización en bloques','Recuperación medida','Hipertrofia basada en evidencia','Sobrecarga progresiva','Volumen efectivo','RPE auto-regulado','Periodización en bloques','Recuperación medida','Hipertrofia basada en evidencia'].map((t,i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="bk" id="how">
        <div className="container">
          <div>
            <div className="section-eyebrow"><span className="num">01</span> CÓMO FUNCIONA</div>
            <h2 className="section-title">Tres capas que convierten <em>datos crudos</em><br/>en un plan que <span className="muted">de verdad funciona.</span></h2>
            <p className="section-lede">No es una app más con templates. Pyfit combina la ciencia del ejercicio con un motor de IA que aprende de cada sesión que registras.</p>
          </div>
          <div className="pillars">
            <div className="pillar">
              <div className="num-tag">// 01 · INPUT</div>
              <h3>Lectura <em>biométrica</em> continua.</h3>
              <p>Registras tu estado de ánimo, sueño, HRV y ubicación. Cada variable alimenta el modelo antes de generar tu sesión.</p>
              <div className="visual vis-mesh">
                <svg viewBox="0 0 200 80">
                  <line x1="20" y1="60" x2="60" y2="20"/><line x1="60" y1="20" x2="100" y2="50"/>
                  <line x1="100" y1="50" x2="140" y2="15"/><line x1="140" y1="15" x2="180" y2="40"/>
                  <line x1="60" y1="20" x2="100" y2="20"/><line x1="100" y1="20" x2="140" y2="60"/>
                  <circle cx="20" cy="60" r="3"/><circle cx="60" cy="20" r="3"/>
                  <circle cx="100" cy="50" r="3"/><circle cx="100" cy="20" r="3"/>
                  <circle cx="140" cy="15" r="3"/><circle cx="140" cy="60" r="3"/><circle cx="180" cy="40" r="3"/>
                </svg>
              </div>
            </div>
            <div className="pillar">
              <div className="num-tag">// 02 · PROCESAMIENTO</div>
              <h3>Motor de IA con <em>contexto</em> como base.</h3>
              <p>La IA evalúa tu fatiga acumulada, implementos disponibles, objetivo y señales del día para calcular la sesión óptima.</p>
              <div className="visual vis-wave">
                <div className="bars2">
                  {Array.from({length:18}).map((_,i) => <span key={i} style={{animationDelay:`${i*0.05}s`}}></span>)}
                </div>
              </div>
            </div>
            <div className="pillar">
              <div className="num-tag">// 03 · OUTPUT</div>
              <h3>Plan <em>vivo</em> que se ajusta a ti.</h3>
              <p>Series, RPE y ejercicios se recalculan con cada sesión. Si algo no funciona, el sistema lo detecta y lo cambia.</p>
              <div className="visual vis-orbit">
                <div className="ring r2"></div>
                <div className="ring r1"></div>
                <div className="core"></div>
                <div className="planet"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EVIDENCE STRIP */}
      <section className="evidence-bk" id="evidence">
        <div className="evidence-strip">
          <div className="evidence-bg" id="evidenceBg"></div>
          <div className="evidence-content">
            <div className="evidence-inner">
              <div className="evidence-meta">ADAPTACIÓN · TIEMPO REAL</div>
              <p className="evidence-quote">
                "Cada sesión generada considera tu historial real, tus señales de hoy y los <em>implementos que tienes disponibles</em> — no un template genérico."
              </p>
              <div className="evidence-meta" style={{marginTop:'32px'}}>PYFIT · MOTOR DE GENERACIÓN ADAPTATIVA</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section className="bk" id="features">
        <div className="container">
          <div>
            <div className="section-eyebrow"><span className="num">02</span> PRODUCTO</div>
            <h2 className="section-title">Una interfaz que <em>respira</em> contigo.<br/><span className="muted">Sin fricción. Sin atajos sin sustento.</span></h2>
          </div>
          <div className="preview-grid">
            <div className="device" id="preview">
              <div className="device-screen">
                <div className="device-notch"></div>
                <div className="app-status"><span>9:41</span><span>5G ◉◉◉ 92%</span></div>
                <div className="app-body">
                  <div className="app-greet">Buenos días, atleta</div>
                  <div className="app-h">Sesión de hoy<br/><em>Empuje · Semana 3</em></div>
                  <div className="app-card">
                    <div className="card-tag">GENERADO POR IA</div>
                    <div className="card-title">Press banca con pausa</div>
                    <div className="card-meta"><span>4 series</span><span><b>RPE 7</b></span><span>60 min</span></div>
                    <div className="start-btn">Comenzar sesión →</div>
                  </div>
                  <div className="app-section-h"><span>Ejercicios</span><span>6 total</span></div>
                  <div className="app-list">
                    <div className="app-item"><div className="ico">↗</div><div><div className="ttl">Press inclinado</div><div className="meta">3×10 · Mancuernas</div></div><div className="arrow">›</div></div>
                    <div className="app-item"><div className="ico">●</div><div><div className="ttl">Fondos</div><div className="meta">3×12 · Peso corporal</div></div><div className="arrow">›</div></div>
                    <div className="app-item"><div className="ico">⟳</div><div><div className="ttl">Movilidad torácica</div><div className="meta">3 series · activación</div></div><div className="arrow">›</div></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="feat-stack">
              <div className="feat-card">
                <div className="feat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v3M12 19v3M5 12H2M22 12h-3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>
                    <circle cx="12" cy="12" r="4"/>
                  </svg>
                </div>
                <div><h4>Auto-regulación <em>diaria</em></h4><p>Cada mañana el plan calibra cargas, volumen y ejercicios según tu estado real, no el del lunes pasado.</p></div>
                <div className="stat"><div className="big">+34%</div><div className="lab">adherencia</div></div>
              </div>
              <div className="feat-card">
                <div className="feat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>
                  </svg>
                </div>
                <div><h4>Progresión <em>inteligente</em></h4><p>El sistema aprende de tu feedback post-sesión y ajusta el plan para la siguiente semana automáticamente.</p></div>
                <div className="stat"><div className="big">8w</div><div className="lab">horizonte</div></div>
              </div>
              <div className="feat-card">
                <div className="feat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11V7a3 3 0 0 1 6 0v4"/><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M12 16v2"/>
                  </svg>
                </div>
                <div><h4>Datos <em>privados</em>, blindados.</h4><p>Tus datos biométricos y de entrenamiento son tuyos. Nunca se venden ni se usan para entrenar modelos de terceros.</p></div>
                <div className="stat"><div className="big">100%</div><div className="lab">tuyo</div></div>
              </div>
            </div>
          </div>
          <div className="metrics">
            <div className="metric"><div className="v">15<span className="sym">+</span></div><div className="lab">VARIABLES</div><div className="desc">Señales que Pyfit considera para cada sesión</div></div>
            <div className="metric"><div className="v">3</div><div className="lab">UBICACIONES</div><div className="desc">Gym, casa o exterior — se adapta a donde estés</div></div>
            <div className="metric"><div className="v">24<span className="sym">h</span></div><div className="lab">ADAPTACIÓN</div><div className="desc">Cada check-in recalibra tu plan del día</div></div>
            <div className="metric"><div className="v">1<span className="sym">s</span></div><div className="lab">GENERACIÓN IA</div><div className="desc">Tiempo medio para crear tu sesión personalizada</div></div>
          </div>
        </div>
      </section>

      {/* PARALLAX */}
      <section className="parallax-section">
        <div className="parallax-bg" id="parallaxBg"></div>
        <div className="parallax-overlay"></div>
        <div className="parallax-content">
          <h2>Tu mejor versión<br/>no es <em>aspiración</em>.<br/>Es un <em>protocolo</em>.</h2>
          <p>Donde otras apps muestran motivación, Pyfit muestra el siguiente paso exacto. Hoy. Y mañana. Y en seis meses.</p>
        </div>
      </section>

      {/* PRICING */}
      <section className="bk" id="pricing">
        <div className="container">
          <div>
            <div className="section-eyebrow"><span className="num">03</span> PLANES</div>
            <h2 className="section-title">Empieza gratis.<br/><em>Escala</em> cuando estés listo.</h2>
          </div>
          <div className="price-grid">
            <div className="price-card">
              <div className="plan-name">START</div>
              <div className="plan-h">Para empezar bien</div>
              <div className="price"><span className="cur">$</span><span className="amt">0</span><span className="per">/ siempre</span></div>
              <div className="plan-desc">Una rutina personalizada, registro completo y todo el motor de IA.</div>
              <ul className="features">
                <li>Plan generado por IA diariamente</li>
                <li>Check-in adaptativo</li>
                <li>Registro ilimitado de sesiones</li>
                <li>Feedback post-sesión</li>
              </ul>
              <Link href="/auth" className="plan-cta">Empezar ahora</Link>
            </div>
            <div className="price-card featured">
              <div className="plan-name">CORE</div>
              <div className="plan-h">El sistema <em>completo</em></div>
              <div className="price"><span className="cur">$</span><span className="amt">14</span><span className="per">/ mes</span></div>
              <div className="plan-desc">Auto-regulación diaria, periodización inteligente y métricas avanzadas.</div>
              <ul className="features">
                <li>Todo lo de Start</li>
                <li>Auto-regulación con IA en tiempo real</li>
                <li>Sincronización con wearables</li>
                <li>Ciclo menstrual y competiciones</li>
                <li>Soporte prioritario</li>
              </ul>
              <Link href="/auth" className="plan-cta">Probar 14 días gratis →</Link>
            </div>
            <div className="price-card">
              <div className="plan-name">ELITE</div>
              <div className="plan-h">Con coach humano</div>
              <div className="price"><span className="cur">$</span><span className="amt">79</span><span className="per">/ mes</span></div>
              <div className="plan-desc">El motor de IA + un coach certificado revisando tu progreso cada semana.</div>
              <ul className="features">
                <li>Todo lo de Core</li>
                <li>Coach S&amp;C certificado asignado</li>
                <li>Video-revisión técnica semanal</li>
                <li>Llamada estratégica mensual</li>
              </ul>
              <a href="#" className="plan-cta">Hablar con un coach</a>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bk" style={{paddingTop:0}}>
        <div className="container">
          <div>
            <div className="section-eyebrow"><span className="num">04</span> RESULTADOS</div>
            <h2 className="section-title">No son testimonios.<br/>Son <em>datos</em> con nombre y apellido.</h2>
          </div>
          <div className="testimonial-grid">
            {[
              {i:'M', n:'Mateo R.', r:'Ingeniero · Madrid', t:'Llevaba 3 años estancado en banca. Pyfit detectó que mi volumen de empuje estaba mal distribuido. En 11 semanas pasé de 95kg a 117kg.'},
              {i:'L', n:'Laura V.', r:'Fisioterapeuta · Buenos Aires', t:'Lo que más me gusta es que la IA considera mis señales del día. Es la primera app que realmente se adapta a cómo me siento.'},
              {i:'S', n:'Sofía K.', r:'Atleta · CDMX', t:'Compito en powerlifting amateur. La adaptación diaria del RPE ha sido un cambio total en cómo entreno y me recupero.'},
            ].map((t,i) => (
              <div className="test-card" key={i}>
                <div className="quote-mark">"</div>
                <div className="test-text">{t.t}</div>
                <div className="test-author">
                  <div className="av-blob">{t.i}</div>
                  <div><div className="name">{t.n}</div><div className="role">{t.r}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bk" id="faq" style={{paddingTop:0}}>
        <div className="container">
          <div>
            <div className="section-eyebrow"><span className="num">05</span> PREGUNTAS</div>
            <h2 className="section-title">Lo que la gente <em>realmente</em> nos pregunta.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f,i) => (
              <div className="faq-item" key={i} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                <div className="faq-q">{f.q}<span className={`plus${faqOpen === i ? ' open' : ''}`}>+</span></div>
                <div className={`faq-a${faqOpen === i ? ' open' : ''}`}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <div id="cta" className="final-cta">
        <h2>El próximo<br/><em>tú</em> empieza<br/>con un solo botón.</h2>
        <p>Empieza gratis hoy. Sin tarjeta. Sin promesas vacías. Solo el sistema entero, listo para mover el dato que importa: el tuyo.</p>
        <div className="actions">
          <Link href="/auth" className="cta-btn">Activar mi plan IA <span className="arr">→</span></Link>
          <a href="#how" className="btn-ghost">Ver cómo funciona</a>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="foot-grid">
          <div>
            <div className="logo">
              <div className="logo-mark">
                <svg viewBox="0 0 32 32" fill="none">
                  <path d="M6 6 L16 16 L6 26" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="22" cy="16" r="3.2" fill="url(#lg)"/>
                </svg>
              </div>
              <span className="logo-text">Pyfit<span className="dot">.</span></span>
            </div>
            <p className="foot-brand">Entrenamiento adaptativo potenciado por IA. Hecho con ciencia, no con humo.</p>
          </div>
          <div className="foot-col">
            <h5>Producto</h5>
            <ul><li><a href="#how">Cómo funciona</a></li><li><a href="#pricing">Planes</a></li><li><a href="#features">Producto</a></li></ul>
          </div>
          <div className="foot-col">
            <h5>Acceso</h5>
            <ul><li><Link href="/auth">Registrarse</Link></li><li><Link href="/auth">Iniciar sesión</Link></li></ul>
          </div>
          <div className="foot-col">
            <h5>Legal</h5>
            <ul><li><a href="#">Privacidad</a></li><li><a href="#">Términos</a></li><li><a href="#">Contacto</a></li></ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 PYFIT · CARACAS · LATAM</span>
          <span>STATUS: ✦ BETA ABIERTA</span>
        </div>
      </footer>
    </>
  )
}