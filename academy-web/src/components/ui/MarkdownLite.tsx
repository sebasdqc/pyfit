// Subset de markdown deliberadamente chico — NO es un parser genérico.
// Lo comparten el blog (BlogPostPage) y el texto de las lecciones
// (Lesson.contenido), que es texto plano en la BD: los cursos ya publicados
// traen **negritas**, *cursivas*, listas y alguna tabla escritas como markdown,
// y sin esto se veían los símbolos literales.
//
// Soporta:
//   bloques  → "## " H2, "### " H3, listas con "- " / "* " / "• ", listas
//              numeradas "1. " / "1) ", tablas con "|"
//   inline   → [texto](url), **negrita**, *cursiva*, `código`
// Cualquier otra línea es un párrafo de texto plano (respeta los saltos
// simples), así que el contenido viejo sin markdown se ve igual que antes.
//
// Seguridad: es React puro (nunca dangerouslySetInnerHTML) y los enlaces solo
// aceptan http(s), mailto o rutas internas — el contenido lo escriben
// instructores, así que un "javascript:" no debe poder convertirse en href.

import type { ReactNode } from 'react'

const INLINE_RE =
  /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|`([^`\n]+)`|(?<![\w*])\*(?![\s*])([^*\n]+?)(?<![\s*])\*(?![\w*])/g

const SAFE_HREF_RE = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i

export function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    const key = `${keyPrefix}-${i++}`
    if (match[1] !== undefined) {
      if (SAFE_HREF_RE.test(match[2])) {
        const external = /^https?:/i.test(match[2])
        parts.push(
          <a
            key={key}
            href={match[2]}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="font-medium text-accent underline underline-offset-2 hover:text-accent-dark"
          >
            {match[1]}
          </a>,
        )
      } else {
        // Esquema no permitido: se muestra el texto sin enlace.
        parts.push(match[1])
      }
    } else if (match[3] !== undefined) {
      parts.push(<strong key={key} className="font-semibold text-ink">{match[3]}</strong>)
    } else if (match[4] !== undefined) {
      parts.push(
        <code key={key} className="rounded bg-surface-soft px-1 py-0.5 text-[0.9em] text-ink">{match[4]}</code>,
      )
    } else {
      parts.push(<em key={key}>{match[5]}</em>)
    }
    last = index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function isTableSeparatorRow(cells: string[]) {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()))
}

function parseTableRows(lines: string[]) {
  return lines.map((line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
}

const BULLET_RE = /^[-*•]\s+(.+)$/
const ORDERED_RE = /^\d+[.)]\s+(.+)$/

function Table({ lines, index }: { lines: string[]; index: number }) {
  const [header, ...rest] = parseTableRows(lines)
  const rows = rest.filter((r) => !isTableSeparatorRow(r))
  return (
    <div className="my-2 overflow-x-auto rounded-xl border border-surface-border">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="bg-surface-soft">
            {header.map((cell, i) => (
              <th key={i} className="border-b border-surface-border px-4 py-2.5 text-left font-semibold text-ink">
                {renderInline(cell, `th-${index}-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-b border-surface-border last:border-0">
              {row.map((cell, c) => (
                <td key={c} className="px-4 py-2.5 align-top text-ink-soft">
                  {renderInline(cell, `td-${index}-${r}-${c}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Un bloque (separado por línea en blanco) puede mezclar párrafo y listas. */
function Block({ block, index }: { block: string; index: number }) {
  if (block.startsWith('### ')) {
    return <h3 className="mt-6 text-lg font-semibold text-ink">{renderInline(block.slice(4), `h3-${index}`)}</h3>
  }
  if (block.startsWith('## ')) {
    return <h2 className="mt-8 text-xl font-bold tracking-tight text-ink">{renderInline(block.slice(3), `h2-${index}`)}</h2>
  }

  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length >= 2 && lines.every((l) => l.includes('|'))) {
    return <Table lines={lines} index={index} />
  }

  // Agrupa líneas consecutivas del mismo tipo: párrafo / viñetas / numeradas.
  const nodes: ReactNode[] = []
  let para: string[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flushPara = () => {
    if (para.length === 0) return
    const k = `p-${index}-${nodes.length}`
    nodes.push(<p key={k} className="whitespace-pre-line">{renderInline(para.join('\n'), k)}</p>)
    para = []
  }
  const flushList = () => {
    if (!list) return
    const k = `l-${index}-${nodes.length}`
    const Tag = list.ordered ? 'ol' : 'ul'
    nodes.push(
      <Tag key={k} className={`flex flex-col gap-1.5 pl-5 ${list.ordered ? 'list-decimal' : 'list-disc'}`}>
        {list.items.map((item, n) => <li key={n}>{renderInline(item, `${k}-${n}`)}</li>)}
      </Tag>,
    )
    list = null
  }

  for (const line of lines) {
    const bullet = BULLET_RE.exec(line)
    const ordered = bullet ? null : ORDERED_RE.exec(line)
    const match = bullet ?? ordered
    if (match) {
      flushPara()
      const isOrdered = !bullet
      if (list && list.ordered !== isOrdered) flushList()
      if (!list) list = { ordered: isOrdered, items: [] }
      list.items.push(match[1])
    } else {
      flushList()
      para.push(line)
    }
  }
  flushList()
  flushPara()

  return nodes.length === 1 ? <>{nodes[0]}</> : <div className="flex flex-col gap-2">{nodes}</div>
}

export function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="flex max-w-prose flex-col gap-4 text-[15px] leading-relaxed text-ink-soft">
      {(blocks.length > 0 ? blocks : [text]).map((b, i) => <Block key={i} block={b} index={i} />)}
    </div>
  )
}
