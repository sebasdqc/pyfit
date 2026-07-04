import type { ReactNode } from 'react'

type Tone = 'brand' | 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'

const TONES: Record<Tone, string> = {
  brand: 'bg-brand/10 text-brand',
  accent: 'bg-accent/10 text-accent',
  ok: 'bg-ok/10 text-ok',
  warn: 'bg-warn/10 text-warn',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-surface-soft text-ink-soft border border-surface-border',
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}
