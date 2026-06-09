// Generación de informes exportables (PDF + CSV) en el cliente. jsPDF y
// jspdf-autotable se cargan con import() dinámico, así no entran en el bundle
// inicial — solo se descargan cuando el usuario pulsa "Exportar PDF".

import type { Athlete } from './mockSquad'
import { ESTADO_LABEL } from './mockSquad'
import { ESTADO_LESION, SEV_LABEL, TIPO_LABEL } from './mockInjuries'
import type { SavedTest } from './testStore'
import type { CalendarEvent } from '@/types'
import { latestWellnessByAthlete, type ReportData } from './reportData'

const EVENT_TIPO_LABEL: Record<string, string> = {
  temporada: 'Temporada', torneo: 'Torneo', concentracion: 'Concentración',
  partido: 'Partido', entrenamiento: 'Entrenamiento', evaluacion: 'Evaluación',
  descanso: 'Descanso', otro: 'Otro',
}

export interface ReportContext {
  centerName: string
  data: ReportData
  squad: Athlete[]
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtNow = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
const slug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Resumen escalar de un resultado de test (hasta 3 métricas).
function testResumen(t: SavedTest): string {
  return Object.entries(t.resultados)
    .filter(([, v]) => v === null || typeof v !== 'object')
    .slice(0, 3)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v === null ? '—' : v}`)
    .join(' · ')
}

function upcomingEvents(events: CalendarEvent[]): CalendarEvent[] {
  const t = todayISO()
  return events
    .filter((e) => (e.fecha_fin ?? e.fecha_inicio) >= t)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
    .slice(0, 12)
}

// ── Descarga genérica ────────────────────────────────────────────────────────
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function downloadCsv(filename: string, rows: (string | number)[][]) {
  // ';' como separador + BOM → Excel en español abre acentos y columnas bien.
  const csv = rows.map((r) => r.map(csvCell).join(';')).join('\r\n')
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

// ── PDF (jspdf + autotable cargados bajo demanda) ────────────────────────────
type AutoTableFn = (doc: unknown, opts: Record<string, unknown>) => void

async function newPdf(title: string, subtitle: string) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF()
  doc.setFontSize(18); doc.setTextColor(20, 30, 50)
  doc.text(title, 14, 18)
  doc.setFontSize(10); doc.setTextColor(120, 130, 150)
  doc.text(subtitle, 14, 25)
  doc.setDrawColor(225); doc.line(14, 29, 196, 29)
  return { doc, autoTable: autoTable as AutoTableFn }
}

// Pinta un título + una tabla y devuelve la Y para la siguiente sección.
function section(
  doc: any, autoTable: AutoTableFn, title: string,
  head: string[], body: (string | number)[][], startY: number,
): number {
  let y = startY
  if (y > 255) { doc.addPage(); y = 20 }
  doc.setFontSize(12); doc.setTextColor(20, 30, 50)
  doc.text(title, 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [head],
    body: body.length ? body : [['Sin registros', ...head.slice(1).map(() => '')]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 255], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 247, 252] },
    margin: { left: 14, right: 14 },
  })
  return (doc.lastAutoTable?.finalY ?? y + 10) + 10
}

// ── Informe de EQUIPO ────────────────────────────────────────────────────────
export async function downloadTeamPdf(ctx: ReportContext) {
  const { squad, data, centerName } = ctx
  const { doc, autoTable } = await newPdf('Informe de equipo', `${centerName} · ${fmtNow()}`)

  const ok = squad.filter((a) => a.estado === 'ok').length
  const duda = squad.filter((a) => a.estado === 'duda').length
  const baja = squad.filter((a) => a.estado === 'baja').length
  const activas = data.injuries.filter((i) => i.estado !== 'alta').length
  const latest = latestWellnessByAthlete(data)
  const idx = [...latest.values()].map((w) => w.indice_bienestar)
  const bienestar = idx.length ? Math.round(idx.reduce((s, n) => s + n, 0) / idx.length) : null

  doc.setFontSize(10); doc.setTextColor(60, 70, 90)
  doc.text(
    `Plantilla: ${squad.length}   ·   Disponibles: ${ok}   ·   En duda: ${duda}   ·   No disponibles: ${baja}   ·   Lesiones activas: ${activas}   ·   Bienestar medio: ${bienestar ?? '—'}`,
    14, 37,
  )

  const nameOf = (id: string) => squad.find((a) => a.id === id)?.nombre ?? id
  let y = 46
  y = section(doc, autoTable, 'Disponibilidad de la plantilla',
    ['Atleta', 'Dorsal', 'Posición', 'Grupo', 'Estado'],
    squad.map((a) => [a.nombre, a.dorsal || '', a.posicion, a.grupo, ESTADO_LABEL[a.estado]]), y)

  const inj = data.injuries.filter((i) => i.estado !== 'alta')
  y = section(doc, autoTable, 'Lesiones activas',
    ['Atleta', 'Zona', 'Tipo', 'Severidad', 'Estado', 'Días', 'RTP'],
    inj.map((i) => [nameOf(i.athleteId), i.zona, TIPO_LABEL[i.tipo], SEV_LABEL[i.severidad], ESTADO_LESION[i.estado].label, i.diasBaja, i.rtp]), y)

  const evs = upcomingEvents(data.events)
  if (evs.length) {
    section(doc, autoTable, 'Próximos eventos',
      ['Fecha', 'Tipo', 'Evento', 'Detalle'],
      evs.map((e) => [e.fecha_inicio, EVENT_TIPO_LABEL[e.tipo] ?? e.tipo, e.titulo, e.rival || e.ubicacion || e.grupo || '']), y)
  }
  doc.save(`informe-equipo-${todayISO()}.pdf`)
}

export function downloadTeamCsv(ctx: ReportContext) {
  const { squad, data } = ctx
  const latest = latestWellnessByAthlete(data)
  const injBy = new Map<string, number>()
  for (const i of data.injuries) if (i.estado !== 'alta') injBy.set(i.athleteId, (injBy.get(i.athleteId) ?? 0) + 1)
  const testBy = new Map<string, number>()
  for (const t of data.tests) testBy.set(t.athleteId, (testBy.get(t.athleteId) ?? 0) + 1)

  const rows: (string | number)[][] = [
    ['Atleta', 'Dorsal', 'Posición', 'Grupo', 'Estado', 'Lesiones activas', 'Último bienestar', 'Tests'],
    ...squad.map((a) => [
      a.nombre, a.dorsal || '', a.posicion, a.grupo, ESTADO_LABEL[a.estado],
      injBy.get(a.id) ?? 0,
      latest.get(a.id)?.indice_bienestar ?? '',
      testBy.get(a.id) ?? 0,
    ]),
  ]
  downloadCsv(`informe-equipo-${todayISO()}.csv`, rows)
}

// ── Informe POR ATLETA ───────────────────────────────────────────────────────
export async function downloadAthletePdf(ctx: ReportContext, athlete: Athlete) {
  const { data, centerName } = ctx
  const { doc, autoTable } = await newPdf('Informe de atleta', `${centerName} · ${fmtNow()}`)
  doc.setFontSize(13); doc.setTextColor(20, 30, 50)
  doc.text(athlete.nombre, 14, 38)
  doc.setFontSize(10); doc.setTextColor(60, 70, 90)
  doc.text(`Dorsal ${athlete.dorsal || '—'} · ${athlete.posicion} · ${athlete.grupo} · ${ESTADO_LABEL[athlete.estado]}`, 14, 44)

  let y = 52
  const inj = data.injuries.filter((i) => i.athleteId === athlete.id)
  y = section(doc, autoTable, 'Lesiones',
    ['Fecha', 'Zona', 'Tipo', 'Severidad', 'Estado', 'Días', 'RTP'],
    inj.map((i) => [i.fecha, i.zona, TIPO_LABEL[i.tipo], SEV_LABEL[i.severidad], ESTADO_LESION[i.estado].label, i.diasBaja, i.rtp]), y)

  const tst = data.tests.filter((t) => t.athleteId === athlete.id)
  y = section(doc, autoTable, 'Tests',
    ['Fecha', 'Test', 'Familia', 'Resumen'],
    tst.map((t) => [t.fecha, t.nombre, t.familia, testResumen(t)]), y)

  const wel = [...data.wellness.filter((w) => w.athleteId === athlete.id)]
    .sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12)
  y = section(doc, autoTable, 'Bienestar (últimos check-ins)',
    ['Fecha', 'Índice', 'Estado'],
    wel.map((w) => [w.fecha, w.indice_bienestar, w.estado]), y)

  const psy = data.psych.filter((p) => p.athleteId === athlete.id)
  section(doc, autoTable, 'Cuestionarios',
    ['Fecha', 'Instrumento', 'Índice', 'Interpretación'],
    psy.map((p) => [p.fecha, p.nombre, p.resultados.indice, p.resultados.indice_label]), y)

  doc.save(`informe-${slug(athlete.nombre)}-${todayISO()}.pdf`)
}

export function downloadAthleteCsv(ctx: ReportContext, athlete: Athlete) {
  const { data } = ctx
  const body: (string | number)[][] = []
  for (const i of data.injuries.filter((x) => x.athleteId === athlete.id))
    body.push(['Lesión', i.fecha, `${i.zona} (${TIPO_LABEL[i.tipo]}, ${SEV_LABEL[i.severidad]})`, `${ESTADO_LESION[i.estado].label} · ${i.diasBaja}d · RTP ${i.rtp}`])
  for (const t of data.tests.filter((x) => x.athleteId === athlete.id))
    body.push(['Test', t.fecha, `${t.nombre} (${t.familia})`, testResumen(t)])
  for (const w of data.wellness.filter((x) => x.athleteId === athlete.id))
    body.push(['Bienestar', w.fecha, 'Check-in', `${w.indice_bienestar} (${w.estado})`])
  for (const p of data.psych.filter((x) => x.athleteId === athlete.id))
    body.push(['Cuestionario', p.fecha, p.nombre, `${p.resultados.indice} · ${p.resultados.indice_label}`])
  body.sort((a, b) => String(a[1]).localeCompare(String(b[1])))

  downloadCsv(`informe-${slug(athlete.nombre)}-${todayISO()}.csv`, [['Categoría', 'Fecha', 'Detalle', 'Resultado'], ...body])
}
