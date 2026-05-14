import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { getAccessToken, getUser } from '../lib/storage'

export default function Index() {
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    async function check() {
      const token = await getAccessToken()
      if (!token) {
        setTarget('/(auth)/intro')
        return
      }
      const user = await getUser()
      if (user && !user.onboarding_completo) {
        setTarget('/(auth)/onboarding')
      } else {
        setTarget('/(app)/dashboard')
      }
    }
    check()
  }, [])

  if (!target) return null
  return <Redirect href={target as any} />
}
