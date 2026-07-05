// Grilla de inputs de redes sociales — compartida entre ProfilePage y el
// onboarding (OnboardingPage).

import { REDES_SOCIALES } from '@/lib/redesSociales'

export function RedesSocialesFields({
  value,
  onChange,
}: {
  value: Record<string, string>
  onChange: (redes: Record<string, string>) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {REDES_SOCIALES.map((red) => (
        <label key={red.key} className="block">
          <span className="mb-1 block text-[11px] text-ink-muted">{red.label}</span>
          <input
            value={value[red.key] ?? ''}
            placeholder={red.placeholder}
            onChange={(e) => onChange({ ...value, [red.key]: e.target.value })}
            className="input"
          />
        </label>
      ))}
    </div>
  )
}
