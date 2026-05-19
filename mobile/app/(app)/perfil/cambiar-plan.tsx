/**
 * Subpantalla: Cambiar de plan
 * Params:
 *   plan_tipo : 'mensual' | 'semestral' | 'anual' — plan actual del usuario
 */

import React, { useState } from 'react'
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'

// ─── Types & data ─────────────────────────────────────────────────────────────

type PlanId = 'mensual' | 'semestral' | 'anual'

const PLANES = [
  {
    id: 'mensual'   as PlanId, nombre: 'Mensual',
    entero: '9',  decimal: '99', precioEquiv: null,
    periodo: 'Facturado mensualmente',   badge: null,         etiqueta: null,
  },
  {
    id: 'semestral' as PlanId, nombre: 'Semestral',
    entero: '49', decimal: '99', precioEquiv: '$8.33/mes',
    periodo: 'Facturado cada 6 meses',   badge: 'Ahorra 17%', etiqueta: null,
  },
  {
    id: 'anual'     as PlanId, nombre: 'Anual',
    entero: '79', decimal: '99', precioEquiv: '$6.67/mes',
    periodo: 'Facturado anualmente',     badge: 'Ahorra 33%', etiqueta: 'Mejor valor',
  },
]

function getDefaultSelection(current: string): PlanId {
  if (current === 'mensual' || current === 'semestral') return 'anual'
  return 'mensual'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconChevronBack({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Price display ────────────────────────────────────────────────────────────

function PrecioDisplay({ entero, decimal, color }: { entero: string; decimal: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, marginBottom: 2 }}>
      <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color, marginTop: 7, lineHeight: 18 }}>$</Text>
      <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 40, color, letterSpacing: -1.5, lineHeight: 46 }}>{entero}</Text>
      <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color, marginTop: 10, lineHeight: 26 }}>.{decimal}</Text>
    </View>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: typeof PLANES[0]
  estado: 'current' | 'selected' | 'normal'
  onSelect: (id: PlanId) => void
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}

function PlanCard({ plan, estado, onSelect, colors, styles }: PlanCardProps) {
  const isCurrent  = estado === 'current'
  const isSelected = estado === 'selected'
  const priceColor = isSelected ? colors.inkPrimary : colors.inkSecondary

  return (
    <TouchableOpacity
      onPress={isCurrent ? undefined : () => onSelect(plan.id)}
      disabled={isCurrent}
      activeOpacity={isCurrent ? 1 : 0.8}
    >
      <View style={[
        styles.planCard,
        isSelected && styles.planCardSelected,
        isCurrent  && styles.planCardCurrent,
      ]}>

        {/* "Mejor valor" chip — solo anual, solo cuando no es current */}
        {plan.etiqueta && !isCurrent && (
          <View style={styles.mejorValorChip}>
            <Text style={styles.mejorValorText}>★ MEJOR VALOR</Text>
          </View>
        )}

        {/* "Plan actual" chip — solo plan current */}
        {isCurrent && (
          <View style={styles.planActualChip}>
            <Text style={styles.planActualText}>PLAN ACTUAL</Text>
          </View>
        )}

        {/* Fila: radio/chip + nombre | badge ahorro */}
        <View style={styles.planHeaderRow}>
          <View style={styles.planNombreRow}>
            {!isCurrent && (
              <View style={[styles.radioOuter, isSelected && { borderColor: colors.accent }]}>
                {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
              </View>
            )}
            <Text style={[
              styles.planNombre,
              isSelected && { color: colors.inkPrimary },
              isCurrent  && styles.planNombreCurrent,
            ]}>
              {plan.nombre}
            </Text>
          </View>
          {plan.badge && !isCurrent && (
            <View style={[styles.planBadge, isSelected && styles.planBadgeSelected]}>
              <Text style={[styles.planBadgeText, isSelected && styles.planBadgeTextSelected]}>
                {plan.badge}
              </Text>
            </View>
          )}
        </View>

        {/* Precio */}
        <View style={isCurrent ? { opacity: 0.55 } : {}}>
          <PrecioDisplay entero={plan.entero} decimal={plan.decimal} color={priceColor} />
          {plan.precioEquiv && (
            <Text style={styles.planEquiv}>equivale a USD {plan.precioEquiv}</Text>
          )}
          <Text style={styles.planPeriodo}>{plan.periodo}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CambiarPlanScreen() {
  const { colors } = useTheme()
  const insets     = useSafeAreaInsets()
  const styles     = React.useMemo(() => makeStyles(colors), [colors])

  const { plan_tipo } = useLocalSearchParams<{ plan_tipo?: string }>()
  const planActual    = (plan_tipo || 'mensual') as PlanId

  const [planSeleccionado, setPlanSeleccionado] = useState<PlanId>(getDefaultSelection(planActual))
  const [proxVisible, setProxVisible]           = useState(false)

  const planInfo = PLANES.find(p => p.id === planSeleccionado)!
  const ctaText  = `Cambiar a ${planInfo.nombre} (USD ${planInfo.entero}.${planInfo.decimal})`

  function getEstado(id: PlanId): 'current' | 'selected' | 'normal' {
    if (id === planActual)      return 'current'
    if (id === planSeleccionado) return 'selected'
    return 'normal'
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.replace('/(app)/perfil')}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconChevronBack color={colors.inkPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cambiar mi plan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introSection}>
          <Text style={styles.eyebrow}>ZYFIT PRO</Text>
          <Text style={styles.introTitle}>Elige tu nuevo plan</Text>
          <Text style={styles.introSubtitle}>
            El cambio se aplica al próximo ciclo de facturación.
          </Text>
        </View>

        {/* Plan cards */}
        <View style={styles.planesStack}>
          {PLANES.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              estado={getEstado(plan.id)}
              onSelect={setPlanSeleccionado}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => setProxVisible(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaBtnGradient}
          >
            <Text style={styles.ctaBtnText}>{ctaText}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelLink} onPress={() => router.replace('/(app)/perfil')} activeOpacity={0.7}>
          <Text style={styles.cancelLinkText}>Mantener plan actual</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal próximamente */}
      <Modal visible={proxVisible} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.modalOverlay} onPress={() => setProxVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalEmoji}>🚀</Text>
            <Text style={styles.modalTitle}>Próximamente</Text>
            <Text style={styles.modalBody}>
              Los pagos estarán disponibles muy pronto. Te avisaremos en cuanto puedas gestionar tu suscripción desde la app.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setProxVisible(false)} activeOpacity={0.8}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: {
      flex: 1, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 18, letterSpacing: -0.5, textAlign: 'center',
    },
    headerSpacer: { width: 36, height: 36 },

    scroll: { padding: 20, gap: 20 },

    introSection: { gap: 8, paddingTop: 4 },
    eyebrow: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 2,
      color: c.accent, textTransform: 'uppercase',
    },
    introTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 26,
      letterSpacing: -0.8, color: c.inkPrimary,
    },
    introSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      lineHeight: 20, color: c.inkSecondary,
    },

    planesStack: { gap: 10 },

    // Plan cards
    planCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 16,
    },
    planCardSelected: {
      borderColor: c.accent, borderWidth: 1.5, backgroundColor: c.glassBg,
    },
    planCardCurrent: {
      borderColor: c.borderBright, backgroundColor: c.cardBg,
    },
    mejorValorChip: {
      alignSelf: 'flex-start', borderRadius: 6,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10,
    },
    mejorValorText: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 9,
      letterSpacing: 1.5, color: c.accent, textTransform: 'uppercase',
    },
    planActualChip: {
      alignSelf: 'flex-start', borderRadius: 6,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.green,
      paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10,
    },
    planActualText: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 9,
      letterSpacing: 1.5, color: c.green, textTransform: 'uppercase',
    },
    planHeaderRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    planNombreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    radioOuter: {
      width: 18, height: 18, borderRadius: 9,
      borderWidth: 1.5, borderColor: c.borderBright,
      alignItems: 'center', justifyContent: 'center',
    },
    radioInner: { width: 9, height: 9, borderRadius: 5 },
    planNombre: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15,
      letterSpacing: -0.3, color: c.inkSecondary,
    },
    planNombreCurrent: { color: c.inkSecondary, opacity: 0.7 },
    planBadge: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    },
    planBadgeSelected: { borderColor: c.green },
    planBadgeText: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      letterSpacing: 0.5, color: c.inkMuted,
    },
    planBadgeTextSelected: { color: c.green },
    planEquiv: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
      color: c.inkMuted, lineHeight: 16,
    },
    planPeriodo: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
      color: c.inkMuted, lineHeight: 16, marginTop: 1,
    },

    // CTA
    ctaBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
    ctaBtnGradient: {
      paddingVertical: 17, paddingHorizontal: 24,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaBtnText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
      letterSpacing: -0.3, color: '#fff',
    },
    cancelLink: { alignItems: 'center', paddingVertical: 4 },
    cancelLinkText: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkMuted,
    },

    // Modal
    modalOverlay: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.sheetBg,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40,
      alignItems: 'center', gap: 12,
      borderWidth: 1, borderColor: c.borderBright, borderBottomWidth: 0,
    },
    modalHandle: {
      width: 36, height: 4, borderRadius: 2,
      backgroundColor: c.borderBright, marginBottom: 8,
    },
    modalEmoji: { fontSize: 32 },
    modalTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
      letterSpacing: -0.5, color: c.inkPrimary, textAlign: 'center',
    },
    modalBody: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      lineHeight: 22, color: c.inkSecondary, textAlign: 'center',
    },
    modalBtn: {
      marginTop: 8, width: '100%',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderBright,
      borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    },
    modalBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary,
    },
  })
}
