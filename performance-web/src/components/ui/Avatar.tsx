// Avatar circular. Si recibe `src` (foto del atleta) muestra la imagen;
// si no, cae a las iniciales del nombre sobre fondo oscuro plano.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({
  name,
  src,
  size = 36,
  className = '',
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`inline-block shrink-0 rounded-full border border-perf-border object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-perf-border bg-perf-surface2 font-semibold text-white/85 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  )
}
