// Modelo corporal (frente/espalda) para ubicar visualmente las lesiones. La
// figura es un maniquí estilizado compuesto por primitivas (cabeza, torso,
// extremidades) sobre un viewBox 200×415. Encima se posicionan marcadores por
// lesión, coloreados por severidad y seleccionables. Plano, sin gradientes.

import { SEV_HEX, type Injury, type Vista } from '@/lib/mockInjuries'

function Figure({ vista }: { vista: Vista }) {
  return (
    <g fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.14)" strokeWidth={1.4} strokeLinejoin="round">
      {/* cabeza + cuello */}
      <circle cx={100} cy={34} r={19} />
      <rect x={92} y={48} width={16} height={13} rx={5} />
      {/* torso */}
      <path d="M64,72 L136,72 L120,150 L125,202 L100,213 L75,202 L80,150 Z" />
      {/* hombros */}
      <circle cx={60} cy={80} r={12} />
      <circle cx={140} cy={80} r={12} />
      {/* brazo izquierdo (del espectador) */}
      <rect x={40} y={84} width={15} height={66} rx={7} />
      <rect x={35} y={146} width={12} height={60} rx={6} />
      <circle cx={41} cy={212} r={7} />
      {/* brazo derecho */}
      <rect x={145} y={84} width={15} height={66} rx={7} />
      <rect x={153} y={146} width={12} height={60} rx={6} />
      <circle cx={159} cy={212} r={7} />
      {/* muslos */}
      <rect x={74} y={206} width={22} height={92} rx={11} />
      <rect x={104} y={206} width={22} height={92} rx={11} />
      {/* rodillas */}
      <circle cx={85} cy={300} r={10} />
      <circle cx={115} cy={300} r={10} />
      {/* piernas */}
      <rect x={78} y={306} width={17} height={80} rx={8} />
      <rect x={105} y={306} width={17} height={80} rx={8} />
      {/* pies */}
      <ellipse cx={86} cy={394} rx={10} ry={7} />
      <ellipse cx={114} cy={394} rx={10} ry={7} />
      {/* columna (solo espalda) */}
      {vista === 'espalda' && (
        <>
          <line x1={100} y1={74} x2={100} y2={205} stroke="rgba(255,255,255,0.11)" strokeWidth={1.2} />
          <line x1={82} y1={96} x2={118} y2={96} stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
        </>
      )}
    </g>
  )
}

export function BodyMap({
  vista,
  injuries,
  selectedId,
  onSelect,
  onPlace,
  pending,
}: {
  vista: Vista
  injuries: Injury[]
  selectedId: string | null
  onSelect: (id: string) => void
  // Modo "ubicar": al pulsar el maniquí, devuelve las coordenadas del viewBox
  // (200×415). `pending` pinta el marcador provisional mientras se elige el sitio.
  onPlace?: (x: number, y: number) => void
  pending?: { x: number; y: number } | null
}) {
  const visibles = injuries.filter((i) => i.vista === vista && i.estado !== 'alta')

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onPlace) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 200)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 415)
    onPlace(Math.max(0, Math.min(200, x)), Math.max(0, Math.min(415, y)))
  }

  return (
    <svg
      viewBox="0 0 200 415"
      onClick={handleClick}
      className={`mx-auto h-[440px] w-auto select-none ${onPlace ? 'cursor-crosshair' : ''}`}
    >
      <Figure vista={vista} />
      {visibles.map((inj) => {
        const sel = inj.id === selectedId
        const hex = SEV_HEX[inj.severidad]
        return (
          <g
            key={inj.id}
            className="cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onSelect(inj.id) }}
          >
            {sel && <circle cx={inj.x} cy={inj.y} r={13} fill="none" stroke={hex} strokeWidth={1.5} opacity={0.55} />}
            <circle cx={inj.x} cy={inj.y} r={sel ? 7 : 6} fill={hex} stroke="#0a0e1a" strokeWidth={2} />
          </g>
        )
      })}
      {pending && (
        <g className="pointer-events-none">
          <circle cx={pending.x} cy={pending.y} r={12} fill="none" stroke="#14b8a6" strokeWidth={1.5} opacity={0.6} />
          <circle cx={pending.x} cy={pending.y} r={6} fill="#14b8a6" stroke="#0a0e1a" strokeWidth={2} />
        </g>
      )}
    </svg>
  )
}
