import { useContext } from 'react'
import { SquadContext, type SquadValue } from './SquadContext'

export function useSquad(): SquadValue {
  const ctx = useContext(SquadContext)
  if (!ctx) throw new Error('useSquad debe usarse dentro de <SquadProvider>')
  return ctx
}
