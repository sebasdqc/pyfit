// Indicador de avance del wizard.
//
// Es obligatorio completarlo, así que la prioridad es que se vea cuán corto es
// y dónde estás parado. En escritorio va como riel vertical con todos los
// pasos nombrados; en móvil colapsa a una barra fina + "Paso 3 de 5", que es
// la misma información sin comerse la pantalla.

export interface PasoRiel {
  id: string
  label: string
}

export function StepRail({
  pasos,
  indiceActual,
  textoPaso,
}: {
  pasos: PasoRiel[]
  // 0-based sobre `pasos`; -1 antes de empezar (pantalla de presentación).
  indiceActual: number
  textoPaso: string
}) {
  const total = pasos.length
  const completados = Math.max(0, indiceActual)
  const porcentaje = total === 0 ? 0 : (completados / total) * 100

  return (
    <>
      {/* Móvil: barra de progreso + contador. */}
      <div className="lg:hidden">
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completados}
          aria-label={textoPaso}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-2.5 text-xs font-medium text-white/55">{textoPaso}</p>
      </div>

      {/* Escritorio: riel vertical con los pasos nombrados. */}
      <ol className="hidden lg:flex lg:flex-col lg:gap-0.5">
        {pasos.map((paso, i) => {
          const hecho = i < indiceActual
          const actual = i === indiceActual
          return (
            <li key={paso.id} className="flex items-stretch gap-3.5">
              {/* Columna del marcador + la línea que une con el siguiente paso. */}
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                    hecho
                      ? 'border-accent bg-accent text-perf-bg'
                      : actual
                        ? 'border-accent text-accent'
                        : 'border-white/20 text-white/40',
                  ].join(' ')}
                >
                  {hecho ? (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
                      <path
                        d="M2.5 6.2 4.8 8.5 9.5 3.8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                {i < total - 1 && (
                  <span
                    aria-hidden
                    className={[
                      'my-1 w-px flex-1 transition-colors',
                      hecho ? 'bg-accent/50' : 'bg-white/12',
                    ].join(' ')}
                  />
                )}
              </div>

              <span
                className={[
                  'pb-5 pt-0.5 text-sm transition-colors',
                  actual ? 'font-semibold text-white' : hecho ? 'text-white/70' : 'text-white/40',
                ].join(' ')}
                aria-current={actual ? 'step' : undefined}
              >
                {paso.label}
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}
