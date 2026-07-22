import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

// Suscripción a "reducir movimiento" del SO (WCAG 2.3.3). Compartido por
// login, portal de coach y onboarding — cualquier pantalla con auroras/
// entradas/auto-cycle animados debe consultarlo y quedarse quieta si el
// usuario lo pidió.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then(v => { if (mounted) setReduce(!!v) })
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReduce(!!v))
    return () => { mounted = false; sub?.remove?.() }
  }, [])
  return reduce
}
