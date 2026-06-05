import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  Linking,
  Share,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle, Rect } from 'react-native-svg'
import { P, iniciales, CONTACT_URL } from '../../lib/coachTheme'
import { fetchCoachMe, fetchCoachBilling, type CoachBilling } from '../../lib/coachApi'
import { getCoachUser, clearCoachSession } from '../../lib/storage'

// Estado de la suscripción → etiqueta visible.
const ESTADO_LABEL: Record<string, string> = {
  activa: 'Activo', pausada: 'Pausado', vencida: 'Vencido',
}

// '2026-07-15' → '15 jul 2026'.
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return '—'
  return `${d} ${MESES[m - 1]} ${y}`
}

// ─── Tonos de íconos ────────────────────────────────────────────────────────────

const TONES = {
  green:  { fg: P.green,      bg: P.greenSoft },
  purple: { fg: P.purpleMid,  bg: 'rgba(150,128,255,0.16)' },
  amber:  { fg: P.amber,      bg: P.amberSoft },
  blue:   { fg: '#5B8DEF',    bg: 'rgba(91,141,239,0.16)' },
} as const
type Tone = keyof typeof TONES

// ─── Iconos ─────────────────────────────────────────────────────────────────────

const sw = 1.7
function IconInvite({ c }: { c: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.3} stroke={c} strokeWidth={sw} />
      <Path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M18.5 7v6M15.5 10h6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  )
}
function IconUsers({ c }: { c: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Circle cx={10} cy={8} r={3.3} stroke={c} strokeWidth={sw} />
      <Path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.38M15.5 5.2a3.4 3.4 0 0 1 0 6.6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  )
}
function IconLock({ c }: { c: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} stroke={c} strokeWidth={sw} />
      <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  )
}
function IconSupport({ c }: { c: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-4.6A7.5 7.5 0 1 1 21 11.5z" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
      <Path d="M9.7 9.3a2.3 2.3 0 0 1 4.4.9c0 1.5-2.2 2-2.2 2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M12 15.2h.01" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}
function Chevron() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={P.purpleFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

function IconBox({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <View style={[styles.iconBox, { backgroundColor: TONES[tone].bg }]}>{children}</View>
}

// Fila de un grupo (navegable con flecha, con badge opcional, o con toggle).
function Row({
  tone, icon, title, desc, count, toggle, onValue, onPress, last,
}: {
  tone: Tone
  icon: React.ReactNode
  title: string
  desc?: string
  count?: string
  toggle?: boolean
  onValue?: (v: boolean) => void
  onPress?: () => void
  last?: boolean
}) {
  const isToggle = toggle !== undefined
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      activeOpacity={isToggle ? 1 : 0.7}
      disabled={isToggle}
      onPress={onPress}
    >
      <IconBox tone={tone}>{icon}</IconBox>
      <View style={styles.rowMid}>
        <Text style={styles.rowTitle}>{title}</Text>
        {!!desc && <Text style={styles.rowDesc}>{desc}</Text>}
      </View>
      {isToggle ? (
        <Switch
          value={toggle}
          onValueChange={onValue}
          trackColor={{ false: '#2A2440', true: P.purple }}
          thumbColor={P.white}
          ios_backgroundColor="#2A2440"
        />
      ) : (
        <View style={styles.rowRight}>
          {!!count && <Text style={styles.rowCount}>{count}</Text>}
          <Chevron />
        </View>
      )}
    </TouchableOpacity>
  )
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function CoachAjustes() {
  const insets = useSafeAreaInsets()
  const [user, setUser] = useState<any>(null)
  const [codigo, setCodigo] = useState<string>('')
  const [totalAtletas, setTotalAtletas] = useState(0)
  const [billing, setBilling] = useState<CoachBilling | null>(null)

  useEffect(() => {
    getCoachUser().then(setUser)
    fetchCoachMe()
      .then((me) => { setCodigo(me.codigo_coach); setTotalAtletas(me.total_atletas) })
      .catch(() => {})
    fetchCoachBilling().then(setBilling).catch(() => {})
  }, [])

  const nombre = user?.nombre || 'Coach'
  // Conteo real de atletas: billing manda (incluye slots_usados); fallback a /me.
  const activos = billing?.slots_usados ?? totalAtletas
  const planNombre = billing?.plan || 'Coach Pro'
  const slotsIncluidos = billing?.slots_incluidos ?? 0
  const proVisibles = (billing?.atletas_pro ?? []).slice(0, 5)
  const proRestantes = (billing?.atletas_pro?.length ?? 0) - proVisibles.length

  function proximamente(titulo: string) {
    Alert.alert(titulo, 'Esta sección estará disponible próximamente.')
  }

  // Comparte el código de coach por la hoja nativa para que el atleta se vincule.
  async function invitarAtleta() {
    let code = codigo
    if (!code) {
      try { const me = await fetchCoachMe(); code = me.codigo_coach; setCodigo(code) } catch {}
    }
    if (!code) {
      Alert.alert('Invitar atleta', 'No se pudo obtener tu código. Intenta de nuevo.')
      return
    }
    const message =
      `¡Entrena conmigo en Zyfit! 💪\n\n` +
      `Vincúlate a mi cartera con este código: ${code}\n\n` +
      `En la app: Perfil → Registro con Coach → ingresa el código.`
    try { await Share.share({ message }) } catch {}
  }

  async function handleLogout() {
    await clearCoachSession()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Ajustes</Text>

        {/* Card de perfil del coach */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8} onPress={() => proximamente('Editar perfil')}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{iniciales(nombre)}</Text>
          </View>
          <View style={styles.profileMid}>
            <Text style={styles.profileName} numberOfLines={1}>{nombre}</Text>
            <Text style={styles.profileRole}>Entrenador personal</Text>
            <Text style={styles.profileSub} numberOfLines={1}>{planNombre} · {activos} {activos === 1 ? 'atleta activo' : 'atletas activos'}</Text>
          </View>
          <Chevron />
        </TouchableOpacity>

        {/* Plan y facturación */}
        <SectionLabel>Plan y facturación</SectionLabel>
        <View style={styles.card}>
          <View style={styles.planTop}>
            <Text style={styles.planNombre}>{planNombre}</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{ESTADO_LABEL[billing?.estado ?? 'activa'] || 'Activo'}</Text>
            </View>
          </View>

          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Próxima fecha de corte</Text>
            <Text style={styles.planValue}>{fmtFecha(billing?.fecha_corte ?? null)}</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Slots incluidos</Text>
            <Text style={styles.planValue}>{slotsIncluidos} atletas</Text>
          </View>
          <View style={styles.planRow}>
            <Text style={styles.planLabel}>Slots usados</Text>
            <Text style={styles.planValue}>{activos} / {slotsIncluidos}</Text>
          </View>

          {proVisibles.length > 0 && (
            <>
              <View style={styles.planDivider} />
              <Text style={styles.proLabel}>Atletas con Pro activo</Text>
              <View style={styles.avatarStack}>
                {proVisibles.map((a, i) => (
                  <View key={a.id} style={[styles.stackAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                    <Text style={styles.stackAvatarText}>{iniciales(a.nombre)}</Text>
                  </View>
                ))}
                {proRestantes > 0 && (
                  <View style={[styles.stackAvatar, styles.stackMore, { marginLeft: -10 }]}>
                    <Text style={styles.stackMoreText}>+{proRestantes}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.proNote}>Cada atleta vinculado tiene Zyfit Pro sin costo adicional</Text>
            </>
          )}
        </View>

        {/* Gestión */}
        <SectionLabel>Gestión</SectionLabel>
        <View style={styles.card}>
          <Row
            tone="green"
            icon={<IconInvite c={TONES.green.fg} />}
            title="Invitar atleta"
            desc={codigo ? `Comparte tu código · ${codigo}` : 'Comparte tu código de vinculación'}
            onPress={invitarAtleta}
          />
          <Row
            tone="purple"
            icon={<IconUsers c={TONES.purple.fg} />}
            title="Gestionar atletas"
            desc="Vincular, desvincular, pausar"
            count={`${activos}`}
            onPress={() => router.navigate('/(coach)/atletas' as any)}
            last
          />
        </View>

        {/* Cuenta */}
        <SectionLabel>Cuenta</SectionLabel>
        <View style={styles.card}>
          <Row
            tone="blue"
            icon={<IconLock c={TONES.blue.fg} />}
            title="Cambiar contraseña"
            onPress={() => proximamente('Cambiar contraseña')}
          />
          <Row
            tone="purple"
            icon={<IconSupport c={TONES.purple.fg} />}
            title="Soporte"
            desc="Contactar al equipo Zyfit"
            onPress={() => Linking.openURL(CONTACT_URL)}
            last
          />
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  scroll: { paddingHorizontal: 20 },
  title: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 24, color: P.ink, letterSpacing: -0.5, marginBottom: 18 },

  // Card de perfil
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 8,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: P.badgeBg,
    borderWidth: 1.5,
    borderColor: P.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: P.purpleMid },
  profileMid: { flex: 1, minWidth: 0 },
  profileName: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 18, color: P.ink, letterSpacing: -0.3 },
  profileRole: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: P.purpleMid, marginTop: 2 },
  profileSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleFaint, marginTop: 3 },

  // Sección
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 10,
    color: P.purpleFaint,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 10,
  },

  // Card genérica
  card: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    paddingHorizontal: 16,
  },

  // Plan
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginBottom: 14 },
  planNombre: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 17, color: P.ink },
  planBadge: { backgroundColor: 'rgba(124,92,255,0.18)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 },
  planBadgeText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: P.purpleMid, letterSpacing: 0.3 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7 },
  planLabel: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.purpleSoft },
  planValue: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: P.ink },
  planDivider: { height: StyleSheet.hairlineWidth, backgroundColor: P.divider, marginVertical: 14 },
  proLabel: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: P.ink, marginBottom: 12 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.badgeBg,
    borderWidth: 1.5,
    borderColor: P.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 11, color: P.purpleMid },
  stackMore: { backgroundColor: P.inputBg },
  stackMoreText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 11, color: P.purpleSoft },
  proNote: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: P.purpleFaint, paddingBottom: 16, lineHeight: 15 },

  // Filas de grupo
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: P.divider },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowMid: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15, color: P.ink },
  rowDesc: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleFaint, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowCount: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: P.purpleSoft },

  // Cerrar sesión
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,138,61,0.3)',
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  logoutText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.orange },
})
