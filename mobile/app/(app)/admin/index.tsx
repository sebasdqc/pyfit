/**
 * Panel admin móvil.
 *
 * Vistas:
 *   - Header con botón cerrar.
 *   - Stat strip: total de usuarios + total de sesiones (vienen del listado).
 *   - Buscador + lista paginada de usuarios.
 *   - Cada fila muestra email, nombre, total sesiones, última actividad,
 *     badge staff/superuser, y un botón "IMPERSONAR".
 *   - CTA al fondo: cerrar panel.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTheme } from '../../../lib/theme'
import { Colors } from '../../../lib/colors'
import {
  AdminUserRow,
  AdminUsersResponse,
  fetchAdminUsers,
  startImpersonation,
} from '../../../lib/admin'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'
  if (diffDays < 7)   return `hace ${diffDays}d`
  if (diffDays < 30)  return `hace ${Math.floor(diffDays / 7)}sem`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const insets   = useSafeAreaInsets()
  const { colors } = useTheme()
  const styles   = makeStyles(colors)

  const [query,        setQuery]        = useState('')
  const [debouncedQ,   setDebouncedQ]   = useState('')
  const [data,         setData]         = useState<AdminUsersResponse | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null)

  // Debounce para no machacar el backend con cada tecleo
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 250)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else             setRefreshing(true)
    setError(null)
    try {
      const res = await fetchAdminUsers(debouncedQ, 1)
      setData(res)
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar la lista de usuarios.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedQ])

  useEffect(() => { load(true) }, [load])

  async function handleImpersonate(u: AdminUserRow) {
    if (impersonatingId) return
    setImpersonatingId(u.id)
    try {
      await startImpersonation(u.id)
      router.replace('/(app)/dashboard')
    } catch (e: any) {
      setError(e?.message || 'No se pudo impersonar.')
    } finally {
      setImpersonatingId(null)
    }
  }

  // ── Render rows ───────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: AdminUserRow }) => {
    const isImpersonating = impersonatingId === item.id
    return (
      <View style={styles.userCard}>
        <View style={styles.userMeta}>
          <View style={styles.userTopRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.nombre || item.email}
            </Text>
            {item.is_superuser && <View style={styles.badgeSuperuser}><Text style={styles.badgeTextSuperuser}>SU</Text></View>}
            {item.is_staff && !item.is_superuser && <View style={styles.badgeStaff}><Text style={styles.badgeTextStaff}>STAFF</Text></View>}
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          <Text style={styles.userStats}>
            {item.total_sesiones} sesiones · última: {formatDate(item.ultima_sesion)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.impersonateBtn, isImpersonating && styles.impersonateBtnLoading]}
          onPress={() => handleImpersonate(item)}
          disabled={!!impersonatingId}
          activeOpacity={0.78}
        >
          {isImpersonating
            ? <ActivityIndicator size="small" color="#000" />
            : <Text style={styles.impersonateBtnText}>VER COMO</Text>
          }
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>ZYFIT CONTROL</Text>
          <Text style={styles.title}>Panel de administración</Text>
        </View>
      </View>

      {/* Stat strip */}
      {data && (
        <View style={styles.statStrip}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{data.total}</Text>
            <Text style={styles.statLabel}>USUARIOS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{data.results.reduce((acc, r) => acc + r.total_sesiones, 0)}</Text>
            <Text style={styles.statLabel}>SESIONES (PG. 1)</Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por email o nombre"
          placeholderTextColor={colors.inkMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={data?.results ?? []}
          keyExtractor={u => String(u.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
          refreshing={refreshing}
          onRefresh={() => load(false)}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Sin resultados</Text>
              <Text style={styles.emptySub}>Ajusta el filtro o vuelve atrás.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    header: {
      flexDirection:     'row',
      alignItems:        'center',
      gap:               14,
      paddingHorizontal: 20,
      paddingBottom:     14,
    },
    closeIcon: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 22, color: c.inkPrimary },
    eyebrow:   { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: c.inkMuted, letterSpacing: 1.6 },
    title:     { fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, color: c.inkPrimary, letterSpacing: -0.5, marginTop: 2 },

    statStrip: {
      flexDirection: 'row',
      alignItems:    'center',
      marginHorizontal: 16,
      marginVertical:   12,
      paddingVertical:  14,
      paddingHorizontal: 4,
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    16,
    },
    statBlock: { flex: 1, alignItems: 'center' },
    statValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 26, color: c.accent, letterSpacing: -0.6 },
    statLabel: { fontFamily: 'JetBrainsMono-Medium', fontSize: 9, color: c.inkMuted, letterSpacing: 1.3, marginTop: 4 },
    statDivider: { width: 1, height: 32, backgroundColor: c.borderDefault },

    searchWrap: {
      paddingHorizontal: 16,
      marginBottom:      12,
    },
    searchInput: {
      backgroundColor: c.glassBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
      borderRadius:    14,
      paddingHorizontal: 14,
      paddingVertical:   12,
      fontFamily:        'SpaceGrotesk-Regular',
      fontSize:          14,
      color:             c.inkPrimary,
    },

    errorBox: {
      marginHorizontal: 16,
      marginBottom:     8,
      padding:          12,
      borderRadius:     10,
      backgroundColor:  'rgba(255,68,68,0.1)',
      borderWidth:      1,
      borderColor:      'rgba(255,68,68,0.3)',
    },
    errorText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: '#ff8585' },

    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    userCard: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           12,
      padding:       14,
      borderRadius:  16,
      backgroundColor: c.cardBg,
      borderWidth:     1,
      borderColor:     c.borderDefault,
    },
    userMeta: { flex: 1, gap: 3 },
    userTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userName:  { flex: 1, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: c.inkPrimary },
    userEmail: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted },
    userStats: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.inkMuted, letterSpacing: 0.4 },

    // Badges semánticos (azul=staff, naranja=superuser). El tint hardcoded
    // a 0.15 era invisible en light. Subir opacidad + texto del propio color
    // garantiza contraste en cualquier paleta sin perder identidad.
    badgeStaff: {
      backgroundColor: 'rgba(79,140,255,0.22)',
      borderWidth:     1,
      borderColor:     'rgba(79,140,255,0.5)',
      paddingHorizontal: 6,
      paddingVertical:    2,
      borderRadius:       4,
    },
    badgeSuperuser: {
      backgroundColor: 'rgba(255,170,50,0.22)',
      borderWidth:     1,
      borderColor:     'rgba(255,170,50,0.5)',
      paddingHorizontal: 6,
      paddingVertical:    2,
      borderRadius:       4,
    },
    badgeTextStaff: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize:   8,
      letterSpacing: 1.1,
      color:      '#2563ff',
    },
    badgeTextSuperuser: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize:   8,
      letterSpacing: 1.1,
      color:      '#b45309',  // ámbar oscuro — legible sobre el tint naranja en cualquier bg
    },

    impersonateBtn: {
      backgroundColor: c.accent,
      paddingHorizontal: 14,
      paddingVertical:    10,
      borderRadius:       10,
      minWidth:           90,
      alignItems:         'center',
    },
    impersonateBtnLoading: { opacity: 0.6 },
    impersonateBtnText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize:   10,
      letterSpacing: 1.2,
      color:      '#000',
    },

    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
    emptyTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: c.inkPrimary },
    emptySub:   { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkMuted },
  })
}
