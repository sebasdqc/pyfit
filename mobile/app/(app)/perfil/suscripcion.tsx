/**
 * Pantalla de suscripción
 *
 * Query params:
 *   modo           : 'upgrade' | 'gestion'
 *   nombre         : nombre del usuario (URL-encoded)          — upgrade
 *   semanas        : semanas_activas como string numérico       — upgrade
 *   plan_tipo      : 'mensual' | 'semestral' | 'anual' | ''    — gestion
 *   plan_renovacion: ISO date string 'YYYY-MM-DD' | ''         — gestion
 *   sesiones_mes   : número de sesiones este mes como string   — gestion
 */

import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Line, Path } from 'react-native-svg'
import { apiGet, apiPost } from '../../../lib/api'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'

interface SolicitudSuscripcion {
  id: number
  plan_tipo: string
  codigo: string | null
  precio_lista: string
  descuento_aplicado: string
  precio_final: string
  estado: 'pendiente' | 'confirmada' | 'rechazada'
  created_at: string
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuscripcionModo = 'upgrade' | 'gestion'
type PlanId = 'mensual' | 'semestral' | 'anual'

function isValidModo(v: string | undefined): v is SuscripcionModo {
  return v === 'upgrade' || v === 'gestion'
}

interface PlanDef {
  id: PlanId
  nombre: string
  entero: string
  decimal: string
  precioEquiv: string | null
  periodo: string
  badge: string | null
  etiqueta: string | null
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const PLANES: PlanDef[] = [
  {
    id: 'mensual', nombre: 'Mensual',
    entero: '9', decimal: '99',
    precioEquiv: null,
    periodo: 'Facturado mensualmente',
    badge: null, etiqueta: null,
  },
  {
    id: 'semestral', nombre: 'Semestral',
    entero: '49', decimal: '99',
    precioEquiv: '$8.33/mes',
    periodo: 'Facturado cada 6 meses',
    badge: 'Ahorra 17%', etiqueta: null,
  },
  {
    id: 'anual', nombre: 'Anual',
    entero: '79', decimal: '99',
    precioEquiv: '$6.67/mes',
    periodo: 'Facturado anualmente',
    badge: 'Ahorra 33%', etiqueta: 'Mejor valor',
  },
]

const PLAN_DISPLAY: Record<string, { nombre: string; precio: string }> = {
  mensual:   { nombre: 'Plan Mensual',   precio: 'USD 9.99 / mes' },
  semestral: { nombre: 'Plan Semestral', precio: 'USD 49.99 / 6 meses' },
  anual:     { nombre: 'Plan Anual',     precio: 'USD 79.99 / año' },
}

const MESES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFechaLarga(iso: string | null | undefined): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  const mes = MESES_ES[parseInt(month, 10) - 1] ?? ''
  const dia = parseInt(day, 10)
  if (!mes || !dia) return ''
  return `${dia} de ${mes} de ${year}`
}

function getCambiarSubtitulo(planTipo: string): string {
  if (planTipo === 'mensual')   return 'Cambia a anual y ahorra 33%'
  if (planTipo === 'semestral') return 'Cambia a anual y ahorra un poco más'
  return 'Estás en el mejor plan disponible'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBrain({ color, size = 22 }: { color: string; size?: number }) {
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

function IconShield({ color, size = 22 }: { color: string; size?: number }) {
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

function IconDNA({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4c0 0 2 3 2 8s-2 8-2 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M17 4c0 0-2 3-2 8s2 8 2 8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={7} y1={9} x2={17} y2={9} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={7} y1={15} x2={17} y2={15} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function IconChevronBack({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconChevronRight({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconChevronDown({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconChevronUp({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 15l-6-6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconCheck({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconCreditCard({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 7a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7Z"
        stroke={color} strokeWidth={1.5} strokeLinejoin="round"
      />
      <Path d="M2 10h20" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function IconRefresh({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M1 4v6h6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3.51 15a9 9 0 1 0 .49-7.51" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function IconReceipt({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2V8Z"
        stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M16 13H8M16 9H8M10 17H8" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function IconX({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Upgrade sub-components ───────────────────────────────────────────────────

function PrecioDisplay({ entero, decimal, color }: { entero: string; decimal: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, marginBottom: 2 }}>
      <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color, marginTop: 7, lineHeight: 18 }}>$</Text>
      <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 40, color, letterSpacing: -1.5, lineHeight: 46 }}>{entero}</Text>
      <Text style={{ fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color, marginTop: 10, lineHeight: 26 }}>.{decimal}</Text>
    </View>
  )
}

interface BeneficioRowProps {
  Icon: React.ComponentType<{ color: string; size?: number }>
  titulo: string
  descripcion: string
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}

function BeneficioRow({ Icon, titulo, descripcion, colors, styles }: BeneficioRowProps) {
  return (
    <View style={styles.beneficioRow}>
      <View style={styles.beneficioIconWrap}>
        <Icon color={colors.accent} size={20} />
      </View>
      <View style={styles.beneficioTexts}>
        <Text style={styles.beneficioTitulo}>{titulo}</Text>
        <Text style={styles.beneficioDescripcion}>{descripcion}</Text>
      </View>
    </View>
  )
}

interface PlanCardProps {
  plan: PlanDef
  selected: boolean
  onSelect: (id: PlanId) => void
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}

function PlanCard({ plan, selected, onSelect, colors, styles }: PlanCardProps) {
  const priceColor = selected ? colors.inkPrimary : colors.inkSecondary
  return (
    <TouchableOpacity onPress={() => onSelect(plan.id)} activeOpacity={0.8}>
      <View style={[styles.planCard, selected && styles.planCardSelected]}>
        {plan.id === 'anual' && (
          <View style={styles.mejorValorChip}>
            <Text style={styles.mejorValorText}>★ MEJOR VALOR</Text>
          </View>
        )}
        <View style={styles.planHeaderRow}>
          <View style={styles.planNombreRow}>
            <View style={[styles.radioOuter, selected && { borderColor: colors.accent }]}>
              {selected && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
            </View>
            <Text style={[styles.planNombre, selected && { color: colors.inkPrimary }]}>
              {plan.nombre}
            </Text>
          </View>
          {plan.badge && (
            <View style={[styles.planBadge, selected && styles.planBadgeSelected]}>
              <Text style={[styles.planBadgeText, selected && styles.planBadgeTextSelected]}>
                {plan.badge}
              </Text>
            </View>
          )}
        </View>
        <PrecioDisplay entero={plan.entero} decimal={plan.decimal} color={priceColor} />
        {plan.precioEquiv && (
          <Text style={styles.planEquiv}>equivale a USD {plan.precioEquiv}</Text>
        )}
        <Text style={styles.planPeriodo}>{plan.periodo}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Gestión sub-components ───────────────────────────────────────────────────

interface GestionRowProps {
  Icon: React.ComponentType<{ color: string; size?: number }>
  titulo: string
  subtitulo?: string
  disabled?: boolean
  danger?: boolean
  onPress?: () => void
  colors: Colors
  styles: ReturnType<typeof makeStyles>
}

function GestionRow({ Icon, titulo, subtitulo, disabled, danger, onPress, colors, styles }: GestionRowProps) {
  const iconColor  = danger ? colors.red : disabled ? colors.inkFaint : colors.inkSecondary
  const titleColor = danger ? colors.red : disabled ? colors.inkMuted : colors.inkPrimary

  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.7}
      style={styles.gestionRow}
    >
      <View style={[styles.gestionRowIcon, disabled && { opacity: 0.45 }]}>
        <Icon color={iconColor} size={18} />
      </View>
      <View style={styles.gestionRowTexts}>
        <Text style={[styles.gestionRowTitle, { color: titleColor }]}>{titulo}</Text>
        {subtitulo != null && (
          <Text style={[styles.gestionRowSubtitulo, disabled && { color: colors.inkFaint }]}>
            {subtitulo}
          </Text>
        )}
      </View>
      {!danger && !disabled && (
        <IconChevronRight color={colors.inkMuted} />
      )}
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SuscripcionScreen() {
  const { colors } = useTheme()
  const insets     = useSafeAreaInsets()
  const styles     = React.useMemo(() => makeStyles(colors), [colors])

  const params = useLocalSearchParams<{
    modo?: string
    nombre?: string
    semanas?: string
    plan_tipo?: string
    plan_renovacion?: string
    sesiones_mes?: string
  }>()

  const modo: SuscripcionModo = isValidModo(params.modo) ? params.modo : 'upgrade'

  // upgrade params
  const nombre  = params.nombre ? decodeURIComponent(params.nombre) : ''
  const semanas = parseInt(params.semanas ?? '0', 10) || 0

  // gestion params
  const planTipo       = (params.plan_tipo || 'mensual') as string
  const planRenovacion = params.plan_renovacion || null
  const sesionesEsteMes = parseInt(params.sesiones_mes ?? '0', 10) || 0

  // upgrade state
  const [planActivo, setPlanActivo]       = useState<PlanId>('anual')
  const [latamExpanded, setLatamExpanded] = useState(false)

  // shared modal: body text drives visibility — null = hidden
  const [proxMsg, setProxMsg]             = useState<string | null>(null)

  // (cancel flow ahora es una pantalla separada)

  // código de descuento (influencer)
  const [codigoExpanded, setCodigoExpanded] = useState(false)
  const [codigoInput, setCodigoInput]       = useState('')
  const [codigoEstado, setCodigoEstado]     = useState<'idle' | 'validando' | 'valido' | 'invalido'>('idle')
  const [codigoMensaje, setCodigoMensaje]   = useState('')
  const [precioFinalCodigo, setPrecioFinalCodigo] = useState<number | null>(null)

  // solicitud de suscripción (reemplaza el mockup "Próximamente")
  const [cargandoSolicitud, setCargandoSolicitud] = useState(modo === 'upgrade')
  const [solicitudPendiente, setSolicitudPendiente] = useState<SolicitudSuscripcion | null>(null)
  const [enviandoSolicitud, setEnviandoSolicitud]   = useState(false)
  const [solicitudExito, setSolicitudExito]         = useState(false)

  useEffect(() => {
    if (modo !== 'upgrade') return
    let vivo = true
    apiGet('/api/promos/solicitudes/mias/')
      .then((data: SolicitudSuscripcion | null) => {
        if (vivo && data?.estado === 'pendiente') setSolicitudPendiente(data)
      })
      .catch(() => {})
      .finally(() => { if (vivo) setCargandoSolicitud(false) })
    return () => { vivo = false }
  }, [modo])

  async function validarCodigo(codigo: string) {
    const limpio = codigo.trim()
    if (!limpio) {
      setCodigoEstado('idle')
      setPrecioFinalCodigo(null)
      return
    }
    setCodigoEstado('validando')
    try {
      const data = await apiPost('/api/promos/validar/', { codigo: limpio, plan_tipo: planActivo })
      if (data.valido) {
        setCodigoEstado('valido')
        setCodigoMensaje(`Código aplicado: -USD ${Number(data.descuento_aplicado).toFixed(2)}`)
        setPrecioFinalCodigo(Number(data.precio_final))
      } else {
        setCodigoEstado('invalido')
        setCodigoMensaje(data.mensaje || 'Código inválido.')
        setPrecioFinalCodigo(null)
      }
    } catch {
      setCodigoEstado('invalido')
      setCodigoMensaje('No pudimos validar el código. Intenta de nuevo.')
      setPrecioFinalCodigo(null)
    }
  }

  // Si el usuario cambia de plan con un código ya aplicado, recalcula el precio.
  useEffect(() => {
    if (codigoEstado === 'valido' || codigoEstado === 'invalido') validarCodigo(codigoInput)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planActivo])

  async function handleContinuar() {
    if (enviandoSolicitud) return
    setEnviandoSolicitud(true)
    try {
      const body: { plan_tipo: PlanId; codigo?: string } = { plan_tipo: planActivo }
      if (codigoEstado === 'valido') body.codigo = codigoInput.trim()
      const data: SolicitudSuscripcion = await apiPost('/api/promos/solicitudes/', body)
      setSolicitudPendiente(data)
      setSolicitudExito(true)
    } catch (e: any) {
      setProxMsg(e?.message || 'No pudimos procesar tu solicitud. Intenta de nuevo en unos minutos.')
    } finally {
      setEnviandoSolicitud(false)
    }
  }

  const planInfo = PLANES.find(p => p.id === planActivo)!
  const precioMostrado = codigoEstado === 'valido' && precioFinalCodigo != null
    ? precioFinalCodigo.toFixed(2)
    : `${planInfo.entero}.${planInfo.decimal}`
  const ctaText = enviandoSolicitud
    ? 'Enviando solicitud…'
    : `Continuar con ${planInfo.nombre} (USD ${precioMostrado})`

  const subtituloHero =
    nombre && semanas > 0
      ? `${nombre}, llevas ${semanas} semanas construyendo algo real. Tu entrenador adaptativo te está esperando.`
      : nombre
        ? `${nombre}, tu entrenador adaptativo te está esperando.`
        : 'Tu entrenador adaptativo te está esperando.'

  const planDisplay  = PLAN_DISPLAY[planTipo] ?? PLAN_DISPLAY['mensual']
  const fechaRenov   = formatFechaLarga(planRenovacion)
  const cambiarSub   = getCambiarSubtitulo(planTipo)
  const cambiarActivo = planTipo !== 'anual'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <IconChevronBack color={colors.inkPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {modo === 'gestion' ? 'Mi suscripción' : 'Zyfit Pro'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ── Contenido ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {modo === 'upgrade' ? (

          // ════════════════════════════════════════════════════════════════
          // MODO UPGRADE
          // ════════════════════════════════════════════════════════════════
          <>
            {/* Hero */}
            <View style={styles.heroSection}>
              <Text style={styles.eyebrow}>ZYFIT PRO</Text>
              <Text style={styles.heroTitle}>
                {'Tu entrenador,\n'}
                <Text style={styles.heroTitleAccent}>completo.</Text>
              </Text>
              <Text style={styles.heroSubtitle}>{subtituloHero}</Text>
            </View>

            {cargandoSolicitud ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
            ) : solicitudPendiente ? (

              // ── Solicitud ya enviada, esperando confirmación de pago ──
              <View style={styles.planActivoCard}>
                <View style={styles.planActivoHeaderRow}>
                  <Text style={styles.planActivoNombre}>
                    {PLAN_DISPLAY[solicitudPendiente.plan_tipo]?.nombre ?? 'Zyfit Pro'}
                  </Text>
                  <View style={[styles.proActivoBadge, { borderColor: colors.accent }]}>
                    <Text style={[styles.proActivoText, { color: colors.accent }]}>Pendiente</Text>
                  </View>
                </View>
                <Text style={styles.planActivoPrecio}>
                  USD {solicitudPendiente.precio_final}
                  {solicitudPendiente.codigo ? ` · código ${solicitudPendiente.codigo}` : ''}
                </Text>
                <Text style={styles.planActivoRenovacion}>
                  Tu solicitud está pendiente de confirmación de pago. Nuestro equipo te contactará
                  a tu correo registrado para completar el proceso.
                </Text>
              </View>

            ) : (
              <>
                {/* Beneficios */}
                <View style={styles.beneficiosSection}>
                  <BeneficioRow
                    Icon={IconBrain}
                    titulo="Memoria sin límite"
                    descripcion="Tu entrenador recuerda cada sesión, patrón y progreso tuyo."
                    colors={colors}
                    styles={styles}
                  />
                  <View style={styles.beneficioDivider} />
                  <BeneficioRow
                    Icon={IconShield}
                    titulo="Protección activa"
                    descripcion="Alertas de fatiga, lesiones emergentes y sobrecarga antes de que escalen."
                    colors={colors}
                    styles={styles}
                  />
                  <View style={styles.beneficioDivider} />
                  <BeneficioRow
                    Icon={IconDNA}
                    titulo="Tu perfil como atleta"
                    descripcion="ADN de entrenamiento actualizado mensualmente con tus datos reales."
                    colors={colors}
                    styles={styles}
                  />
                </View>

                {/* Selector de planes */}
                <View style={styles.planesSection}>
                  <Text style={styles.sectionLabel}>ELIGE TU PLAN</Text>
                  <View style={styles.planesStack}>
                    {PLANES.map(plan => (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        selected={planActivo === plan.id}
                        onSelect={setPlanActivo}
                        colors={colors}
                        styles={styles}
                      />
                    ))}
                  </View>
                </View>

                {/* Código de descuento */}
                <View style={styles.latamContainer}>
                  <TouchableOpacity
                    onPress={() => setCodigoExpanded(v => !v)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.latamRow}>
                      <Text style={styles.latamText}>¿Tienes un código de descuento?</Text>
                      {codigoExpanded
                        ? <IconChevronUp color={colors.inkMuted} />
                        : <IconChevronDown color={colors.inkMuted} />}
                    </View>
                  </TouchableOpacity>
                  {codigoExpanded && (
                    <View style={{ gap: 6, marginTop: 4 }}>
                      <TextInput
                        value={codigoInput}
                        onChangeText={(t) => { setCodigoInput(t); if (codigoEstado !== 'idle') setCodigoEstado('idle') }}
                        onBlur={() => validarCodigo(codigoInput)}
                        onSubmitEditing={() => validarCodigo(codigoInput)}
                        placeholder="Ej: MARIA20"
                        placeholderTextColor={colors.inkMuted}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        style={styles.codigoInput}
                      />
                      {codigoEstado === 'validando' && (
                        <Text style={styles.latamText}>Validando código…</Text>
                      )}
                      {codigoEstado === 'valido' && (
                        <Text style={[styles.latamText, { color: colors.green }]}>{codigoMensaje}</Text>
                      )}
                      {codigoEstado === 'invalido' && (
                        <Text style={[styles.latamText, { color: colors.red }]}>{codigoMensaje}</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Nota LATAM */}
                <TouchableOpacity
                  style={styles.latamContainer}
                  onPress={() => setLatamExpanded(v => !v)}
                  activeOpacity={0.7}
                >
                  <View style={styles.latamRow}>
                    <Text style={styles.latamText}>
                      Precio en USD. Disponible en moneda local según tu región.
                    </Text>
                    {latamExpanded
                      ? <IconChevronUp color={colors.inkMuted} />
                      : <IconChevronDown color={colors.inkMuted} />}
                  </View>
                  {latamExpanded && (
                    <Text style={styles.latamExpanded}>
                      En Venezuela, Colombia y México el precio se ajusta automáticamente al equivalente local. Se mostrará en tu moneda al proceder al pago.
                    </Text>
                  )}
                </TouchableOpacity>

                {/* CTA */}
                <TouchableOpacity
                  style={[styles.ctaBtn, enviandoSolicitud && { opacity: 0.7 }]}
                  onPress={handleContinuar}
                  disabled={enviandoSolicitud}
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

                {/* Link secundario */}
                <TouchableOpacity
                  style={styles.starterLink}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.starterLinkText}>Continuar con Starter</Text>
                </TouchableOpacity>

                {/* Footer legal */}
                <View style={styles.legalFooter}>
                  <Text style={styles.legalText}>Cancela cuando quieras. Sin permanencia.</Text>
                  <Text style={styles.legalText}>
                    {'Al suscribirte aceptas los '}
                    <Text style={styles.legalLink} onPress={() => router.push('/(auth)/terminos' as any)}>
                      Términos de servicio
                    </Text>
                    {' y la '}
                    <Text style={styles.legalLink} onPress={() => router.push('/(auth)/privacidad' as any)}>
                      Política de privacidad
                    </Text>
                    .
                  </Text>
                </View>
              </>
            )}
          </>

        ) : (

          // ════════════════════════════════════════════════════════════════
          // MODO GESTIÓN
          // ════════════════════════════════════════════════════════════════
          <>
            {/* Card plan activo */}
            <View style={styles.planActivoCard}>
              <View style={styles.planActivoHeaderRow}>
                <Text style={styles.planActivoNombre}>{planDisplay.nombre}</Text>
                <View style={styles.proActivoBadge}>
                  <IconCheck color={colors.green} size={11} />
                  <Text style={styles.proActivoText}>Pro activo</Text>
                </View>
              </View>

              <Text style={styles.planActivoPrecio}>{planDisplay.precio}</Text>

              {fechaRenov ? (
                <Text style={styles.planActivoRenovacion}>
                  Próxima renovación: {fechaRenov}
                </Text>
              ) : null}

              <View style={styles.planActivoMetodo}>
                <IconCreditCard color={colors.inkMuted} size={13} />
                <Text style={styles.planActivoMetodoText}>Facturación gestionada manualmente por el equipo</Text>
              </View>
            </View>

            {/* Este mes — métricas de uso */}
            <View style={styles.usageSection}>
              <Text style={styles.sectionLabel}>ESTE MES</Text>
              <View style={styles.usageGrid}>
                <View style={styles.usageCard}>
                  <Text style={styles.usageValue}>{sesionesEsteMes}</Text>
                  <Text style={styles.usageLabel}>{'Sesiones\ngeneradas'}</Text>
                </View>
                <View style={styles.usageCard}>
                  <Text style={[styles.usageValue, { color: colors.accent }]}>∞</Text>
                  <Text style={styles.usageLabel}>{'Sesiones\ndisponibles'}</Text>
                </View>
              </View>
            </View>

            {/* Opciones de gestión */}
            <View style={styles.gestionOpcionesCard}>
              <GestionRow
                Icon={IconRefresh}
                titulo="Cambiar mi plan"
                subtitulo={cambiarSub}
                disabled={!cambiarActivo}
                onPress={() => router.push(`/(app)/perfil/cambiar-plan?plan_tipo=${planTipo}` as any)}
                colors={colors}
                styles={styles}
              />
              <View style={styles.gestionDivider} />
              <GestionRow
                Icon={IconReceipt}
                titulo="Historial de pagos"
                subtitulo="Facturas y comprobantes"
                onPress={() => router.push('/(app)/perfil/historial-pagos' as any)}
                colors={colors}
                styles={styles}
              />
              <View style={styles.gestionDivider} />
              <GestionRow
                Icon={IconX}
                titulo="Cancelar suscripción"
                danger
                onPress={() => router.push(`/(app)/perfil/cancelar?plan_tipo=${planTipo}&plan_renovacion=${planRenovacion || ''}` as any)}
                colors={colors}
                styles={styles}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Modal próximamente (reutilizado para CTA upgrade + acciones gestión) ── */}
      <Modal visible={proxMsg !== null} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.modalOverlay} onPress={() => setProxMsg(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalEmoji}>🚀</Text>
            <Text style={styles.modalTitle}>Próximamente</Text>
            <Text style={styles.modalBody}>{proxMsg ?? ''}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setProxMsg(null)} activeOpacity={0.8}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Modal de éxito al enviar la solicitud de suscripción ── */}
      <Modal visible={solicitudExito} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.modalOverlay} onPress={() => setSolicitudExito(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalEmoji}>✅</Text>
            <Text style={styles.modalTitle}>Solicitud recibida</Text>
            <Text style={styles.modalBody}>
              Nuestro equipo te contactará a tu correo registrado en las próximas 24-48h para
              completar el pago y activar tu Zyfit Pro.
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setSolicitudExito(false)} activeOpacity={0.8}>
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
    // ── Header ──
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

    // ── Scroll ──
    scrollContent: { padding: 20, gap: 24 },

    // ── Shared label ──
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 2,
      color: c.inkMuted, textTransform: 'uppercase',
    },

    // ── Hero (upgrade) ──
    heroSection: { gap: 10, paddingTop: 8 },
    eyebrow: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 2,
      color: c.accent, textTransform: 'uppercase',
    },
    heroTitle: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 36,
      letterSpacing: -1.2, lineHeight: 42, color: c.inkPrimary,
    },
    heroTitleAccent: {
      fontFamily: 'InstrumentSerif-Italic', fontSize: 38,
      letterSpacing: -0.5, color: c.accent,
    },
    heroSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
      lineHeight: 22, color: c.inkSecondary, marginTop: 2,
    },

    // ── Beneficios (upgrade) ──
    beneficiosSection: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, overflow: 'hidden',
    },
    beneficioRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    },
    beneficioIconWrap: {
      width: 42, height: 42, borderRadius: 12,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    beneficioTexts: { flex: 1, gap: 2 },
    beneficioTitulo: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14,
      color: c.inkPrimary, letterSpacing: -0.2,
    },
    beneficioDescripcion: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
      lineHeight: 18, color: c.inkSecondary,
    },
    beneficioDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderDefault,
      marginLeft: 72,
    },

    // ── Plan cards (upgrade) ──
    planesSection: { gap: 10 },
    planesStack: { gap: 10 },
    planCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 16,
    },
    planCardSelected: {
      borderColor: c.accent, borderWidth: 1.5,
      backgroundColor: c.glassBg,
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
    planHeaderRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    planNombreRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
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
    planBadge: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
    },
    planBadgeSelected: {
      backgroundColor: c.cardBg, borderColor: c.green,
    },
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

    // ── LATAM (upgrade) ──
    latamContainer: { paddingHorizontal: 2, gap: 6 },
    latamRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', gap: 8,
    },
    latamText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
      lineHeight: 16, color: c.inkMuted, flex: 1,
    },
    latamExpanded: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
      lineHeight: 17, color: c.inkMuted, paddingTop: 2,
    },
    codigoInput: {
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, letterSpacing: 1,
      color: c.inkPrimary,
    },

    // ── CTA (upgrade) ──
    ctaBtn: { borderRadius: 14, overflow: 'hidden' },
    ctaBtnGradient: {
      paddingVertical: 17, paddingHorizontal: 24,
      alignItems: 'center', justifyContent: 'center',
    },
    ctaBtnText: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 16,
      letterSpacing: -0.3, color: '#fff',
    },

    // ── Link secundario + footer legal (upgrade) ──
    starterLink: { alignItems: 'center', paddingVertical: 4 },
    starterLinkText: {
      fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: c.inkMuted,
    },
    legalFooter: { gap: 4, paddingHorizontal: 4, paddingBottom: 4 },
    legalText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
      lineHeight: 16, color: c.inkMuted, textAlign: 'center',
    },
    legalLink: {
      color: c.inkSecondary, textDecorationLine: 'underline',
    },

    // ── Plan activo card (gestión) ──
    planActivoCard: {
      borderWidth: 1.5, borderColor: c.accent,
      borderRadius: 18, padding: 20,
      backgroundColor: c.glassBg, gap: 6,
    },
    planActivoHeaderRow: {
      flexDirection: 'row', alignItems: 'flex-start',
      justifyContent: 'space-between', gap: 12,
    },
    planActivoNombre: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 24,
      letterSpacing: -0.7, color: c.inkPrimary, flex: 1,
    },
    proActivoBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.cardBg,
      borderWidth: 1, borderColor: c.green,
      borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
    },
    proActivoText: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 10,
      letterSpacing: 0.3, color: c.green,
    },
    planActivoPrecio: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15,
      color: c.inkSecondary, letterSpacing: -0.2,
    },
    planActivoRenovacion: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      lineHeight: 20, color: c.inkSecondary, marginTop: 2,
    },
    planActivoMetodo: {
      flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6,
    },
    planActivoMetodoText: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted,
    },

    // ── Este mes — usage grid (gestión) ──
    usageSection: { gap: 10 },
    usageGrid: { flexDirection: 'row', gap: 12 },
    usageCard: {
      flex: 1, backgroundColor: c.cardBg,
      borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 16, gap: 6,
      alignItems: 'center',
    },
    usageValue: {
      fontFamily: 'SpaceGrotesk-Bold', fontSize: 36,
      letterSpacing: -1.5, color: c.inkPrimary, lineHeight: 40,
    },
    usageLabel: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
      color: c.inkMuted, textAlign: 'center', lineHeight: 16,
    },

    // ── Opciones de gestión ──
    gestionOpcionesCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, overflow: 'hidden',
    },
    gestionRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    },
    gestionRowIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    gestionRowTexts: { flex: 1, gap: 2 },
    gestionRowTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15,
      letterSpacing: -0.3, color: c.inkPrimary,
    },
    gestionRowSubtitulo: {
      fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
      color: c.inkMuted, lineHeight: 17,
    },
    gestionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderDefault,
      marginLeft: 66,
    },

    // ── Modales ──
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
