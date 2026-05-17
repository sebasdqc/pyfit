import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'notificaciones' | 'configuracion'

// ─── Notificaciones Tab ───────────────────────────────────────────────────────

function NotificacionesTab({
  unreadCount,
  styles,
}: {
  unreadCount: number
  styles: ReturnType<typeof makeStyles>
}) {
  const titulo = unreadCount > 0
    ? `[${unreadCount}] mensajes nuevos`
    : 'Sin mensajes nuevos'

  return (
    <View style={styles.tabContent}>
      <Text style={styles.eyebrow}>MENSAJES</Text>
      <Text style={styles.tabTitle}>{titulo}</Text>
      <Text style={styles.tabSubtitle}>Tu actividad reciente</Text>
    </View>
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

  const [activeTab, setActiveTab] = useState<Tab>('notificaciones')

  // Will be fetched from backend in future iterations
  const unreadCount = 0

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      {/* ── Fixed header area ── */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        {/* Back row */}
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
          <NotificacionesTab unreadCount={unreadCount} styles={styles} />
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
      alignItems:        'center',
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

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 60,
    },

    // Tab content headers
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
  })
}
