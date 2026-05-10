const MUSCLE_EMOJIS = {
  'pecho': '💪', 'press banca': '💪', 'aperturas': '💪', 'fondos': '💪',
  'espalda': '🔙', 'dominadas': '🔙', 'jalon': '🔙', 'jalón': '🔙', 'remo': '🔙',
  'hombro': '🏋️', 'press militar': '🏋️', 'elevaciones': '🏋️',
  'bicep': '💪', 'curl': '💪',
  'tricep': '💪', 'extension': '💪',
  'pierna': '🦵', 'sentadilla': '🦵', 'cuadricep': '🦵', 'femoral': '🦵', 'prensa': '🦵',
  'gluteo': '🍑', 'hip thrust': '🍑', 'puente': '🍑',
  'gemelos': '🦵', 'pantorrilla': '🦵',
  'core': '🎯', 'plancha': '🎯', 'abdominales': '🎯', 'crunch': '🎯',
  'peso muerto': '🏋️', 'zancada': '🦵',
  'movilidad': '🧘', 'estiramiento': '🧘',
}

const TRADUCCIONES = {
  'sentadilla': 'squat', 'press banca': 'bench press', 'peso muerto': 'deadlift',
  'dominadas': 'pull up', 'fondos': 'dips', 'plancha': 'plank',
  'curl': 'bicep curl', 'press hombro': 'shoulder press', 'press militar': 'shoulder press',
  'remo': 'rowing', 'hip thrust': 'hip thrust', 'abdominales': 'crunch',
  'crunch': 'crunch', 'elevaciones laterales': 'lateral raise', 'zancadas': 'lunge',
  'burpee': 'burpee', 'mountain climber': 'mountain climber',
  'press inclinado': 'incline press', 'aperturas': 'chest fly',
  'jalon': 'lat pulldown', 'jalón': 'lat pulldown',
  'gemelos': 'calf raise', 'goblet': 'goblet squat',
  'puente': 'glute bridge', 'superman': 'superman exercise',
  'movilidad': 'mobility stretch', 'tricep': 'tricep extension',
  'bicep': 'bicep curl', 'femoral': 'leg curl', 'cuadricep': 'leg extension',
  'gluteo': 'glute exercise', 'hombro': 'shoulder press',
  'espalda': 'back exercise', 'pecho': 'chest press',
  'kettlebell': 'kettlebell swing', 'swing': 'kettlebell swing',
}

function traducir(nombre) {
  const lower = nombre.toLowerCase()
  for (const [es, en] of Object.entries(TRADUCCIONES)) {
    if (lower.includes(es)) return en
  }
  return lower
}

function getMuscleEmoji(nombre) {
  const lower = nombre.toLowerCase()
  for (const [key, emoji] of Object.entries(MUSCLE_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return '💪'
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const nombre = searchParams.get('nombre')
  if (!nombre) return Response.json({ youtubeQuery: null, muscleEmoji: null })

  const youtubeQuery = traducir(nombre)
  const muscleEmoji = getMuscleEmoji(nombre)

  return Response.json({ youtubeQuery, muscleEmoji })
}