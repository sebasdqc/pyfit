import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'
import { apiGet, apiPost } from '../../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'notificaciones' | 'configuracion'

interface Notificacion {
  id:        number
  tipo:      string
  texto:     string
  leida:     boolean
  timestamp: string
}

// ─── Type metadata ────────────────────────────────────────────────────────────

const TIPO_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  invitacion:  { icon: '⚡', color: '#4f8cff', bg: 'rgba(79,140,255,0.15)',  label: 'INVITACIÓN' },
  insight:     { icon: '✨', color: '#32c896', bg: 'rgba(50,200,150,0.15)',  label: 'INSIGHT' },
  alerta:      { icon: '🌙', color: '#ffaa32', bg: 'rgba(255,170,50,0.15)',  label: 'ALERTA' },
  logro:       { icon: '🏆', color: '#ffd700', bg: 'rgba(255,215,0,0.15)',   label: 'LOGRO' },
  reencuentro: { icon: '💙', color: '#6ce5ff', bg: 'rgba(108,229,255,0.15)', label: 'REENCUENTRO' },
}
const FALLBACK_META = TIPO_META.insight

// ─── Timestamp helper ─────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  const now  = new Date()
  const date = new Date(iso)
  const diffMs  = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffH   = Math.floor(diffMs / 3_600_000)
  const diffD   = Math.floor(diffMs / 86_400_000)
  if (diffMin < 1)  return 'ahora mismo'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffH < 24)   return `hace ${diffH}h`
  if (diffD === 1)  return 'ayer'
  if (diffD < 7)    return `hace ${diffD} días`
  const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificacionCard({
  notif,
  onPress,
}: {
  notif:    Notificacion
  onPress:  () => void
}) {
  const meta = TIPO_META[notif.tipo] ?? FALLBACK_META

  return (
    <TouchableOpacity
      style={[
        cSt.card,
        notif.leida
          ? cSt.cardRead
          : [cSt.cardUnread, { borderColor: meta.color + '33', backgroundColor: meta.color + '0d' }],
      ]}
      onPress={onPress}
      activeOpacity={notif.leida ? 0.5 : 0.78}
    >
      {/* Left: icon square */}
      <View style={[cSt.iconWrap, { backgroundColor: meta.bg }]}>
        <Text style={cSt.iconEmoji}>{meta.icon}</Text>
      </View>

      {/* Center: content */}
      <View style={cSt.center}>
        <Text style={[cSt.tipo, { color: meta.color }]}>{meta.label}</Text>
        <Text style={cSt.texto}>{notif.texto}</Text>
        <Text style={cSt.ts}>{formatTimestamp(notif.timestamp)}</Text>
      </View>

      {/* Right: unread dot */}
      <View style={cSt.right}>
        {!notif.leida && (
          <View style={[cSt.dot, { backgroundColor: meta.color }]} />
        )}
      </View>
    </TouchableOpacity>
  )
}

const cSt = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           12,
    borderWidth:   1,
    borderRadius:  18,
    padding:       14,
  },
  cardRead: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor:     'rgba(255,255,255,0.07)',
  },
  cardUnread: {
    // borderColor and backgroundColor injected inline
  },
  iconWrap: {
    width:          44,
    height:         44,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  iconEmoji: {
    fontSize: 20,
  },
  center: {
    flex: 1,
    gap:   4,
  },
  tipo: {
    fontFamily:    'JetBrainsMono-Regular',
    fontSize:       9,
    letterSpacing:  1.2,
    textTransform: 'uppercase',
  },
  texto: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize:   14,
    color:      'rgba(255,255,255,0.88)',
    lineHeight: 20,
  },
  ts: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize:   10,
    color:      'rgba(255,255,255,0.3)',
    letterSpacing: 0.3,
  },
  right: {
    width:      14,
    alignItems: 'center',
    paddingTop:  4,
    flexShrink:  0,
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
})

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>Todo al día</Text>
      <Text style={styles.emptySub}>
        Cuando haya novedades sobre tu entrenamiento, aparecerán aquí.
      </Text>
    </View>
  )
}

// ─── Notificaciones Tab ───────────────────────────────────────────────────────

function NotificacionesTab({
  notificaciones,
  loading,
  unreadCount,
  onMarkRead,
  styles,
}: {
  notificaciones: Notificacion[]
  loading:        boolean
  unreadCount:    number
  onMarkRead:     (id: number) => void
  styles:         ReturnType<typeof makeStyles>
}) {
  const titulo = unreadCount > 0 ? `[${unreadCount}] mensajes nuevos` : 'Sin mensajes nuevos'

  return (
    <>
      {/* Header */}
      <View style={styles.tabContent}>
        <Text style={styles.eyebrow}>MENSAJES</Text>
        <Text style={styles.tabTitle}>{titulo}</Text>
        <Text style={styles.tabSubtitle}>Tu actividad reciente</Text>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#4f8cff" />
        </View>
      ) : notificaciones.length === 0 ? (
        <EmptyState styles={styles} />
      ) : (
        <View style={styles.list}>
          {notificaciones.map(n => (
            <NotificacionCard
              key={n.id}
              notif={n}
              onPress={() => { if (!n.leida) onMarkRead(n.id) }}
            />
          ))}
        </View>
      )}
    </>
  )
}

// ─── Configuración Tab ────────────────────────────────────────────────────────

function ConfiguracionTab({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.eyebrow}>PREFERENCIAS</Text>
      <Text style={styles.tabTitle}>Configura tus alertas</Text>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificacionesScreen() {
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [activeTab,       setActiveTab]       = useState<Tab>('notificaciones')
  const [notificaciones,  setNotificaciones]  = useState<Notificacion[]>([])
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    apiGet('/api/notificaciones/')
      .then(setNotificaciones)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = notificaciones.filter(n => !n.leida).length

  const handleMarkRead = useCallback((id: number) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    apiPost(`/api/notificaciones/${id}/leer/`, {}).catch(() => {})
  }, [])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      {/* ── Fixed header area ── */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.6}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Tab row */}
        <View style={styles.tabRow}>
          {(['notificaciones', 'configuracion'] as Tab[]).map(tab => {
            const isActive = activeTab === tab
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab === 'notificaciones' ? 'Notificaciones' : 'Configuración'}
                </Text>
                {tab === 'notificaciones' && unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'notificaciones' ? (
          <NotificacionesTab
            notificaciones={notificaciones}
            loading={loading}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            styles={styles}
          />
        ) : (
          <ConfiguracionTab styles={styles} />
        )}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex:            1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top:      0,
      left:     0,
      right:    0,
      height:   400,
    },

    // Fixed header
    fixedHeader: {
      backgroundColor: 'transparent',
    },
    backRow: {
      paddingHorizontal: 20,
      paddingTop:         6,
      paddingBottom:      4,
    },
    backIcon: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   22,
      color:      c.inkMuted,
      lineHeight: 28,
    },

    // Tab row
    tabRow: {
      flexDirection:     'row',
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
      marginTop:         4,
    },
    tab: {
      flex:              1,
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'center',
      gap:               6,
      paddingVertical:   14,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
      marginBottom:      -1,
    },
    tabActive: {
      borderBottomColor: c.accent,
    },
    tabText: {
      fontFamily:    'SpaceGrotesk-SemiBold',
      fontSize:      14,
      color:         c.inkMuted,
      letterSpacing: -0.1,
    },
    tabTextActive: {
      color: c.inkPrimary,
    },
    badge: {
      backgroundColor: c.accent,
      borderRadius:    8,
      minWidth:        16,
      height:          16,
      alignItems:      'center',
      justifyContent:  'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize:   9,
      color:      '#fff',
      lineHeight: 14,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 60 },

    // Tab content header
    tabContent: {
      paddingHorizontal: 24,
      paddingTop:        32,
      paddingBottom:     8,
    },
    eyebrow: {
      fontFamily:    'JetBrainsMono-Regular',
      fontSize:      10,
      color:         c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom:  10,
    },
    tabTitle: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      28,
      color:         c.inkPrimary,
      letterSpacing: -0.7,
      lineHeight:    34,
      marginBottom:   6,
    },
    tabSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkMuted,
      lineHeight: 20,
    },

    // List
    list: {
      paddingHorizontal: 16,
      paddingTop:        16,
      gap:               10,
    },

    // Loading
    loadingWrap: {
      paddingTop: 60,
      alignItems: 'center',
    },

    // Empty state
    emptyWrap: {
      alignItems:        'center',
      paddingHorizontal: 40,
      paddingTop:        72,
      gap:               12,
    },
    emptyIcon: {
      fontSize:     44,
      marginBottom:  4,
    },
    emptyTitle: {
      fontFamily:    'SpaceGrotesk-Bold',
      fontSize:      20,
      color:         c.inkPrimary,
      letterSpacing: -0.3,
      textAlign:     'center',
    },
    emptySub: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize:   14,
      color:      c.inkMuted,
      textAlign:  'center',
      lineHeight: 22,
    },
  })
}
