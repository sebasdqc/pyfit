import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type UnitSystem = 'metric' | 'imperial'

const STORAGE_KEY = 'unit_system'

interface UnitsContextType {
  unitSystem: UnitSystem
  setUnitSystem: (s: UnitSystem) => void
  // Display: number + label (e.g. "80 kg" / "176 lb")
  displayWeight: (kg: number | null | undefined) => string
  displayHeight: (cm: number | null | undefined) => string
  // Input value (number only, for TextInput)
  toInputWeight: (kg: number | null | undefined) => string
  toInputHeight: (cm: number | null | undefined) => string
  // Back to metric for API save
  fromInputWeight: (input: string) => string  // lb → kg string (or passthrough)
  fromInputHeight: (input: string) => string  // in  → cm string (or passthrough)
  weightLabel: string   // "kg" | "lb"
  heightLabel: string   // "cm" | "in"
}

const UnitsContext = createContext<UnitsContextType | null>(null)

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('metric')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(v => {
      if (v === 'imperial' || v === 'metric') setUnitSystemState(v as UnitSystem)
    })
  }, [])

  function setUnitSystem(s: UnitSystem) {
    setUnitSystemState(s)
    AsyncStorage.setItem(STORAGE_KEY, s)
  }

  function displayWeight(kg: number | null | undefined): string {
    if (kg == null) return '—'
    if (unitSystem === 'imperial') return `${Math.round(Number(kg) * 2.20462)} lb`
    return `${kg} kg`
  }

  function displayHeight(cm: number | null | undefined): string {
    if (cm == null) return '—'
    if (unitSystem === 'imperial') {
      const totalIn = Math.round(Number(cm) / 2.54)
      const ft = Math.floor(totalIn / 12)
      const inches = totalIn % 12
      return `${ft}'${inches}"`
    }
    return `${cm} cm`
  }

  function toInputWeight(kg: number | null | undefined): string {
    if (kg == null) return ''
    if (unitSystem === 'imperial') return String(Math.round(Number(kg) * 2.20462))
    return String(kg)
  }

  function toInputHeight(cm: number | null | undefined): string {
    if (cm == null) return ''
    if (unitSystem === 'imperial') return String(Math.round(Number(cm) / 2.54))
    return String(cm)
  }

  function fromInputWeight(input: string): string {
    if (unitSystem === 'imperial') {
      const lb = Number(input.replace(',', '.'))
      if (isNaN(lb) || lb <= 0) return ''
      return String(Math.round(lb / 2.20462 * 10) / 10)
    }
    return input
  }

  function fromInputHeight(input: string): string {
    if (unitSystem === 'imperial') {
      const inches = Number(input.replace(',', '.'))
      if (isNaN(inches) || inches <= 0) return ''
      return String(Math.round(inches * 2.54))
    }
    return input
  }

  const weightLabel = unitSystem === 'imperial' ? 'lb' : 'kg'
  const heightLabel = unitSystem === 'imperial' ? 'in' : 'cm'

  return (
    <UnitsContext.Provider value={{
      unitSystem, setUnitSystem,
      displayWeight, displayHeight,
      toInputWeight, toInputHeight,
      fromInputWeight, fromInputHeight,
      weightLabel, heightLabel,
    }}>
      {children}
    </UnitsContext.Provider>
  )
}

export function useUnits(): UnitsContextType {
  const ctx = useContext(UnitsContext)
  if (!ctx) throw new Error('useUnits must be inside UnitsProvider')
  return ctx
}
