import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(request) {
  try {
    const { ejercicioActual, faseName, rpeTarget, series, repeticiones, sesionId, contexto } = await request.json()

    const prompt = `Eres un entrenador experto. El usuario quiere reemplazar el ejercicio "${ejercicioActual}" de la fase "${faseName}".

Contexto de la sesión: ${contexto}
Series actuales: ${series}
Repeticiones actuales: ${repeticiones}
RPE sugerido: ${rpeTarget}

Genera UN ejercicio alternativo que:
1. Trabaje el mismo grupo muscular y patrón de movimiento que "${ejercicioActual}"
2. Sea diferente al ejercicio original
3. Mantenga el mismo volumen (series y reps)
4. Sea apropiado para el RPE indicado

Responde ÚNICAMENTE con este JSON sin texto adicional:
{
  "nombre": "nombre del ejercicio alternativo",
  "series": ${series},
  "repeticiones": "${repeticiones}",
  "descanso_segundos": 60,
  "rpe_sugerido": ${rpeTarget},
  "notas": "cue técnico clave en una frase corta"
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
    })

    const text = completion.choices[0].message.content
    const clean = text.replace(/```json|```/g, '').trim()
    const ejercicio = JSON.parse(clean)

    return Response.json({ ejercicio })
  } catch (error) {
    console.error('Error regenerando ejercicio:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}