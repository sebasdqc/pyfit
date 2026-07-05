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
import { useTranslation } from '../../lib/i18n'

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function CoachAtletas() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const [atletas, setAtletas] = useState<AtletaGestion[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ids con una operación en curso. Es un Set (no un solo id) para que pausar a un
  // atleta no bloquee silenciosamente una acción sobre OTRO atleta mientras la
  // primera está en vuelo.
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const setBusy = useCallback((id: string, v: boolean) => {
    setBusyIds((prev) => {
      const next = new Set(prev)
      if (v) next.add(id); else next.delete(id)
      return next
    })
  }, [])

  const cargar = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const res = await fetchCarteraGestion()
      setAtletas(res.atletas)
    } catch (e: any) {
      setError(e?.message || t('coach_error_cartera'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => { cargar(true) }, [cargar])

  // Pausa / reactiva el vínculo (optimista; revierte si falla el backend).
  async function toggleEstado(a: AtletaGestion) {
    if (busyIds.has(a.id)) return
    const nuevo = a.estado === 'activo' ? 'pausado' : 'activo'
    setBusy(a.id, true)
    setAtletas((prev) => prev.map((x) => (x.id === a.id ? { ...x, estado: nuevo } : x)))
    try {
      await patchAtletaEstado(a.id, nuevo)
    } catch (e: any) {
      setAtletas((prev) => prev.map((x) => (x.id === a.id ? { ...x, estado: a.estado } : x)))
      Alert.alert(t('coach_error_actualizar_title'), e?.message || t('coach_intenta_de_nuevo'))
    } finally {
      setBusy(a.id, false)
    }
  }

  function confirmarToggleEstado(a: AtletaGestion) {
    const pausando = a.estado === 'activo'
    Alert.alert(
      `${pausando ? t('coach_pausar_a_title') : t('coach_reactivar_a_title')} ${a.nombre}`,
      pausando
        ? t('coach_pausar_msg')
        : t('coach_reactivar_msg'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        { text: pausando ? t('coach_btn_pausar') : t('coach_btn_reactivar'), onPress: () => toggleEstado(a) },
      ],
    )
  }

  function confirmarDesvincular(a: AtletaGestion) {
    Alert.alert(
      `${t('coach_desvincular_a_title')} ${a.nombre}`,
      t('coach_desvincular_atleta_msg'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        { text: t('coach_btn_desvincular'), style: 'destructive', onPress: () => desvincular(a) },
      ],
    )
  }

  async function desvincular(a: AtletaGestion) {
    if (busyIds.has(a.id)) return
    setBusy(a.id, true)
    const prev = atletas
    setAtletas((p) => p.filter((x) => x.id !== a.id))
    try {
      await desvincularAtleta(a.id)
    } catch (e: any) {
      setAtletas(prev)
      Alert.alert(t('coach_error_desvincular_title'), e?.message || t('coach_intenta_de_nuevo'))
    } finally {
      setBusy(a.id, false)
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
        <Text style={styles.title}>{t('coach_tab_atletas')}</Text>
        <Text style={styles.subtitle}>
          {t('coach_atletas_subtitle')}
        </Text>

        {!loading && !error && atletas.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{activos}</Text>
              <Text style={styles.summaryLabel}>{t('coach_atletas_summary_activos')}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: P.amber }]}>{pausados}</Text>
              <Text style={styles.summaryLabel}>{t('coach_atletas_summary_pausados')}</Text>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color={P.purpleMid} /></View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => cargar(true)} activeOpacity={0.8}>
              <Text style={styles.retryText}>{t('common_retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : atletas.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{t('coach_empty_atletas_title')}</Text>
            <Text style={styles.emptySub}>
              {t('coach_atletas_empty_sub')}
            </Text>
          </View>
        ) : (
          atletas.map((a) => {
            const pausado = a.estado === 'pausado'
            const enOp = busyIds.has(a.id)
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
                      {pausado ? `${t('coach_atletas_pausado_ultimo_entreno_prefix')} ${a.ultima}` : `${t('coach_ultima_actividad_prefix')} ${a.ultima}`}
                    </Text>
                  </View>
                  <View style={[styles.estadoBadge, pausado ? styles.estadoPaused : styles.estadoActive]}>
                    <Text style={[styles.estadoText, { color: pausado ? P.amber : P.green }]}>
                      {pausado ? t('coach_estado_pausado') : t('coach_estado_activo')}
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
                      <Text style={styles.actionPauseText}>{pausado ? t('coach_btn_reactivar') : t('coach_btn_pausar')}</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionRemove]}
                    activeOpacity={0.8}
                    disabled={enOp}
                    onPress={() => confirmarDesvincular(a)}
                  >
                    <Text style={styles.actionRemoveText}>{t('coach_btn_desvincular')}</Text>
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
