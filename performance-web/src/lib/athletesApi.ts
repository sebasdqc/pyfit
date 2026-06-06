// ─────────────────────────────────────────────────────────────────────────────
// CABLEADO LISTO PARA ACTIVAR — atletas reales del centro (incluida la foto).
//
// Hoy la Plantilla usa el squad MOCK + localStorage (lib/squadStore) porque el
// frontend todavía no tiene atletas reales. Este módulo deja preparado el puente
// al backend real para el día en que el director registre atletas desde el panel.
//
// Qué persiste el backend HOY (POST/PATCH /centers/<id>/athletes/<linkId>/):
//   • foto (data URL), dorsal, posicion, grupo, estado
//   • nombre / email → vienen del User vinculado (solo lectura aquí)
// Qué NO está modelado aún (sigue en el mock/localStorage hasta que existan
// modelos en el backend): radar de rendimiento, demográficos (edad, altura,
// peso, pie, nacionalidad) y métricas de carga (acwr, bienestar, minutos…).
//
// CÓMO ACTIVARLO en PlantillaPage cuando haya atletas reales:
//   1. Cargar la plantilla con `listCenterAthletes(centerId)` y mapear cada DTO
//      con `fromCenterAthlete` (en vez de `loadSquad()`).
//   2. Guardar la edición con `saveAthleteEdit(centerId, a.id, patch)` (en vez
//      de `updateAthlete` + `saveSquad`). La foto ya viaja en el patch.
//   3. `a.id` debe ser el id del vínculo CenterAthlete (number), no el slug mock.
// El resto de la UI (modal, validación, Avatar con foto) ya está listo.
// ─────────────────────────────────────────────────────────────────────────────

import type { CenterAthlete } from '@/types'
import type { Athlete, Estado } from './mockSquad'
import type { AthletePatch } from './squadEdit'
import { updateCenterAthlete } from '@/api/performance'

// El estado del backend (activo/lesionado/baja) y el del semáforo de la UI
// (ok/duda/baja) no son 1:1: 'duda' (en duda) y 'lesionado' no tienen
// equivalente exacto. Se mapea de forma conservadora y se documenta la pérdida.
const ESTADO_FROM_API: Record<CenterAthlete['estado'], Estado> = {
  activo: 'ok',
  lesionado: 'baja', // lesionado ⇒ no disponible
  baja: 'baja',
}
const ESTADO_TO_API: Record<Estado, CenterAthlete['estado']> = {
  ok: 'activo',
  duda: 'activo', // 'en duda' no existe en el backend ⇒ se guarda como activo
  baja: 'baja',
}

// DTO del backend → campos del modelo de vista que SÍ son reales hoy. Los
// campos no modelados (radar, demográficos, carga) se rellenan en el llamador
// (p. ej. con valores por defecto o derivados) hasta que el backend los exponga.
export function fromCenterAthlete(dto: CenterAthlete): Pick<
  Athlete,
  'id' | 'nombre' | 'dorsal' | 'posicion' | 'grupo' | 'estado' | 'foto'
> {
  return {
    id: String(dto.id),
    nombre: dto.email, // el nombre real vive en el User; email como respaldo
    dorsal: Number(dto.dorsal) || 0,
    posicion: dto.posicion,
    grupo: dto.grupo,
    estado: ESTADO_FROM_API[dto.estado],
    foto: dto.foto || undefined,
  }
}

// Patch del modal → solo los campos que el backend acepta hoy (el resto se
// ignora a propósito: aún no hay dónde guardarlos).
export function toCenterAthletePatch(
  patch: AthletePatch,
): Partial<Pick<CenterAthlete, 'dorsal' | 'posicion' | 'grupo' | 'estado' | 'foto'>> {
  const out: Partial<Pick<CenterAthlete, 'dorsal' | 'posicion' | 'grupo' | 'estado' | 'foto'>> = {}
  if (patch.dorsal !== undefined) out.dorsal = String(patch.dorsal)
  if (patch.posicion !== undefined) out.posicion = patch.posicion
  if (patch.grupo !== undefined) out.grupo = patch.grupo
  if (patch.estado !== undefined) out.estado = ESTADO_TO_API[patch.estado]
  if (patch.foto !== undefined) out.foto = patch.foto ?? ''
  return out
}

// Guarda la edición de un atleta real contra el endpoint del centro (incluida la
// foto). Devuelve el DTO actualizado. Listo para reemplazar a updateAthlete +
// saveSquad en PlantillaPage cuando la plantilla venga de la API.
export async function saveAthleteEdit(
  centerId: number,
  linkId: number,
  patch: AthletePatch,
): Promise<CenterAthlete> {
  return updateCenterAthlete(centerId, linkId, toCenterAthletePatch(patch))
}
