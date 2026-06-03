import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { P } from '../lib/coachTheme'

/**
 * Pantalla mínima del portal de coach para secciones aún no diseñadas.
 * Mantiene la identidad morada y, opcionalmente, un botón de volver.
 */
export function CoachPlaceholder({
  title,
  subtitle = 'Próximamente',
  showBack = false,
}: {
  title: string
  subtitle?: string
  showBack?: boolean
}) {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      {showBack && (
        <TouchableOpacity style={styles.back} activeOpacity={0.6} onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      )}
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg, paddingHorizontal: 24 },
  back: { paddingVertical: 8 },
  backText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.purpleSoft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 22,
    color: P.purpleMid,
    letterSpacing: -0.4,
  },
  sub: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    color: P.purpleFaint,
    letterSpacing: 0.5,
  },
})
