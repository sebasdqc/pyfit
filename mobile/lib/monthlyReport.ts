import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { apiGet } from './api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrupoFav { key: string; label: string; count: number }
interface SesionDetalle {
  fecha: string; titulo: string; rpe_real: number | null
  cumplimiento: number | null; duracion: number; rating: number | null
}
interface ReportData {
  nombre: string; nivel_label: string; mes_label: string
  year: number; month: number
  sesiones_completadas: number; sesiones_planificadas: number
  consistencia_pct: number; rpe_promedio: number | null
  cumplimiento_promedio: number | null; racha_actual: number; mejor_racha: number
  total_sesiones: number; distribucion_tipo: { fuerza: number; cardio: number; movilidad: number }
  top_grupos: GrupoFav[]; adn_entrenamiento: string | null
  sesiones_detalle: SesionDetalle[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bar(pct: number, color: string, label: string, value: string) {
  const w = Math.max(0, Math.min(100, pct))
  return `
    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${w}%;background:${color};"></div>
      </div>
      <div class="bar-value">${value}</div>
    </div>`
}

function stars(n: number | null) {
  if (n === null) return '<span style="color:#ccc">—</span>'
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function fmtFecha(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${d} ${MESES[m - 1]}`
}

function rpeColor(rpe: number | null) {
  if (rpe === null) return '#999'
  if (rpe <= 5) return '#32c896'
  if (rpe <= 7) return '#4f8cff'
  if (rpe <= 8) return '#ffaa32'
  return '#ff6b6b'
}

function cumColor(pct: number | null) {
  if (pct === null) return '#999'
  if (pct >= 90) return '#32c896'
  if (pct >= 70) return '#4f8cff'
  return '#ffaa32'
}

// ─── HTML template ────────────────────────────────────────────────────────────

function buildHTML(d: ReportData): string {
  const totalDist = d.distribucion_tipo.fuerza + d.distribucion_tipo.cardio + d.distribucion_tipo.movilidad || 1
  const generadoEl = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const sessionRows = d.sesiones_detalle.length === 0
    ? `<tr><td colspan="5" style="text-align:center;color:#999;padding:20px">Sin sesiones registradas este mes</td></tr>`
    : d.sesiones_detalle.map(s => `
      <tr>
        <td class="td-fecha">${fmtFecha(s.fecha)}</td>
        <td class="td-titulo">${s.titulo}</td>
        <td style="text-align:center;color:${rpeColor(s.rpe_real)};font-weight:600">
          ${s.rpe_real !== null ? s.rpe_real : '—'}
        </td>
        <td style="text-align:center;color:${cumColor(s.cumplimiento)};font-weight:600">
          ${s.cumplimiento !== null ? s.cumplimiento + '%' : '—'}
        </td>
        <td style="text-align:center;color:#f59e0b;font-size:13px">${stars(s.rating)}</td>
      </tr>`).join('')

  const gruposHTML = d.top_grupos.length === 0
    ? '<p style="color:#999;font-size:13px">Sin datos de grupos musculares</p>'
    : d.top_grupos.map(g => {
        const COLORES: Record<string, string> = {
          empujes: '#4f8cff', tracciones: '#32c896', piernas_quad: '#ff8c42', piernas_glut: '#c084fc',
        }
        const color = COLORES[g.key] ?? '#4f8cff'
        return `<span class="chip" style="border-color:${color}40;background:${color}18;color:${color}">${g.label} <b>${g.count}×</b></span>`
      }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #111; font-size: 14px; line-height: 1.5; }
  .page { max-width: 680px; margin: 0 auto; padding: 40px 32px; }

  /* Header */
  .report-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #4f8cff; padding-bottom: 20px; margin-bottom: 32px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #4f8cff; }
  .brand span { color: #111; }
  .header-right { text-align: right; }
  .mes-label { font-size: 18px; font-weight: 700; color: #111; letter-spacing: -0.3px; }
  .user-label { font-size: 13px; color: #666; margin-top: 2px; }
  .nivel-badge { display: inline-block; margin-top: 6px; padding: 3px 10px; border-radius: 20px; background: #4f8cff18; border: 1px solid #4f8cff40; color: #4f8cff; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }

  /* Section */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }

  /* Metric grid */
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .metric { background: #f8f9ff; border-radius: 12px; padding: 14px 12px; text-align: center; }
  .metric-val { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #4f8cff; line-height: 1; }
  .metric-val.green { color: #32c896; }
  .metric-val.orange { color: #ffaa32; }
  .metric-val.red { color: #ff6b6b; }
  .metric-lbl { font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #999; margin-top: 5px; }

  /* Bars */
  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .bar-label { width: 80px; font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }
  .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
  .bar-fill { height: 8px; border-radius: 4px; transition: width 0s; }
  .bar-value { width: 30px; font-size: 12px; font-weight: 700; color: #333; text-align: right; flex-shrink: 0; }

  /* Chips */
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { padding: 5px 12px; border-radius: 8px; border: 1px solid; font-size: 12px; font-weight: 500; }

  /* Table */
  .sessions-table { width: 100%; border-collapse: collapse; }
  .sessions-table th { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #999; text-align: left; padding: 8px 10px; border-bottom: 2px solid #f0f0f0; }
  .sessions-table th:not(:first-child):not(:nth-child(2)) { text-align: center; }
  .sessions-table tr:nth-child(even) { background: #f8f9ff; }
  .sessions-table td { padding: 10px 10px; font-size: 13px; border-bottom: 1px solid #f5f5f5; }
  .td-fecha { color: #999; font-size: 12px; white-space: nowrap; width: 50px; }
  .td-titulo { color: #222; font-weight: 500; }

  /* ADN */
  .adn-card { background: #f0f5ff; border-left: 3px solid #4f8cff; border-radius: 0 8px 8px 0; padding: 14px 18px; }
  .adn-tag { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #4f8cff; margin-bottom: 6px; }
  .adn-text { font-size: 13px; color: #333; line-height: 1.7; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 13px; font-weight: 700; color: #4f8cff; }
  .footer-date { font-size: 11px; color: #bbb; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="report-header">
    <div>
      <div class="brand">Zy<span>fit</span></div>
      <div style="font-size:11px;color:#999;margin-top:2px;letter-spacing:0.5px">INFORME MENSUAL DE ENTRENAMIENTO</div>
    </div>
    <div class="header-right">
      <div class="mes-label">${d.mes_label}</div>
      <div class="user-label">${d.nombre}</div>
      <div class="nivel-badge">${d.nivel_label} · ${d.total_sesiones} sesiones totales</div>
    </div>
  </div>

  <!-- Métricas principales -->
  <div class="section">
    <div class="section-title">Resumen del mes</div>
    <div class="metrics">
      <div class="metric">
        <div class="metric-val">${d.sesiones_completadas}</div>
        <div class="metric-lbl">Sesiones<br>completadas</div>
      </div>
      <div class="metric">
        <div class="metric-val ${d.consistencia_pct >= 80 ? 'green' : d.consistencia_pct >= 60 ? '' : 'orange'}">${d.consistencia_pct}%</div>
        <div class="metric-lbl">Consistencia<br>mensual</div>
      </div>
      <div class="metric">
        <div class="metric-val ${d.rpe_promedio !== null && d.rpe_promedio >= 8 ? 'orange' : ''}">${d.rpe_promedio !== null ? d.rpe_promedio : '—'}</div>
        <div class="metric-lbl">RPE<br>promedio</div>
      </div>
      <div class="metric">
        <div class="metric-val ${d.cumplimiento_promedio !== null && d.cumplimiento_promedio >= 80 ? 'green' : ''}">${d.cumplimiento_promedio !== null ? d.cumplimiento_promedio + '%' : '—'}</div>
        <div class="metric-lbl">Cumplimiento<br>promedio</div>
      </div>
    </div>
  </div>

  <!-- Racha -->
  <div class="section">
    <div class="section-title">Rachas y nivel</div>
    <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
      <div class="metric">
        <div class="metric-val orange">${d.racha_actual}</div>
        <div class="metric-lbl">Racha actual<br>(días)</div>
      </div>
      <div class="metric">
        <div class="metric-val">${d.mejor_racha}</div>
        <div class="metric-lbl">Mejor racha<br>(días)</div>
      </div>
      <div class="metric">
        <div class="metric-val">${d.sesiones_planificadas}</div>
        <div class="metric-lbl">Sesiones<br>planificadas</div>
      </div>
    </div>
  </div>

  <!-- Distribución por tipo -->
  <div class="section">
    <div class="section-title">Distribución por tipo de entrenamiento</div>
    ${bar(d.distribucion_tipo.fuerza / totalDist * 100, '#4f8cff', 'Fuerza', `${d.distribucion_tipo.fuerza}×`)}
    ${bar(d.distribucion_tipo.cardio / totalDist * 100, '#ff8c42', 'Cardio', `${d.distribucion_tipo.cardio}×`)}
    ${bar(d.distribucion_tipo.movilidad / totalDist * 100, '#32c896', 'Movilidad', `${d.distribucion_tipo.movilidad}×`)}
  </div>

  <!-- Grupos favoritos -->
  ${d.top_grupos.length > 0 ? `
  <div class="section">
    <div class="section-title">Grupos musculares trabajados</div>
    <div class="chips">${gruposHTML}</div>
  </div>` : ''}

  <!-- Sesiones del mes -->
  <div class="section">
    <div class="section-title">Detalle de sesiones</div>
    <table class="sessions-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Sesión</th>
          <th style="text-align:center">RPE</th>
          <th style="text-align:center">Cumpl.</th>
          <th style="text-align:center">Rating</th>
        </tr>
      </thead>
      <tbody>${sessionRows}</tbody>
    </table>
  </div>

  <!-- ADN -->
  ${d.adn_entrenamiento ? `
  <div class="section">
    <div class="section-title">Tu ADN de entrenamiento</div>
    <div class="adn-card">
      <div class="adn-tag">Análisis IA · Zyfit</div>
      <div class="adn-text">${d.adn_entrenamiento}</div>
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">Zyfit</div>
    <div class="footer-date">Generado el ${generadoEl}</div>
  </div>

</div>
</body>
</html>`
}

// ─── Función pública ──────────────────────────────────────────────────────────

export async function exportMonthlyReport(year?: number, month?: number): Promise<void> {
  const today = new Date()
  const y = year  ?? today.getFullYear()
  const m = month ?? today.getMonth() + 1

  const data: ReportData = await apiGet(`/api/stats/report-mensual/?year=${y}&month=${m}`)
  const html = buildHTML(data)

  const { uri } = await Print.printToFileAsync({ html, base64: false })

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) throw new Error('Compartir no disponible en este dispositivo')

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const fileName = `Zyfit_${MESES[m - 1]}_${y}.pdf`

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Informe ${MESES[m - 1]} ${y}`,
    UTI: 'com.adobe.pdf',
  })
}
