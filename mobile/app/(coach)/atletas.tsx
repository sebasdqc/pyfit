import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { P, iniciales } from '../../lib/coachTheme'
import {
  fetchCarteraGestion,
  patchAtletaEstado,
  desvincularAtleta,
  type AtletaGestion,
} from '../../lib/coachApi'

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function CoachAtletas() {
  const insets = useSafeAreaInsets()
  const [atletas, setAtletas] = useState<AtletaGestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)   // id en operación

  const cargar = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetchCarteraGestion()
      setAtletas(res.atletas)
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar tu cartera.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { cargar(true) }, [cargar])

  // Pausa / reactiva el vínculo (optimista; revierte si falla el backend).
  async function toggleEstado(a: AtletaGestion) {
    if (busy) return
    const nuevo = a.estado === 'activo' ? 'pausado' : 'activo'
    setBusy(a.id)
    setAtletas((prev) => prev.map((x) => (x.id === a.id ? { ...x, estado: nuevo } : x)))
    try {
      await patchAtletaEstado(a.id, nuevo)
    } catch (e: any) {
      setAtletas((prev) => prev.map((x) => (x.id === a.id ? { ...x, estado: a.estado } : x)))
      Alert.alert('No se pudo actualizar', e?.message || 'Intenta de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  function confirmarToggleEstado(a: AtletaGestion) {
    const pausando = a.estado === 'activo'
    Alert.alert(
      pausando ? `Pausar a ${a.nombre}` : `Reactivar a ${a.nombre}`,
      pausando
        ? 'El atleta no recibirá nuevas rutinas ni directivas mientras esté pausado. Su historial se conserva.'
        : 'El atleta volverá a recibir rutinas y directivas normalmente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: pausando ? 'Pausar' : 'Reactivar', onPress: () => toggleEstado(a) },
      ],
    )
  }

  function confirmarDesvincular(a: AtletaGestion) {
    Alert.alert(
      `Desvincular a ${a.nombre}`,
      'Saldrá de tu cartera y se borrará su chat. Podrá volver a vincularse con tu código. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desvincular', style: 'destructive', onPress: () => desvincular(a) },
      ],
    )
  }

  async function desvincular(a: AtletaGestion) {
    if (busy) return
    setBusy(a.id)
    const prev = atletas
    setAtletas((p) => p.filter((x) => x.id !== a.id))
    try {
      await desvincularAtleta(a.id)
    } catch (e: any) {
      setAtletas(prev)
      Alert.alert('No se pudo desvincular', e?.message || 'Intenta de nuevo.')
    } finally {
      setBusy(null)
    }
  }

  const activos = atletas.filter((a) => a.estado === 'activo').length
  const pausados = atletas.length - activos

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => cargar(false)} tintColor={P.purpleSoft} />
        }
      >
        <Text style={styles.title}>Atletas</Text>
        <Text style={styles.subtitle}>
          Gestiona tu cartera · pausa, reactiva o desvincula
        </Text>

        {!loading && !error && atletas.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{activos}</Text>
              <Text style={styles.summaryLabel}>Activos</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: P.amber }]}>{pausados}</Text>
              <Text style={styles.summaryLabel}>Pausados</Text>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={P.purpleMid} /></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => cargar(true)} activeOpacity={0.8}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : atletas.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Aún no tienes atletas</Text>
            <Text style={styles.emptySub}>
              Comparte tu código de coach desde Ajustes para que se vinculen a tu cartera.
            </Text>
          </View>
        ) : (
          atletas.map((a) => {
            const pausado = a.estado === 'pausado'
            const enOp = busy === a.id
            return (
              <View key={a.id} style={[styles.card, pausado && styles.cardPaused]}>
                <TouchableOpacity
                  style={styles.cardTop}
                  activeOpacity={pausado ? 1 : 0.7}
                  disabled={pausado}
                  onPress={() => router.push({ pathname: '/(coach)/atleta/[id]', params: { id: a.id, nombre: a.nombre } } as any)}
                >
                  <View style={[styles.avatar, pausado && styles.avatarPaused]}>
                    <Text style={[styles.avatarText, pausado && { color: P.purpleFaint }]}>{iniciales(a.nombre)}</Text>
                  </View>
                  <View style={styles.cardMid}>
                    <Text style={styles.nombre} numberOfLines={1}>{a.nombre}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {pausado ? `Pausado · vinculado ${a.ultima}` : `Última actividad ${a.ultima}`}
                    </Text>
                  </View>
                  <View style={[styles.estadoBadge, pausado ? styles.estadoPaused : styles.estadoActive]}>
                    <Text style={[styles.estadoText, { color: pausado ? P.amber : P.green }]}>
                      {pausado ? 'Pausado' : 'Activo'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionPause]}
                    activeOpacity={0.8}
                    disabled={enOp}
                    onPress={() => confirmarToggleEstado(a)}
                  >
                    {enOp ? (
                      <ActivityIndicator size="small" color={P.purpleMid} />
                    ) : (
                      <Text style={styles.actionPauseText}>{pausado ? 'Reactivar' : 'Pausar'}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionRemove]}
                    activeOpacity={0.8}
                    disabled={enOp}
                    onPress={() => confirmarDesvincular(a)}
                  >
                    <Text style={styles.actionRemoveText}>Desvincular</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  scroll: { paddingHorizontal: 20 },
  title: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 24, color: P.ink, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.purpleFaint, marginTop: 4, marginBottom: 20 },

  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: {
    flex: 1, backgroundColor: P.cardBg, borderWidth: 1, borderColor: P.border,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  summaryValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 26, color: P.green, letterSpacing: -0.6 },
  summaryLabel: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleSoft, marginTop: 2 },

  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  errorBox: {
    marginTop: 24, padding: 16, borderRadius: 14,
    backgroundColor: 'rgba(255,77,77,0.10)', borderWidth: 1, borderColor: 'rgba(255,77,77,0.3)',
    alignItems: 'center', gap: 8,
  },
  errorText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.red, textAlign: 'center' },
  retryText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12, color: P.purpleMid, letterSpacing: 0.4 },

  emptyWrap: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 12, gap: 10 },
  emptyTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 18, color: P.ink },
  emptySub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.purpleFaint, textAlign: 'center', lineHeight: 20 },

  // Card de atleta
  card: {
    backgroundColor: P.cardBgAlt, borderWidth: 1, borderColor: P.border,
    borderRadius: 16, padding: 14, marginBottom: 12,
  },
  cardPaused: { backgroundColor: P.cardBg, borderColor: P.divider },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: P.greenSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarPaused: { backgroundColor: 'rgba(150,128,255,0.12)' },
  avatarText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.green },
  cardMid: { flex: 1, minWidth: 0 },
  nombre: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.ink },
  meta: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleFaint, marginTop: 2 },
  estadoBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  estadoActive: { backgroundColor: P.greenSoft },
  estadoPaused: { backgroundColor: P.amberSoft },
  estadoText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, letterSpacing: 0.3 },

  // Acciones
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, borderRadius: 11, paddingVertical: 11, alignItems: 'center', justifyContent: 'center',
    minHeight: 42, borderWidth: 1,
  },
  actionPause: { backgroundColor: 'rgba(150,128,255,0.12)', borderColor: P.border },
  actionPauseText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13, color: P.purpleMid },
  actionRemove: { backgroundColor: 'transparent', borderColor: 'rgba(255,138,61,0.3)' },
  actionRemoveText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13, color: P.orange },
})
