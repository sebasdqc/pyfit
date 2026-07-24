import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, accentAlpha, readableTextOn } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation, ScalarKey } from '../../../lib/i18n'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'

// ─── Constants ──────────────────────────────────────────────────────────────
// `k` = valor Spanish canónico (se .toLowerCase()/normaliza antes de mandarlo
// al backend); `labelKey` = clave de traducción solo para mostrar.

const ZONAS = [
  { k: 'Rodilla', labelKey: 'les_zona_rodilla' },
  { k: 'Lumbar', labelKey: 'les_zona_lumbar' },
  { k: 'Hombro', labelKey: 'les_zona_hombro' },
  { k: 'Cuello', labelKey: 'les_zona_cuello' },
  { k: 'Cadera', labelKey: 'les_zona_cadera' },
  { k: 'Tobillo', labelKey: 'les_zona_tobillo' },
  { k: 'Muñeca', labelKey: 'les_zona_muneca' },
  { k: 'Codo', labelKey: 'les_zona_codo' },
] as const
const SEVERIDADES = [
  { k: 'Leve', labelKey: 'les_sev_leve' },
  { k: 'Moderada', labelKey: 'les_sev_moderada' },
  { k: 'Crónica', labelKey: 'les_sev_cronica' },
] as const

// Mapea el valor backend (lowercase, a veces con lateralidad legacy) a su clave
// de traducción para mostrarlo en la lista de lesiones registradas.
const ZONA_LABEL_KEYS: Record<string, ScalarKey> = {
  rodilla: 'les_zona_rodilla', lumbar: 'les_zona_lumbar', hombro: 'les_zona_hombro',
  cuello: 'les_zona_cuello', cadera: 'les_zona_cadera', tobillo: 'les_zona_tobillo',
  muñeca: 'les_zona_muneca', codo: 'les_zona_codo', thoracica: 'les_zona_dorsal',
  // legacy values with laterality
  rodilla_der: 'les_zona_rodilla_der', rodilla_izq: 'les_zona_rodilla_izq',
  hombro_der: 'les_zona_hombro_der', hombro_izq: 'les_zona_hombro_izq',
  tobillo_der: 'les_zona_tobillo_der', tobillo_izq: 'les_zona_tobillo_izq',
  muñeca_der: 'les_zona_muneca_der', muñeca_izq: 'les_zona_muneca_izq',
  codo_der: 'les_zona_codo_der', codo_izq: 'les_zona_codo_izq',
}

const SEV_LABEL_KEYS: Record<string, ScalarKey> = {
  leve: 'les_sev_leve', moderada: 'les_sev_moderada', cronica: 'les_sev_cronica',
}

function zonaLabel(zona: string, t: (k: ScalarKey) => string): string {
  const key = ZONA_LABEL_KEYS[zona.toLowerCase()]
  return key ? t(key) : zona.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function sevLabel(sev: string, t: (k: ScalarKey) => string): string {
  const key = SEV_LABEL_KEYS[sev.toLowerCase()]
  return key ? t(key) : sev.charAt(0).toUpperCase() + sev.slice(1)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Injury { id?: number; zona: string; severidad: string; activa: boolean }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text, styles }: { text: string; styles: ReturnType<typeof makeStyles> }) {
  return <Text style={styles.sectionLabel}>{text}</Text>
}

function Chip({ label, active, onPress, styles }: {
  label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles>
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LesionesScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [injuries, setInjuries] = useState<Injury[]>([])
  const [loading, setLoading] = useState(true)
  const [zona, setZona] = useState('')
  const [severidad, setSeveridad] = useState('')
  const [saving, setSaving] = useState(false)

  function loadInjuries() {
    apiGet('/api/injuries/').then(setInjuries).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadInjuries() }, [])

  async function add() {
    if (!zona || !severidad) return
    setSaving(true)
    try {
      const created = await apiPost('/api/injuries/', {
        zona: zona.toLowerCase(),
        // PRF-4: 'crónica' → 'cronica' para coincidir con SEVERIDAD_CHOICES (la zona
        // conserva la ñ, que sí es canónica). normalize solo afecta a la severidad.
        severidad: severidad.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
        descripcion: '',
      })
      setInjuries(prev => [...prev, created])
      setZona('')
      setSeveridad('')
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('les_save_error'))
    } finally { setSaving(false) }
  }

  async function toggleActiva(inj: Injury) {
    try {
      const updated = await apiPut(`/api/injuries/${inj.id}/`, { activa: !inj.activa })
      setInjuries(prev => prev.map(i => i.id === inj.id ? updated : i))
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('les_save_error'))
    }
  }

  async function remove(inj: Injury) {
    Alert.alert(t('les_delete_title'), `${t('les_delete_q')} ${zonaLabel(inj.zona, t)}?`, [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/injuries/${inj.id}/`)
            setInjuries(prev => prev.filter(i => i.id !== inj.id))
          } catch (e: any) {
            Alert.alert(t('common_error'), e.message ?? t('les_save_error'))
          }
        },
      },
    ])
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('perfil_row_injuries')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>{t('common_loading')}</Text>
          </View>
        ) : (
          <>
            {/* Existing injuries */}
            {injuries.length === 0 ? (
              <Text style={styles.emptyText}>{t('les_empty')}</Text>
            ) : (
              <>
                <SectionLabel text={t('les_registered')} styles={styles} />
                {injuries.map(inj => (
                  <View key={inj.id} style={styles.injuryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.injuryZona}>{zonaLabel(inj.zona, t)}</Text>
                      <Text style={styles.injurySev}>{sevLabel(inj.severidad, t)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleActiva(inj)} activeOpacity={0.7}
                      style={[styles.toggleBtn, inj.activa && styles.toggleBtnActive]}>
                      <Text style={[styles.toggleBtnText, inj.activa && { color: colors.accent }]}>
                        {inj.activa ? t('les_active') : t('les_inactive')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(inj)} activeOpacity={0.7} style={{ marginLeft: 8 }}>
                      <Text style={{ color: colors.red, fontSize: 20, lineHeight: 22 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* Add new */}
            <View style={styles.addSection}>
              <SectionLabel text={t('les_add_section')} styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                {ZONAS.map(({ k, labelKey }) => (
                  <Chip key={k} label={t(labelKey)} active={zona === k}
                    onPress={() => setZona(zona === k ? '' : k)} styles={styles} />
                ))}
              </View>

              {zona !== '' && (
                <>
                  <SectionLabel text={t('les_severity')} styles={styles} />
                  <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                    {SEVERIDADES.map(({ k, labelKey }) => (
                      <Chip key={k} label={t(labelKey)} active={severidad === k}
                        onPress={() => setSeveridad(severidad === k ? '' : k)} styles={styles} />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!zona || !severidad || saving) && { opacity: 0.4 }]}
                    onPress={add} disabled={!zona || !severidad || saving} activeOpacity={0.85}>
                    <Text style={styles.saveBtnText}>{saving ? t('les_saving') : `+ ${t('les_add_injury')}`}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, letterSpacing: -0.5, flex: 1 },
    emptyText: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, marginBottom: 24 },
    sectionLabel: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
    injuryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 12, padding: 14, marginBottom: 8 },
    injuryZona: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14 },
    injurySev: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
    toggleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.glassBg },
    toggleBtnActive: { borderColor: c.accent, backgroundColor: accentAlpha(c.accent, 0.1) },
    toggleBtnText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 0.4 },
    addSection: { marginTop: 28 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: accentAlpha(c.accent, 0.12) },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: readableTextOn(c.accent), fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
