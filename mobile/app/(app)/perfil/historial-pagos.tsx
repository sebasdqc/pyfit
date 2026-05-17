/**
 * Subpantalla: Historial de pagos
 * Intenta cargar /api/payments/history/ — muestra estado vacío si el endpoint
 * aún no existe o no hay transacciones. La lista se renderiza automáticamente
 * cuando el backend empiece a devolver datos.
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Rect } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pago {
  id: string | number
  fecha: string      // ISO 'YYYY-MM-DD'
  concepto: string   // e.g. 'Zyfit Pro · Anual'
  monto: string      // e.g. '79.99'
  moneda: string     // e.g. 'USD'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MESES_ABREV = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatFechaCorta(iso: string): string {
  const [, month, day] = iso.split('-')
  const mes = MESES_ABREV[parseInt(month, 10) - 1] ?? ''
  return `${parseInt(day, 10)} ${mes}`
}

function getYear(iso: string): string {
  return iso.split('-')[0] ?? ''
}

function groupByYear(pagos: Pago[]): { year: string; items: Pago[] }[] {
  const map: Record<string, Pago[]> = {}
  for (const p of pagos) {
    const y = getYear(p.fecha)
    if (!map[y]) map[y] = []
    map[y].push(p)
  }
  return Object.keys(map)
    .sort((a, b) => b.localeCompare(a))
    .map(year => ({ year, items: map[year] }))
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconChevronBack({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconDownload({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconReceipt({ color, size = 48 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2V8Z"
        stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M16 13H8M16 9H8M10 17H8" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  )
}

// ─── Row component ────────────────────────────────────────────────────────────

interface PagoRowProps {
  pago: Pago
  onDescargar: () => void
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}

function PagoRow({ pago, onDescargar, colors, styles }: PagoRowProps) {
  return (
    <View style={styles.pagoRow}>
      <View style={styles.pagoInfo}>
        <Text style={styles.pagoConcepto}>{pago.concepto}</Text>
        <Text style={styles.pagoFecha}>{formatFechaCorta(pago.fecha)}</Text>
      </View>
      <View style={styles.pagoRight}>
        <Text style={styles.pagoMonto}>{pago.moneda} {pago.monto}</Text>
        <TouchableOpacity
          onPress={onDescargar}
          style={styles.downloadBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconDownload color={colors.inkMuted} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HistorialPagosScreen() {
  const { colors } = useTheme()
  const insets     = useSafeAreaInsets()
  const styles     = React.useMemo(() => makeStyles(colors), [colors])

  const [pagos, setPagos]       = useState<Pago[]>([])
  const [loading, setLoading]   = useState(true)
  const [proxVisible, setProxVisible] = useState(false)

  useEffect(() => {
    apiGet('/api/payments/history/')
      .then((data: any) => setPagos(Array.isArray(data) ? data : []))
      .catch(() => setPagos([]))
      .finally(() => setLoading(false))
  }, [])

  const grupos = groupByYear(pagos)
  const isEmpty = !loading && pagos.length === 0

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
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconChevronBack color={colors.inkPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de pagos</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : isEmpty ? (
        /* ── Estado vacío ── */
        <View style={styles.centered}>
          <IconReceipt color={colors.inkFaint} size={52} />
          <Text style={styles.emptyTitle}>Sin historial aún</Text>
          <Text style={styles.emptySubtitle}>
            Tu historial de pagos aparecerá aquí después de tu primer cobro.
          </Text>
        </View>
      ) : (
        /* ── Lista agrupada por año ── */
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {grupos.map(grupo => (
            <View key={grupo.year} style={styles.yearGroup}>
              <Text style={styles.yearLabel}>{grupo.year}</Text>
              <View style={styles.yearCard}>
                {grupo.items.map((pago, idx) => (
                  <React.Fragment key={pago.id}>
                    <PagoRow
                      pago={pago}
                      onDescargar={() => setProxVisible(true)}
                      colors={colors}
                      styles={styles}
                    />
                    {idx < grupo.items.length - 1 && <View style={styles.rowDivider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal próximamente — descarga de factura */}
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

    centered: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 40, gap: 12,
    },
    emptyTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 18,
      letterSpacing: -0.4, color: c.inkPrimary, textAlign: 'center',
    },
    emptySubtitle: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      lineHeight: 20, color: c.inkMuted, textAlign: 'center',
    },

    scroll: { padding: 20, gap: 20 },

    yearGroup: { gap: 8 },
    yearLabel: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 2,
      color: c.inkMuted, textTransform: 'uppercase', paddingLeft: 2,
    },
    yearCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, overflow: 'hidden',
    },
    pagoRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14,
    },
    pagoInfo: { flex: 1, gap: 2 },
    pagoConcepto: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14,
      color: c.inkPrimary, letterSpacing: -0.2,
    },
    pagoFecha: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted,
    },
    pagoRight: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    pagoMonto: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14,
      color: c.inkSecondary, letterSpacing: -0.2,
    },
    downloadBtn: {
      width: 32, height: 32, borderRadius: 8,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderDefault,
      marginHorizontal: 16,
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
