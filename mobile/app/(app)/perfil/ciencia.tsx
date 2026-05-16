import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'

// ─── Data ─────────────────────────────────────────────────────────────────────

const PRINCIPIOS = [
  {
    id: 'rpe',
    titulo: 'RPE y percepción del esfuerzo',
    texto: 'El RPE cuantifica el esfuerzo subjetivo en una escala del 1 al 10. Esta percepción es un indicador fisiológico válido: correlaciona con la frecuencia cardíaca, el lactato sanguíneo y el rendimiento real. Entrenar en la zona de RPE correcta maximiza el estímulo sin acumular fatiga innecesaria.',
    fuente: 'Borg, 1982 · Zourdos et al., 2016',
    color: '#4f8cff',
  },
  {
    id: 'periodizacion',
    titulo: 'Periodización y progresión',
    texto: 'Organizar el entrenamiento en bloques con variaciones planificadas de carga y volumen optimiza las adaptaciones y reduce el riesgo de estancamiento. La sobrecarga progresiva sistemática es el principal motor del progreso neuromuscular.',
    fuente: 'Schoenfeld, 2010 · Haff & Triplett, 2016',
    color: '#6ce5ff',
  },
  {
    id: 'fatiga',
    titulo: 'Fatiga acumulada',
    texto: 'El entrenamiento intenso sin recuperación suficiente eleva los marcadores de fatiga sistémica. Entrenar con fatiga acumulada reduce la calidad del estímulo y aumenta el riesgo de lesión. PyFit calcula tu nivel de fatiga a partir de las sesiones de las últimas 72 horas.',
    fuente: 'Meeusen et al., 2013',
    color: '#ffaa32',
  },
  {
    id: 'cortisol',
    titulo: 'Cortisol y rendimiento',
    texto: 'El estrés crónico eleva el cortisol, una hormona catabólica que interfiere con la síntesis proteica muscular y aumenta la percepción de esfuerzo. PyFit ajusta la intensidad objetivo según tu nivel de estrés y estado de ánimo reportados en el check-in diario.',
    fuente: 'Kraemer & Ratamess, 2005',
    color: '#ff4444',
  },
  {
    id: 'ciclo',
    titulo: 'Ciclo menstrual y rendimiento físico',
    texto: 'La fase folicular (días 1–14) favorece entrenamientos de alta intensidad y fuerza, ya que los niveles de estrógeno son más altos. La fase lútea (días 15–28) se asocia con mayor fatiga y menor tolerancia al volumen. Adaptar el entrenamiento al ciclo optimiza resultados y reduce el riesgo de sobreentrenamiento.',
    fuente: 'Janse de Jonge, 2003 · McNulty et al., 2020',
    color: '#c084fc',
  },
  {
    id: 'sueno',
    titulo: 'Sueño y recuperación muscular',
    texto: 'Durante el sueño profundo se produce la mayor secreción de hormona de crecimiento del día. Dormir menos de 7 horas reduce la síntesis proteica, eleva el cortisol y disminuye el rendimiento anaeróbico. Tu calidad de sueño influye directamente en el RPE objetivo de cada sesión.',
    fuente: 'Dattilo et al., 2011 · Fullagar et al., 2015',
    color: '#32c896',
  },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CienciaScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={['rgba(37,99,255,0.15)', 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cómo funciona tu entrenador</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          PyFit basa sus decisiones en investigación publicada sobre ciencias del deporte, fisiología del ejercicio y psicología del rendimiento.
        </Text>

        {PRINCIPIOS.map((p, i) => (
          <View key={p.id} style={[styles.card, i === PRINCIPIOS.length - 1 && { marginBottom: 0 }]}>
            <View style={[styles.cardBar, { backgroundColor: p.color }]} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{p.titulo}</Text>
              <Text style={styles.cardText}>{p.texto}</Text>
              <View style={styles.fuenteRow}>
                <Text style={styles.fuenteLabel}>FUENTE</Text>
                <Text style={styles.fuenteText}>{p.fuente}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, letterSpacing: -0.5, flex: 1 },
    intro: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, lineHeight: 22, marginBottom: 24,
    },
    card: {
      flexDirection: 'row',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, overflow: 'hidden', marginBottom: 14,
    },
    cardBar: { width: 3 },
    cardContent: { flex: 1, padding: 18, gap: 10 },
    cardTitle: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15, letterSpacing: -0.3,
    },
    cardText: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 21,
    },
    fuenteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    fuenteLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 8,
      color: c.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase',
    },
    fuenteText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      color: c.inkMuted, letterSpacing: 0.2, flex: 1,
    },
  })
}
