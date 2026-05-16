import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'

// ─── Data ─────────────────────────────────────────────────────────────────────

const TERMINOS = [
  {
    termino: 'Descanso activo',
    definicion: 'Sesión de baja intensidad (movilidad, caminata, natación suave) realizada en días de recuperación. Favorece el flujo sanguíneo y acelera la eliminación de metabolitos sin generar nuevo estrés neuromuscular.',
  },
  {
    termino: 'Fase folicular',
    definicion: 'Primera mitad del ciclo menstrual (días 1–14). Los niveles de estrógeno son crecientes, lo que favorece entrenamientos de alta intensidad, fuerza y mayor tolerancia al volumen de entrenamiento.',
  },
  {
    termino: 'Fase lútea',
    definicion: 'Segunda mitad del ciclo menstrual (días 15–28). La progesterona es dominante, lo que se asocia a mayor percepción de fatiga, temperatura corporal elevada y menor tolerancia al entrenamiento de alta intensidad.',
  },
  {
    termino: 'Fatiga neuromuscular',
    definicion: 'Reducción temporal de la capacidad de producir fuerza como resultado del esfuerzo físico acumulado. Se manifiesta como menor rendimiento, mayor percepción del esfuerzo y disminución de la coordinación.',
  },
  {
    termino: 'Frecuencia cardíaca de reserva',
    definicion: 'Diferencia entre la frecuencia cardíaca máxima y la frecuencia cardíaca en reposo. Se usa para calcular zonas de intensidad cardiovascular más precisas que con la frecuencia cardíaca máxima sola.',
  },
  {
    termino: 'HIIT',
    definicion: 'High-Intensity Interval Training. Método de entrenamiento que alterna períodos de esfuerzo máximo o cercano al máximo con períodos de recuperación activa o pasiva. Mejora la capacidad aeróbica y el metabolismo en menor tiempo.',
  },
  {
    termino: 'Periodización',
    definicion: 'Organización sistemática del entrenamiento en bloques con variaciones planificadas de volumen, intensidad y tipo de estímulo. Permite maximizar las adaptaciones fisiológicas y reducir el riesgo de sobreentrenamiento.',
  },
  {
    termino: 'RPE',
    definicion: 'Rate of Perceived Exertion (Escala de Percepción del Esfuerzo). Escala del 1 al 10 que mide el esfuerzo subjetivo percibido durante el ejercicio. PyFit la utiliza para calibrar la intensidad ideal para cada sesión y perfil de usuario.',
  },
  {
    termino: 'Sobrecarga progresiva',
    definicion: 'Principio fundamental del entrenamiento que consiste en aumentar gradualmente el estímulo (peso, repeticiones, series o densidad) para seguir generando adaptaciones neuromusculares y evitar el estancamiento.',
  },
  {
    termino: 'Volumen de entrenamiento',
    definicion: 'Cantidad total de trabajo realizado en una sesión o semana, expresada como series × repeticiones × carga. Es el principal determinante del crecimiento muscular a largo plazo, dentro de un rango tolerable de fatiga.',
  },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GlosarioScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TERMINOS
    return TERMINOS.filter(t => t.termino.toLowerCase().includes(q) || t.definicion.toLowerCase().includes(q))
  }, [query])

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
        <Text style={styles.headerTitle}>Glosario</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={styles.searchIcon}>
          <Path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            stroke={colors.inkMuted} strokeWidth={1.8} strokeLinecap="round" />
        </Svg>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar término..."
          placeholderTextColor={colors.inkMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>Sin resultados para "{query}"</Text>
        ) : (
          filtered.map((t, i) => (
            <View key={t.termino} style={[styles.termCard, i === filtered.length - 1 && { marginBottom: 0 }]}>
              <Text style={styles.termNombre}>{t.termino}</Text>
              <Text style={styles.termDef}>{t.definicion}</Text>
            </View>
          ))
        )}
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
    searchWrap: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      marginHorizontal: 20, marginVertical: 12,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    },
    searchIcon: { flexShrink: 0 },
    searchInput: {
      flex: 1, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    },
    empty: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, textAlign: 'center', marginTop: 32,
    },
    termCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 18, marginBottom: 10, gap: 8,
    },
    termNombre: {
      color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15, letterSpacing: -0.3,
    },
    termDef: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13, lineHeight: 21,
    },
  })
}
