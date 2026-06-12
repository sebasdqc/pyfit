import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { getAccessToken, getUser, getCoachUser, getSliderSeen } from '../lib/storage'

export default function Index() {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const token = await getAccessToken()
      if (cancelled) return
      if (!token) {
        // Sin sesión de atleta: si hay sesión de coach, entrar al portal.
        const coach = await getCoachUser()
        if (cancelled) return
        if (coach) { setTarget('/(coach)/inicio'); return }
        // Primera apertura → mostrar slider de valor; después → intro animado.
        const sliderSeen = await getSliderSeen()
        if (cancelled) return
        setTarget(sliderSeen ? '/(auth)/intro' : '/(auth)/onboarding-slider')
        return
      }
      const user = await getUser()
      if (cancelled) return
      if (user && !user.onboarding_completo) {
        setTarget('/(auth)/onboarding')
      } else {
        setTarget('/(app)/dashboard')
      }
    }
    check()
    return () => { cancelled = true }
  }, [])

  if (!target) return null
  return <Redirect href={target as any} />
}
