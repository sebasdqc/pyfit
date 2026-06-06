import { useContext } from 'react'
import { ActiveCenterContext, type ActiveCenterValue } from './ActiveCenterContext'

export function useActiveCenter(): ActiveCenterValue {
  const ctx = useContext(ActiveCenterContext)
  if (!ctx) throw new Error('useActiveCenter debe usarse dentro de <ActiveCenterProvider>')
  return ctx
}
