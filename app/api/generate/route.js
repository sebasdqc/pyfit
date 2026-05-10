import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function calcularFatiga(sesiones) {
  if (!sesiones || sesiones.length === 0) return 'bajo'

  const ahora = new Date()
  const ultimas72h = sesiones.filter(s => {
    const fecha = new Date(s.fecha)
    const diffHoras = (ahora - fecha) / (1000 * 60 * 60)
    return diffHoras <= 72
  })

  if (ultimas72h.length >= 3) return 'alto'
  if (ultimas72h.length === 2) return 'medio'
  return 'bajo'
}

function calcularRPETarget(fatiga, estadoAnimo, hrv) {
  let rpe = 7

  if (fatiga === 'alto') rpe -= 2
  else if (fatiga === 'medio') rpe -= 1

  if (estadoAnimo <= 2) rpe -= 1
  else if (estadoAnimo >= 5) rpe += 1

  if (hrv && hrv < 50) rpe -= 1
  else if (hrv && hrv > 80) rpe += 1

  return Math.min(Math.max(rpe, 4), 9)
}

function buildPrompt(contexto) {
  return `
Eres un entrenador personal y científico del ejercicio de élite. Tienes formación en fisiología del ejercicio, periodización y nutrición deportiva. Cada decisión que tomas está respaldada por evidencia científica de nivel A (meta-análisis y revisiones sistemáticas).

PERFIL COMPLETO DEL ATLETA:
- Nombre: ${contexto.nombre}
- Edad: ${contexto.edad || 'no especificada'}
- Sexo biológico: ${contexto.sexo || 'no especificado'}
- Peso: ${contexto.peso ? `${contexto.peso} kg` : 'no especificado'}
- Altura: ${contexto.altura ? `${contexto.altura} cm` : 'no especificada'}
- Objetivo principal: ${contexto.objetivo}
- Nivel de experiencia: ${contexto.nivel}
- Experiencia deportiva previa: ${contexto.experienciaDeportiva || 'ninguna especificada'}
- Lesiones o limitaciones: ${contexto.lesiones || 'ninguna'}
- Estilo de entrenamiento preferido: ${contexto.estiloEntrenamiento || 'no especificado'}
- Ejercicios favoritos: ${contexto.ejerciciosFavoritos || 'ninguno especificado'}
- Ejercicios a evitar: ${contexto.ejerciciosEvitar || 'ninguno'}
- Días de entrenamiento por semana: ${contexto.diasSemana || 3}
- Horario preferido: ${contexto.horario || 'no especificado'}
- Nivel de estrés habitual: ${contexto.nivelEstres || 'no especificado'}
- Tipo de trabajo: ${contexto.tipoTrabajo || 'no especificado'}

MARCADORES DE RENDIMIENTO (1RM):
- Sentadilla: ${contexto.rmSentadilla ? `${contexto.rmSentadilla} kg` : 'desconocido'}
- Peso muerto: ${contexto.rmPeseMuerto ? `${contexto.rmPeseMuerto} kg` : 'desconocido'}
- Press banca: ${contexto.rmPressBanca ? `${contexto.rmPressBanca} kg` : 'desconocido'}
- Press hombro: ${contexto.rmPressHombro ? `${contexto.rmPressHombro} kg` : 'desconocido'}

ESTADO HOY:
- Estado de ánimo: ${contexto.estadoAnimo}/5
- Horas de sueño: ${contexto.calidadSueno}h
- HRV: ${contexto.hrv || 'no disponible'}
- Notas del usuario: ${contexto.notas || 'ninguna'}
- Dolor o molestia HOY: ${contexto.dolorHoy || 'ninguno reportado'}
- Foco de entrenamiento solicitado: ${contexto.focoEntrenamiento?.length > 0 ? contexto.focoEntrenamiento.join(', ') : 'libre — decide tú según el contexto'}
- Fatiga acumulada últimas 72h: ${contexto.fatiga}
- RPE objetivo calculado: ${contexto.rpeTarget}/10

SESIÓN DE HOY:
- Ubicación: ${contexto.ubicacion.nombre} (${contexto.ubicacion.tipo})
- Implementos disponibles: ${contexto.ubicacion.implementos?.join(', ') || 'solo peso corporal'}
- Duración disponible: ${contexto.duracion} minutos

COMPETICIÓN PRÓXIMA:
${contexto.competicion ? `- ${contexto.competicion.nombre} el ${contexto.competicion.fecha}` : '- Ninguna en los próximos 14 días'}

FASE DEL CICLO MENSTRUAL:
${contexto.fasesCiclo || 'No aplica o no disponible'}

---

PRINCIPIOS CIENTÍFICOS QUE DEBES APLICAR OBLIGATORIAMENTE:

1. VOLUMEN EFECTIVO (Schoenfeld, 2017; Krieger, 2010)
   - Principiante: 10-15 series semanales por grupo muscular
   - Intermedio: 15-20 series semanales
   - Avanzado: 20-25 series semanales
   - Distribuye el volumen de hoy según la fatiga acumulada: si es ALTA reduce 30-40%, si es MEDIA reduce 15-20%
   - Nunca superes el umbral de volumen máximo recuperable (MRV) en una sola sesión

2. INTENSIDAD Y RPE (Zourdos et al., 2016; Helms et al., 2018)
   - RPE objetivo para hoy: ${contexto.rpeTarget}/10
   - Si tienes 1RM disponible, calcula las cargas usando la fórmula de Epley: Carga = 1RM × (1 - reps/30)
   - RIR (Reps In Reserve) = 10 - RPE. Hoy el atleta debe terminar cada serie con ${10 - contexto.rpeTarget} reps en reserva
   - Fatiga alta o HRV bajo → prioriza RPE 6-7, técnica sobre carga
   - Estado de ánimo bajo (≤2) → reduce intensidad, aumenta componente de movilidad

3. SELECCIÓN DE EJERCICIOS (Baz-Valle et al., 2022)
   - USA EXCLUSIVAMENTE los implementos disponibles: ${contexto.ubicacion.implementos?.join(', ') || 'peso corporal'}
   - NUNCA incluyas ejercicios que requieran implementos no disponibles
   - Prioriza ejercicios multiarticulares (mayor estímulo hormonal y neuromuscular)
   - Incluye variedad: no repitas el mismo patrón de movimiento más de 2 veces en la misma sesión
   - Respeta ejercicios a evitar: ${contexto.ejerciciosEvitar || 'ninguno'}
   - Considera ejercicios favoritos cuando sea apropiado: ${contexto.ejerciciosFavoritos || 'ninguno especificado'}
   - Patrones de movimiento a cubrir según objetivo: empuje, tracción, piernas, core

4. ESTRUCTURA DE LA SESIÓN (NSCA Guidelines, 2022)
   - Calentamiento: activación neuromuscular progresiva, movilidad específica, 8-12 min
   - Bloque principal: ejercicios ordenados de mayor a menor demanda neuromuscular (compuestos primero)
   - Vuelta a la calma: estiramientos estáticos, trabajo de movilidad, respiración, 8-10 min
   - Tiempo total: exactamente ${contexto.duracion} minutos incluyendo todas las fases

5. PERIODIZACIÓN SEGÚN OBJETIVO (Issurin, 2010; Bompa & Buzzichelli, 2018)
   - Pérdida de grasa: densidad alta, descansos cortos (45-75s), supersets ocasionales
   - Ganancia muscular: 3-4 series, 6-12 reps, descansos 90-120s, énfasis en tensión mecánica
   - Rendimiento deportivo: trabajo de potencia, movimientos explosivos, especificidad
   - Resistencia: volumen moderado-alto, intensidad moderada, descansos cortos
   - Salud general: variedad, movimientos funcionales, bajo impacto articular

6. ADAPTACIONES POR SEXO BIOLÓGICO (Sung et al., 2014; Tarnopolsky, 2008)
   ${contexto.sexo === 'femenino' ? `
   - Las mujeres tienen mayor resistencia a la fatiga → pueden manejar más volumen por sesión
   - Mayor capacidad de recuperación → descansos pueden ser ligeramente más cortos
   - ${contexto.fasesCiclo ? 'Considera la fase del ciclo menstrual indicada arriba' : 'Considera periodización hormonal si hay datos disponibles'}
   - Énfasis en cadena posterior y glúteos cuando sea apropiado al objetivo
   ` : contexto.sexo === 'masculino' ? `
   - Mayor capacidad de generar fuerza máxima → puede priorizar trabajo de alta intensidad
   - Responde bien a volumen alto con recuperación adecuada
   - Monitorea señales de sobreentrenamiento si el estrés habitual es alto
   ` : '- Aplica principios generales de periodización'}

7. CONTEXTO DE VIDA (Kreher & Schwartz, 2012)
   - Trabajo ${contexto.tipoTrabajo || 'mixto'}: ${contexto.tipoTrabajo === 'activo' ? 'ya tiene demanda física diaria, reduce volumen total en 10-15%' : contexto.tipoTrabajo === 'sedentario' ? 'mayor potencial de recuperación entre sesiones' : 'considera fatiga acumulada moderada'}
   - Estrés ${contexto.nivelEstres || 'moderado'}: ${contexto.nivelEstres === 'alto' ? 'el cortisol elevado interfiere con la recuperación, reduce intensidad y prioriza ejercicios placenteros' : contexto.nivelEstres === 'bajo' ? 'óptimo para sesiones de alta demanda' : 'monitorea señales de fatiga'}
   - Sueño ${contexto.calidadSueno}h: ${contexto.calidadSueno < 6 ? 'privación de sueño significativa, reduce RPE objetivo en 1 punto adicional' : contexto.calidadSueno < 7 ? 'sueño subóptimo, modera la intensidad' : 'recuperación adecuada'}

---

INSTRUCCIONES FINALES:
0. RESTRICCIONES ABSOLUTAS — estas son reglas que NO puedes violar bajo ninguna circunstancia:
   - Si hay dolor o molestia reportada hoy ("${contexto.dolorHoy || 'ninguno'}"), NUNCA incluyas ejercicios que involucren esa zona corporal. Esto es innegociable.
   - Si el usuario especificó un foco de entrenamiento, la sesión DEBE centrarse en ese foco. Si dijo "pecho", el bloque principal es de pecho.
   - Los implementos disponibles son: ${contexto.ubicacion.implementos?.join(', ') || 'solo peso corporal'}. NUNCA uses un implemento que no esté en esta lista.
1. Genera UNA sesión completa para HOY, no un plan semanal
2. Cada ejercicio debe ser ejecutable con los implementos disponibles — verifica esto antes de incluirlo
3. La nota del entrenador DEBE citar al menos 2 principios científicos específicos explicando POR QUÉ la sesión está diseñada así hoy
4. Las notas de cada ejercicio deben incluir un cue técnico clave basado en biomecánica
5. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown

JSON requerido:
{
  "titulo": "nombre descriptivo y motivador de la sesión",
  "objetivo_sesion": "qué adaptación fisiológica específica se busca hoy en una frase",
  "rpe_target": ${contexto.rpeTarget},
  "duracion_total": ${contexto.duracion},
  "fases": [
    {
      "nombre": "Calentamiento",
      "duracion_minutos": 10,
      "ejercicios": [
        {
          "nombre": "nombre del ejercicio",
          "series": 2,
          "repeticiones": "30 segundos",
          "descanso_segundos": 15,
          "rpe_sugerido": 4,
          "notas": "cue técnico biomecánico específico"
        }
      ]
    },
    {
      "nombre": "Bloque principal",
      "duracion_minutos": 40,
      "ejercicios": []
    },
    {
      "nombre": "Vuelta a la calma",
      "duracion_minutos": 10,
      "ejercicios": []
    }
  ],
  "nota_del_entrenador": "máximo 2 oraciones explicando por qué esta sesión está diseñada así HOY específicamente, basado en el estado del usuario"}
`
}

export async function POST(request) {
  try {
    const { userId } = await request.json()

    const hoy = new Date().toISOString().split('T')[0]
    const hace14dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      { data: perfil },
      { data: checkin },
      { data: sesiones },
      { data: competicion }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('daily_checkin').select('*, user_locations(*)').eq('user_id', userId).eq('fecha', hoy).single(),
      supabase.from('sessions').select('fecha, rpe_target').eq('user_id', userId).gte('fecha', hace14dias).order('fecha', { ascending: false }),
      supabase.from('competitions').select('*').eq('user_id', userId).gte('fecha', hoy).lte('fecha', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).order('fecha').limit(1).single()
    ])

    if (!perfil || !checkin) {
      return Response.json({ error: 'Faltan datos del usuario o check-in' }, { status: 400 })
    }

    const fatiga = calcularFatiga(sesiones)
    const rpeTarget = calcularRPETarget(fatiga, checkin.estado_animo, checkin.hrv)

const contexto = {
  nombre: perfil.nombre,
  objetivo: perfil.objetivo,
  nivel: perfil.nivel,
  lesiones: perfil.lesiones,
  experienciaDeportiva: perfil.experiencia_deportiva,
  edad: perfil.edad,
  sexo: perfil.sexo,
  peso: perfil.peso,
  altura: perfil.altura,
  diasSemana: perfil.dias_semana,
  horario: perfil.horario_preferido,
  nivelEstres: perfil.nivel_estres,
  tipoTrabajo: perfil.tipo_trabajo,
  estiloEntrenamiento: perfil.estilo_entrenamiento,
  ejerciciosFavoritos: perfil.ejercicios_favoritos,
  ejerciciosEvitar: perfil.ejercicios_evitar,
  rmSentadilla: perfil.rm_sentadilla,
  rmPeseMuerto: perfil.rm_peso_muerto,
  rmPressBanca: perfil.rm_press_banca,
  rmPressHombro: perfil.rm_press_hombro,
  estadoAnimo: checkin.estado_animo,
  calidadSueno: checkin.calidad_sueno,
  hrv: checkin.hrv,
  notas: checkin.notas,
  fatiga,
  rpeTarget,
  duracion: checkin.duracion_disponible,
  ubicacion: checkin.user_locations,
  competicion: competicion || null,
  fasesCiclo: null,
  dolorHoy: checkin.dolor_hoy,
  focoEntrenamiento: checkin.foco_entrenamiento
}

    const prompt = buildPrompt(contexto)
    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
    })
    const text = completion.choices[0].message.content


    const clean = text.replace(/```json|```/g, '').trim()
    const sesionGenerada = JSON.parse(clean)

    const { data: sesionGuardada } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        checkin_id: checkin.id,
        location_id: checkin.location_id,
        fecha: hoy,
        duracion_planificada: checkin.duracion_disponible,
        rpe_target: rpeTarget,
        volumen_relativo: fatiga === 'alto' ? 'bajo' : fatiga === 'medio' ? 'medio' : 'alto',
        prompt_usado: prompt,
        respuesta_claude: sesionGenerada
      })
      .select()
      .single()

    return Response.json({ sesion: sesionGenerada, sesionId: sesionGuardada.id })

  } catch (error) {
    console.error('Error generando sesión:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}