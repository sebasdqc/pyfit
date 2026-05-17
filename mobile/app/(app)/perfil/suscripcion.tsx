/**
 * Pantalla de suscripción — iteración 1: estructura base.
 *
 * Recibe `modo` por query param:
 *   - 'upgrade'  → usuario en plan Starter viendo la oferta de Pro
 *   - 'gestion'  → usuario Pro gestionando su suscripción
 *
 * Si el parámetro no llega o no es válido, default a 'upgrade' (caso más
 * común para un usuario nuevo). El cuerpo de la pantalla se llena en
 * iteraciones posteriores; por ahora sólo el contenedor.
 */

import React from 'react'
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuscripcionModo = 'upgrade' | 'gestion'

function isValidModo(v: string | undefined): v is SuscripcionModo {
  return v === 'upgrade' || v === 'gestion'
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SuscripcionScreen() {
  const { colors } = useTheme()
  const insets     = useSafeAreaInsets()
  const styles     = React.useMemo(() => makeStyles(colors), [colors])

  const params = useLocalSearchParams<{ modo?: string }>()
  const modo: SuscripcionModo = isValidModo(params.modo) ? params.modo : 'upgrade'
  const titulo = modo === 'gestion' ? 'Mi suscripción' : 'Zyfit Pro'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header con back a la izquierda, título centrado, spacer simétrico a la derecha */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6"
              stroke={colors.inkPrimary} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{titulo}</Text>
        {/* Spacer del mismo ancho que el back para que el título quede ópticamente centrado */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Las iteraciones posteriores llenan este área con el contenido específico
            de cada modo (planes/precios para upgrade, plan actual/historial/gestión
            de pago para gestión). Por ahora dejamos sólo un placeholder para que la
            pantalla no aparezca rota durante la integración del entry point. */}
        {modo === 'upgrade' ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEyebrow}>UPGRADE</Text>
            <Text style={styles.placeholderTitle}>Próxima iteración</Text>
            <Text style={styles.placeholderText}>
              Aquí mostraremos los planes Mensual y Anual, los beneficios de Pro y el
              CTA de pago. Esta iteración sólo monta la estructura.
            </Text>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEyebrow}>GESTIÓN</Text>
            <Text style={styles.placeholderTitle}>Próxima iteración</Text>
            <Text style={styles.placeholderText}>
              Aquí mostraremos tu plan activo, próxima renovación, método de pago,
              historial e instrucciones de cancelación.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           12,
      paddingHorizontal: 20,
      paddingBottom:     16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderDefault,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.cardBg,
      borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
      flex:           1,
      color:          c.inkPrimary,
      fontFamily:     'SpaceGrotesk-Bold',
      fontSize:       18,
      letterSpacing: -0.5,
      textAlign:     'center',
    },
    headerSpacer: {
      width: 36, height: 36,
    },
    placeholder: {
      marginTop:        24,
      padding:          20,
      borderRadius:     16,
      backgroundColor:  c.cardBg,
      borderWidth:      1,
      borderColor:      c.borderDefault,
      gap:              8,
    },
    placeholderEyebrow: {
      fontFamily:    'JetBrainsMono-Medium',
      fontSize:       10,
      letterSpacing:  1.6,
      color:          c.accent,
      textTransform: 'uppercase',
    },
    placeholderTitle: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:       20,
      color:          c.inkPrimary,
      letterSpacing: -0.4,
    },
    placeholderText: {
      fontFamily:  'SpaceGrotesk-Regular',
      fontSize:    13,
      lineHeight:  20,
      color:       c.inkSecondary,
    },
  })
}
