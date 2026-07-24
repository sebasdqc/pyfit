import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors, accentAlpha, readableTextOn } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'
import { apiGet, apiPost, apiDelete } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

// Ids que se envían al backend (estables); su label se traduce por separado.
const IMPLEMENTOS = ['Barras', 'Mancuernas', 'Máquinas', 'TRX', 'Kettlebells', 'Bandas elásticas', 'Cajón pliométrico', 'Anillas']
const TIPOS_LUGAR = ['Gimnasio', 'Casa', 'Exterior']

const IMP_KEY: Record<string, string> = {
  'Barras': 'ubi_imp_bars',
  'Mancuernas': 'ubi_imp_dumbbells',
  'Máquinas': 'ubi_imp_machines',
  'TRX': 'ubi_imp_trx',
  'Kettlebells': 'ubi_imp_kettlebells',
  'Bandas elásticas': 'ubi_imp_bands',
  'Cajón pliométrico': 'ubi_imp_plyobox',
  'Anillas': 'ubi_imp_rings',
}
const TIPO_KEY: Record<string, string> = {
  gimnasio: 'ubi_type_gym',
  casa: 'ubi_type_home',
  exterior: 'ubi_type_outdoor',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location { id?: number; nombre: string; tipo: string; implementos: string[] }

const EMPTY_LOC: Location = { nombre: '', tipo: '', implementos: [] }

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

export default function UbicacionesScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const tipoLabel = (id: string) =>
    id && TIPO_KEY[id.toLowerCase()] ? t(TIPO_KEY[id.toLowerCase()] as any) : capitalizeFirst(id)
  const impLabel = (imp: string) => (IMP_KEY[imp] ? t(IMP_KEY[imp] as any) : imp)

  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newLoc, setNewLoc] = useState<Location>(EMPTY_LOC)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  function loadLocations() {
    apiGet('/api/locations/').then(setLocations).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadLocations() }, [])

  function toggleImplemento(imp: string) {
    setNewLoc(prev => ({
      ...prev,
      implementos: prev.implementos.includes(imp)
        ? prev.implementos.filter(i => i !== imp)
        : [...prev.implementos, imp],
    }))
  }

  async function saveNew() {
    if (!newLoc.nombre.trim() || !newLoc.tipo) {
      Alert.alert(t('ubi_alert_required_title'), t('ubi_alert_required_msg'))
      return
    }
    setSaving(true)
    try {
      await apiPost('/api/locations/', {
        nombre: newLoc.nombre.trim(),
        tipo: newLoc.tipo.toLowerCase(),
        implementos: newLoc.implementos,
      })
      setNewLoc(EMPTY_LOC)
      setAdding(false)
      loadLocations()
    } catch (e: any) {
      Alert.alert(t('common_error'), e.message ?? t('ubi_save_error'))
    } finally { setSaving(false) }
  }

  async function deleteLocation(id: number, nombre: string) {
    Alert.alert(t('ubi_delete_title'), t('ubi_delete_msg').replace('{name}', nombre), [
      { text: t('common_cancel'), style: 'cancel' },
      {
        text: t('common_delete'), style: 'destructive',
        onPress: async () => {
          setDeletingId(id)
          try {
            await apiDelete(`/api/locations/${id}/`)
            loadLocations()
          } catch (e: any) {
            Alert.alert(t('common_error'), e.message ?? t('ubi_delete_error'))
          } finally {
            setDeletingId(null)
          }
        },
      },
    ])
  }

  function capitalizeFirst(s: string) {
    if (!s) return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
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
        <Text style={styles.headerTitle}>{t('perfil_row_locations')}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {loading ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>{t('common_loading')}</Text>
            </View>
          ) : (
            <>
              {locations.length === 0 && !adding && (
                <Text style={styles.emptyText}>{t('ubi_empty')}</Text>
              )}

              {locations.map(loc => (
                <View key={loc.id} style={styles.locCard}>
                  <View style={styles.locCardHeader}>
                    <View>
                      <Text style={styles.locNombre}>{loc.nombre}</Text>
                      <Text style={styles.locTipo}>{tipoLabel(loc.tipo)}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteLocation(loc.id!, loc.nombre)}
                      disabled={deletingId === loc.id}
                      activeOpacity={0.7}
                    >
                      {deletingId === loc.id
                        ? <ActivityIndicator color={colors.red} size="small" />
                        : <Text style={styles.locDelete}>{t('common_delete')}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  {loc.implementos?.length > 0 && (
                    <View style={styles.chipsRow}>
                      {loc.implementos.map(imp => (
                        <View key={imp} style={styles.impTag}>
                          <Text style={styles.impTagText}>{impLabel(imp)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              {adding ? (
                <View style={styles.addForm}>
                  <SectionLabel text={t('ubi_label_name')} styles={styles} />
                  <TextInput
                    value={newLoc.nombre}
                    onChangeText={v => setNewLoc(prev => ({ ...prev, nombre: v }))}
                    placeholder={t('ubi_name_placeholder')}
                    placeholderTextColor={colors.inkMuted}
                    style={[styles.input, { marginBottom: 16 }]}
                    autoCapitalize="words" autoCorrect={false}
                  />

                  <SectionLabel text={t('ubi_label_type')} styles={styles} />
                  <View style={[styles.chipsRow, { marginBottom: 16 }]}>
                    {TIPOS_LUGAR.map(tipo => (
                      <Chip key={tipo} label={tipoLabel(tipo)} active={newLoc.tipo === tipo}
                        onPress={() => setNewLoc(prev => ({ ...prev, tipo }))} styles={styles} />
                    ))}
                  </View>

                  <SectionLabel text={t('ubi_label_equipment')} styles={styles} />
                  <View style={[styles.chipsRow, { marginBottom: 20 }]}>
                    {IMPLEMENTOS.map(imp => (
                      <Chip key={imp} label={impLabel(imp)} active={newLoc.implementos.includes(imp)}
                        onPress={() => toggleImplemento(imp)} styles={styles} />
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      style={[styles.saveBtn, { flex: 1, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderDefault }]}
                      onPress={() => { setAdding(false); setNewLoc(EMPTY_LOC) }} activeOpacity={0.7}>
                      <Text style={[styles.saveBtnText, { color: colors.inkSecondary }]}>{t('common_cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, { flex: 1 }, saving && { opacity: 0.6 }]}
                      onPress={saveNew} disabled={saving} activeOpacity={0.85}>
                      {saving
                        ? <ActivityIndicator color={readableTextOn(colors.accent)} size="small" />
                        : <Text style={styles.saveBtnText}>{t('common_save')}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.7}>
                  <Text style={styles.addBtnText}>+ {t('ubi_add')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    emptyText: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, textAlign: 'center', marginVertical: 16 },
    locCard: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 16, padding: 14, marginBottom: 12 },
    locCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    locNombre: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
    locTipo: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
    locDelete: { color: c.red, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: accentAlpha(c.accent, 0.12) },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    impTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault },
    impTagText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 11 },
    addBtn: { borderWidth: 1, borderColor: c.accent, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: accentAlpha(c.accent, 0.05) },
    addBtnText: { color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 },
    addForm: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 16, padding: 14, marginTop: 8 },
    sectionLabel: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
    input: { backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 0 },
    saveBtnText: { color: readableTextOn(c.accent), fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
