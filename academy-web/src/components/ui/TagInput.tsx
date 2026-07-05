// Input de tags de ancho libre (ej. "intereses"): escribe y Enter/coma agrega,
// Backspace sobre el campo vacío quita el último. Compartido entre ProfilePage
// y el onboarding (OnboardingPage) — antes vivía duplicado en el primero.

import { useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/Icon'

export function TagInput({
  value,
  onChange,
  placeholder,
  maxTags = 20,
  maxLength = 40,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  maxLength?: number
}) {
  const [draft, setDraft] = useState('')

  function add(raw: string) {
    const tag = raw.trim().slice(0, maxLength)
    if (!tag || value.includes(tag) || value.length >= maxTags) return
    onChange([...value, tag])
  }

  function remove(tag: string) {
    onChange(value.filter((x) => x !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
      setDraft('')
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value[value.length - 1])
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-3 py-2 focus-within:border-accent focus-within:bg-surface">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-accent/10 py-1 pl-3 pr-1.5 text-xs font-medium text-accent"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            aria-label={`Quitar ${tag}`}
            className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent/20"
          >
            <Icon name="close" size={11} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          add(draft)
          setDraft('')
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="h-7 min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm text-ink outline-none placeholder:text-ink-faint"
      />
    </div>
  )
}
