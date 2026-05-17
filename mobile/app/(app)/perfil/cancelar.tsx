/**
 * Subpantalla: Flujo de cancelación — 2 pasos
 * Params:
 *   plan_tipo      : 'mensual' | 'semestral' | 'anual'
 *   plan_renovacion: ISO date 'YYYY-MM-DD' — fecha hasta la que dura el acceso Pro
 */

import React, { useState } from 'react'
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Line, Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function formatFechaLarga(iso: string | null | undefined): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  const mes = MESES_ES[parseInt(month, 10) - 1] ?? ''
  const dia = parseInt(day, 10)
  if (!mes || !dia) return ''
  return `el ${dia} de ${mes} de ${year}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconChevronBack({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconBrain({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.5 3A2.5 2.5 0 0 0 7 5.5C5.5 5.5 4 7 4 8.5 3 9 2 10 2 11.5c0 1.5 1 2.5 2 3V17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5c1-.5 2-1.5 2-3 0-1.5-1-2.5-2-3 0-1.5-1.5-3-3-3-.2 0-.3 0-.5.05A2.5 2.5 0 0 0 14.5 3h-5Z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M12 3v15" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function IconShield({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2 4 6v6c0 5.25 3.5 9 8 10 4.5-1 8-4.75 8-10V6L12 2Z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M9 12l2 2 4-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconDNA({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4c0 0 2 3 2 8s-2 8-2 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M17 4c0 0-2 3-2 8s2 8 2 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={7} y1={9} x2={17} y2={9} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={7} y1={15} x2={17} y2={15} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

// ─── Loss row (paso 1) ────────────────────────────────────────────────────────

interface LossRowProps {
  Icon: React.ComponentType<{ color: string; size?: number }>
  titulo: string
  descripcion: string
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}

function LossRow({ Icon, titulo, descripcion, colors, styles }: LossRowProps) {
  return (
    <View style={styles.lossRow}>
      <View style={styles.lossIconWrap}>
        <Icon color={colors.inkSecondary} size={18} />
      </View>
      <View style={styles.lossTexts}>
        <Text style={styles.lossTitulo}>{titulo}</Text>
        <Text style={styles.lossDescripcion}>{descripcion}</Text>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CancelarScreen() {
  const { colors } = useTheme()
  const insets     = useSafeAreaInsets()
  const styles     = React.useMemo(() => makeStyles(colors), [colors])

  const params = useLocalSearchParams<{ plan_tipo?: string; plan_renovacion?: string }>()
  const planRenovacion = params.plan_renovacion || null

  const [paso, setPaso]             = useState<1 | 2>(1)
  const [proxVisible, setProxVisible] = useState(false)

  const fechaFin   = formatFechaLarga(planRenovacion)
  const accesoHasta = fechaFin
    ? `Tendrás acceso Pro hasta ${fechaFin}.`
    : 'Tendrás acceso Pro hasta el final del período actual.'

  function handleBack() {
    if (paso === 1) router.back()
    else setPaso(1)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Header — back comportamiento depende del paso */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconChevronBack color={colors.inkPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cancelar suscripción</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Indicador de progreso */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, paso === 1 && styles.progressDotActive]} />
          <View style={[styles.progressDot, paso === 2 && styles.progressDotActive]} />
        </View>

        {paso === 1 ? (
          // ══════════════════════════════════════════════════
          // PASO 1 — Contexto de lo que se pierde
          // ══════════════════════════════════════════════════
          <>
            <View style={styles.titleSection}>
              <Text style={styles.eyebrow}>PASO 1 DE 2</Text>
              <Text style={styles.titleMain}>¿Cancelar tu Pro?</Text>
              <Text style={styles.titleSub}>Esto es lo que cambia cuando cancelas.</Text>
            </View>

            {/* Qué se pierde */}
            <View style={styles.lossCard}>
              <LossRow
                Icon={IconBrain}
                titulo="Memoria longitudinal"
                descripcion="Tu entrenador no recordará tus patrones históricos ni progresión."
                colors={colors}
                styles={styles}
              />
              <View style={styles.lossDivider} />
              <LossRow
                Icon={IconShield}
                titulo="Alertas de patrón"
                descripcion="Sin detección de fatiga acumulada ni señales tempranas de lesión."
                colors={colors}
                styles={styles}
              />
              <View style={styles.lossDivider} />
              <LossRow
                Icon={IconDNA}
                titulo="ADN de entrenamiento"
                descripcion="Tu perfil adaptativo se congela hasta que vuelvas a Pro."
                colors={colors}
                styles={styles}
              />
            </View>

            {/* Nota tranquilizadora */}
            <View style={styles.notaCard}>
              <Text style={styles.notaText}>
                Tus datos no se eliminan. Si vuelves a Pro, tu entrenador retoma exactamente desde donde lo dejaste.
              </Text>
            </View>

            {/* Botón primario — mantener */}
            <TouchableOpacity
              style={styles.ctaMantenBtn}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaMantenText}>Mantener mi suscripción Pro</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Botón secundario — continuar cancelación */}
            <TouchableOpacity
              style={styles.ctaSecundario}
              onPress={() => setPaso(2)}
              activeOpacity={0.7}
            >
              <Text style={styles.ctaSecundarioText}>Continuar con la cancelación</Text>
            </TouchableOpacity>
          </>
        ) : (
          // ══════════════════════════════════════════════════
          // PASO 2 — Confirmación final
          // ══════════════════════════════════════════════════
          <>
            <View style={styles.titleSection}>
              <Text style={styles.eyebrow}>PASO 2 DE 2</Text>
              <Text style={styles.titleMain}>¿Confirmas la cancelación?</Text>
              <Text style={styles.titleSub}>{accesoHasta}</Text>
            </View>

            {/* Info card */}
            <View style={styles.confirmCard}>
              <Text style={styles.confirmCardText}>
                Tu suscripción no se renueva. Mantienes acceso completo a Pro hasta que termine el período actual.
              </Text>
            </View>

            {/* Botón cancelar — danger */}
            <TouchableOpacity
              style={styles.ctaDangerBtn}
              onPress={() => setProxVisible(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaDangerText}>Sí, cancelar</Text>
            </TouchableOpacity>

            {/* Botón volver */}
            <TouchableOpacity
              style={styles.ctaSecundario}
              onPress={() => setPaso(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.ctaSecundarioText}>Volver</Text>
            </TouchableOpacity>
          </>
        )}
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

    // Progreso
    progressRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
    progressDot: {
      height: 4, borderRadius: 2, backgroundColor: c.borderBright,
      width: 6,
    },
    progressDotActive: { width: 20, backgroundColor: c.accent },

    // Título
    titleSection: { gap: 8 },
    eyebrow: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 2,
      color: c.inkMuted, textTransform: 'uppercase',
    },
    titleMain: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 26,
      letterSpacing: -0.8, color: c.inkPrimary,
    },
    titleSub: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      lineHeight: 22, color: c.inkSecondary,
    },

    // Loss card (paso 1)
    lossCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, overflow: 'hidden',
    },
    lossRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    },
    lossIconWrap: {
      width: 38, height: 38, borderRadius: 10,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    lossTexts: { flex: 1, gap: 2 },
    lossTitulo: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14,
      color: c.inkSecondary, letterSpacing: -0.2,
    },
    lossDescripcion: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
      lineHeight: 17, color: c.inkMuted,
    },
    lossDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderDefault,
      marginLeft: 68,
    },

    // Nota card (paso 1)
    notaCard: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, padding: 14,
    },
    notaText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      lineHeight: 20, color: c.inkSecondary, textAlign: 'center',
    },

    // Confirm card (paso 2)
    confirmCard: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, padding: 16,
    },
    confirmCardText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      lineHeight: 22, color: c.inkSecondary, textAlign: 'center',
    },

    // Botones
    ctaMantenBtn: { borderRadius: 14, overflow: 'hidden' },
    ctaGradient: {
      paddingVertical: 17, paddingHorizontal: 24,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaMantenText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
      letterSpacing: -0.3, color: '#fff',
    },

    ctaDangerBtn: {
      borderRadius: 14, paddingVertical: 17, paddingHorizontal: 24,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.red,
    },
    ctaDangerText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
      letterSpacing: -0.3, color: '#fff',
    },

    ctaSecundario: { alignItems: 'center', paddingVertical: 6 },
    ctaSecundarioText: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: c.inkMuted,
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
