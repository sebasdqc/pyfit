import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ErrorBoundary, initSentry } from './lib/sentry'
import './index.css'

// Antes de cualquier render, para que un error durante el montaje inicial
// también quede capturado. Es no-op si no hay `VITE_SENTRY_DSN`.
initSentry()

/**
 * Pantalla de último recurso. Hasta ahora un error no atrapado en el árbol de
 * React dejaba la página **en blanco**, sin mensaje ni forma de salir. El
 * `ErrorBoundary` de Sentry además reporta el error con el stack del componente.
 *
 * A propósito sin `useT()` ni clases del sistema de diseño: si esto se
 * renderiza, algo de la app ya falló, y no puede depender de los providers de
 * locale/tema para poder mostrarse. Queda solo en español.
 */
function PantallaDeError() {
  return (
    <div
      role="alert"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
        background: 'var(--color-surface-soft, #f9fafb)',
        fontFamily: "'Inter', system-ui, sans-serif",
        color: 'var(--color-ink, #111827)',
      }}
    >
      <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgb(204 31 54)',
            marginBottom: '0.75rem',
          }}
        >
          Zyfit Academy
        </p>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Algo se rompió de nuestro lado
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--color-ink-muted, #6b7280)', marginBottom: '1.5rem' }}>
          Ya nos llegó el aviso. Vuelve a cargar la página; si sigue pasando, escríbenos desde Soporte.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            minHeight: '2.75rem',
            padding: '0 1.25rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'rgb(204 31 54)',
            color: '#fff',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Recargar
        </button>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={<PantallaDeError />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
