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
  Modal,
  StyleSheet,
  Switch,
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
  createCoach,
  fetchAdminMe,
  fetchAdminUsers,
  setUserCoach,
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

  // 2FA: si el admin tiene TOTP confirmado, /me/ devuelve requires_otp y
  // pedimos el código antes de impersonar.
  const [requiresOtp,  setRequiresOtp]  = useState(false)
  const [otpTarget,    setOtpTarget]    = useState<AdminUserRow | null>(null)
  const [otpCode,      setOtpCode]      = useState('')
  const [otpError,     setOtpError]     = useState<string | null>(null)
  const [otpSubmitting, setOtpSubmitting] = useState(false)

  // Crear coach desde cero (email + password + nombre + activo)
  const [createOpen,   setCreateOpen]   = useState(false)
  const [cName,        setCName]        = useState('')
  const [cEmail,       setCEmail]       = useState('')
  const [cPassword,    setCPassword]    = useState('')
  const [cActivo,      setCActivo]      = useState(true)
  const [creating,     setCreating]     = useState(false)
  const [createError,  setCreateError]  = useState<string | null>(null)

  // Promover/revocar coach sobre un usuario existente
  const [coachTarget,  setCoachTarget]  = useState<AdminUserRow | null>(null)
  const [coachActivo,  setCoachActivo]  = useState(true)
  const [savingCoach,  setSavingCoach]  = useState(false)
  const [coachError,   setCoachError]   = useState<string | null>(null)

  // Debounce para no machacar el backend con cada tecleo
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 250)
    return () => clearTimeout(t)
  }, [query])

  // Saber si este admin necesita 2FA para impersonar
  useEffect(() => {
    fetchAdminMe()
      .then(me => setRequiresOtp(!!me?.requires_otp))
      .catch(() => setRequiresOtp(false))
  }, [])

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

  async function doImpersonate(u: AdminUserRow, otp?: string) {
    setImpersonatingId(u.id)
    try {
      await startImpersonation(u.id, otp)
      setOtpTarget(null)
      setOtpCode('')
      router.replace('/(app)/dashboard')
    } catch (e: any) {
      const msg = e?.message || 'No se pudo impersonar.'
      if (otpTarget) setOtpError(msg)
      else           setError(msg)
    } finally {
      setImpersonatingId(null)
    }
  }

  function handleImpersonate(u: AdminUserRow) {
    if (impersonatingId) return
    if (requiresOtp) {
      // Abrir el modal para capturar el código 2FA antes de impersonar.
      setOtpError(null)
      setOtpCode('')
      setOtpTarget(u)
    } else {
      doImpersonate(u)
    }
  }

  async function submitOtp() {
    if (!otpTarget || otpSubmitting) return
    if (otpCode.trim().length < 6) {
      setOtpError('Ingresa el código de 6 dígitos.')
      return
    }
    setOtpSubmitting(true)
    setOtpError(null)
    await doImpersonate(otpTarget, otpCode.trim())
    setOtpSubmitting(false)
  }

  // ── Coaches ─────────────────────────────────────────────────────────────────

  function openCreateCoach() {
    setCName('')
    setCEmail('')
    setCPassword('')
    setCActivo(true)
    setCreateError(null)
    setCreateOpen(true)
  }

  async function submitCreateCoach() {
    if (creating) return
    if (!cName.trim() || !cEmail.trim() || !cPassword) {
      setCreateError('Completa nombre, email y contraseña.')
      return
    }
    if (cPassword.length < 8) {
      setCreateError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      await createCoach({ email: cEmail, password: cPassword, nombre: cName, activo: cActivo })
      setCreateOpen(false)
      await load(false)
    } catch (e: any) {
      setCreateError(e?.message || 'No se pudo crear el coach.')
    } finally {
      setCreating(false)
    }
  }

  function openCoachModal(u: AdminUserRow) {
    setCoachTarget(u)
    setCoachActivo(u.role === 'coach' ? u.coach_activo : true)
    setCoachError(null)
  }

  async function submitSetCoach(coach: boolean) {
    if (!coachTarget || savingCoach) return
    setSavingCoach(true)
    setCoachError(null)
    try {
      await setUserCoach(coachTarget.id, coach, coach ? coachActivo : false)
      setCoachTarget(null)
      await load(false)
    } catch (e: any) {
      setCoachError(e?.message || 'No se pudo actualizar el coach.')
    } finally {
      setSavingCoach(false)
    }
  }

  // ── Render rows ───────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: AdminUserRow }) => {
    const isImpersonating = impersonatingId === item.id
    const isCoach = item.role === 'coach'
    return (
      <View style={styles.userCard}>
        <View style={styles.userMeta}>
          <View style={styles.userTopRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.nombre || item.email}
            </Text>
            {item.is_superuser && <View style={styles.badgeSuperuser}><Text style={styles.badgeTextSuperuser}>SU</Text></View>}
            {item.is_staff && !item.is_superuser && <View style={styles.badgeStaff}><Text style={styles.badgeTextStaff}>STAFF</Text></View>}
            {isCoach && (
              <View style={item.coach_activo ? styles.badgeCoach : styles.badgeCoachPend}>
                <Text style={item.coach_activo ? styles.badgeTextCoach : styles.badgeTextCoachPend}>
                  {item.coach_activo ? 'COACH' : 'COACH·PEND'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          <Text style={styles.userStats}>
            {item.total_sesiones} sesiones · última: {formatDate(item.ultima_sesion)}
          </Text>
        </View>

        <View style={styles.userActions}>
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
          <TouchableOpacity
            style={[styles.coachBtn, isCoach && styles.coachBtnActive]}
            onPress={() => openCoachModal(item)}
            activeOpacity={0.78}
          >
            <Text style={[styles.coachBtnText, isCoach && styles.coachBtnTextActive]}>
              {isCoach ? 'COACH ⚙' : '＋ COACH'}
            </Text>
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity style={styles.createCoachBtn} onPress={openCreateCoach} activeOpacity={0.8}>
          <Text style={styles.createCoachBtnText}>＋ COACH</Text>
        </TouchableOpacity>
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

      {/* Modal 2FA — código TOTP antes de impersonar */}
      <Modal
        visible={!!otpTarget}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!otpSubmitting) setOtpTarget(null) }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>VERIFICACIÓN 2FA</Text>
            <Text style={styles.modalTitle}>Código para impersonar</Text>
            <Text style={styles.modalSub} numberOfLines={2}>
              Ingresa tu código de 6 dígitos para ver como{' '}
              {otpTarget?.nombre || otpTarget?.email}
            </Text>
            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="000000"
              placeholderTextColor={colors.inkMuted}
              keyboardType="number-pad"
              autoFocus
              maxLength={8}
              textContentType="oneTimeCode"
              editable={!otpSubmitting}
            />
            {otpError && <Text style={styles.otpError}>{otpError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { if (!otpSubmitting) setOtpTarget(null) }}
                disabled={otpSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, otpSubmitting && styles.impersonateBtnLoading]}
                onPress={submitOtp}
                disabled={otpSubmitting}
                activeOpacity={0.78}
              >
                {otpSubmitting
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.modalConfirmText}>VERIFICAR</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal — crear coach desde cero */}
      <Modal
        visible={createOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!creating) setCreateOpen(false) }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>NUEVO COACH</Text>
            <Text style={styles.modalTitle}>Crear cuenta de coach</Text>
            <Text style={styles.modalSub}>Crea una cuenta con acceso al portal de entrenador.</Text>

            <TextInput
              style={styles.formInput}
              value={cName}
              onChangeText={setCName}
              placeholder="Nombre"
              placeholderTextColor={colors.inkMuted}
              editable={!creating}
            />
            <TextInput
              style={styles.formInput}
              value={cEmail}
              onChangeText={setCEmail}
              placeholder="Email"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!creating}
            />
            <TextInput
              style={styles.formInput}
              value={cPassword}
              onChangeText={setCPassword}
              placeholder="Contraseña (mín. 8)"
              placeholderTextColor={colors.inkMuted}
              secureTextEntry
              autoCapitalize="none"
              editable={!creating}
            />

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Acceso activo</Text>
                <Text style={styles.toggleHint}>
                  {cActivo ? 'Podrá entrar al portal de inmediato' : 'Quedará pendiente de activación'}
                </Text>
              </View>
              <Switch
                value={cActivo}
                onValueChange={setCActivo}
                trackColor={{ false: colors.borderBright, true: colors.accent }}
                thumbColor="#fff"
                disabled={creating}
              />
            </View>

            {createError && <Text style={styles.otpError}>{createError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { if (!creating) setCreateOpen(false) }}
                disabled={creating}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, creating && styles.impersonateBtnLoading]}
                onPress={submitCreateCoach}
                disabled={creating}
                activeOpacity={0.78}
              >
                {creating
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.modalConfirmText}>CREAR</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal — promover/gestionar coach sobre un usuario existente */}
      <Modal
        visible={!!coachTarget}
        transparent
        animationType="fade"
        onRequestClose={() => { if (!savingCoach) setCoachTarget(null) }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>
              {coachTarget?.role === 'coach' ? 'GESTIONAR COACH' : 'PROMOVER A COACH'}
            </Text>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {coachTarget?.nombre || coachTarget?.email}
            </Text>
            <Text style={styles.modalSub} numberOfLines={1}>{coachTarget?.email}</Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Acceso activo</Text>
                <Text style={styles.toggleHint}>
                  {coachActivo ? 'Puede entrar al portal' : 'Pendiente de activación'}
                </Text>
              </View>
              <Switch
                value={coachActivo}
                onValueChange={setCoachActivo}
                trackColor={{ false: colors.borderBright, true: colors.accent }}
                thumbColor="#fff"
                disabled={savingCoach}
              />
            </View>

            {coachError && <Text style={styles.otpError}>{coachError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => { if (!savingCoach) setCoachTarget(null) }}
                disabled={savingCoach}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, savingCoach && styles.impersonateBtnLoading]}
                onPress={() => submitSetCoach(true)}
                disabled={savingCoach}
                activeOpacity={0.78}
              >
                {savingCoach
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={styles.modalConfirmText}>
                      {coachTarget?.role === 'coach' ? 'GUARDAR' : 'PROMOVER'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            {coachTarget?.role === 'coach' && (
              <TouchableOpacity
                style={styles.revokeBtn}
                onPress={() => submitSetCoach(false)}
                disabled={savingCoach}
                activeOpacity={0.7}
              >
                <Text style={styles.revokeBtnText}>Revocar acceso · volver a atleta</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
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

    // ── Acciones por fila (impersonar + coach) ──────────────────────────────
    userActions: { gap: 8, alignItems: 'stretch' },
    coachBtn: {
      paddingHorizontal: 14,
      paddingVertical:    8,
      borderRadius:       10,
      minWidth:           90,
      alignItems:         'center',
      borderWidth:        1,
      borderColor:        'rgba(167,139,250,0.5)',
      backgroundColor:    'rgba(167,139,250,0.12)',
    },
    coachBtnActive: {
      backgroundColor: 'rgba(167,139,250,0.22)',
      borderColor:     'rgba(167,139,250,0.7)',
    },
    coachBtnText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize:   10,
      letterSpacing: 1,
      color:      '#a78bfa',
    },
    coachBtnTextActive: { color: '#c4b5fd' },

    // Badge de coach en la fila (morado activo / ámbar pendiente)
    badgeCoach: {
      backgroundColor: 'rgba(167,139,250,0.22)',
      borderWidth: 1, borderColor: 'rgba(167,139,250,0.5)',
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    badgeCoachPend: {
      backgroundColor: 'rgba(251,191,36,0.22)',
      borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)',
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    badgeTextCoach:     { fontFamily: 'JetBrainsMono-Medium', fontSize: 8, letterSpacing: 1.1, color: '#a78bfa' },
    badgeTextCoachPend: { fontFamily: 'JetBrainsMono-Medium', fontSize: 8, letterSpacing: 1.1, color: '#b45309' },

    // Botón "＋ COACH" del header
    createCoachBtn: {
      paddingHorizontal: 12,
      paddingVertical:    8,
      borderRadius:       10,
      borderWidth:        1,
      borderColor:        'rgba(167,139,250,0.5)',
      backgroundColor:    'rgba(167,139,250,0.14)',
    },
    createCoachBtnText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize:   10,
      letterSpacing: 1,
      color:      '#a78bfa',
    },

    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
    emptyTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: c.inkPrimary },
    emptySub:   { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkMuted },

    // ── Modal 2FA ──────────────────────────────────────────────────────────
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.72)',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    modalCard: {
      backgroundColor: c.bg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 22,
      padding: 22,
    },
    modalEyebrow: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: c.accent, letterSpacing: 1.6 },
    modalTitle:   { fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, color: c.inkPrimary, letterSpacing: -0.4, marginTop: 6 },
    modalSub:     { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkSecondary, marginTop: 6, marginBottom: 16 },
    otpInput: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 24,
      letterSpacing: 8,
      textAlign: 'center',
      color: c.inkPrimary,
    },
    otpError: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: '#ff8585', marginTop: 10 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borderBright,
      alignItems: 'center',
    },
    modalCancelText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.2, color: c.inkSecondary },
    modalConfirm: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      backgroundColor: c.accent,
      alignItems: 'center',
    },
    modalConfirmText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1.2, color: '#000' },

    // ── Form crear/gestionar coach ───────────────────────────────────────────
    formInput: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
      color: c.inkPrimary,
      marginTop: 10,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 16,
    },
    toggleLabel: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: c.inkPrimary },
    toggleHint:  { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginTop: 2 },
    revokeBtn:   { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
    revokeBtnText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 0.6, color: '#ff8585' },
  })
}
