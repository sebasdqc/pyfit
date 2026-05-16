import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPost, apiPut, apiDelete } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const ZONAS = ['Rodilla', 'Lumbar', 'Hombro', 'Cuello', 'Cadera', 'Tobillo', 'Muñeca', 'Codo']
const SEVERIDADES = ['Leve', 'Moderada', 'Crónica']

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
        zona: zona.toLowerCase(), severidad: severidad.toLowerCase(), descripcion: '',
      })
      setInjuries(prev => [...prev, created])
      setZona('')
      setSeveridad('')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  async function toggleActiva(inj: Injury) {
    try {
      const updated = await apiPut(`/api/injuries/${inj.id}/`, { activa: !inj.activa })
      setInjuries(prev => prev.map(i => i.id === inj.id ? updated : i))
    } catch {}
  }

  async function remove(inj: Injury) {
    Alert.alert('Eliminar lesión', `¿Eliminar ${inj.zona}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/injuries/${inj.id}/`)
            setInjuries(prev => prev.filter(i => i.id !== inj.id))
          } catch {}
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
      <LinearGradient colors={['rgba(37,99,255,0.15)', 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lesiones y limitaciones</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>Cargando...</Text>
          </View>
        ) : (
          <>
            {/* Existing injuries */}
            {injuries.length === 0 ? (
              <Text style={styles.emptyText}>Sin lesiones registradas.</Text>
            ) : (
              <>
                <SectionLabel text="LESIONES REGISTRADAS" styles={styles} />
                {injuries.map(inj => (
                  <View key={inj.id} style={styles.injuryRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.injuryZona}>{capitalizeFirst(inj.zona)}</Text>
                      <Text style={styles.injurySev}>{capitalizeFirst(inj.severidad)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleActiva(inj)} activeOpacity={0.7}
                      style={[styles.toggleBtn, inj.activa && styles.toggleBtnActive]}>
                      <Text style={[styles.toggleBtnText, inj.activa && { color: colors.accent }]}>
                        {inj.activa ? 'Activa' : 'Inactiva'}
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
              <SectionLabel text="AGREGAR LESIÓN" styles={styles} />
              <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                {ZONAS.map(z => (
                  <Chip key={z} label={z} active={zona === z}
                    onPress={() => setZona(zona === z ? '' : z)} styles={styles} />
                ))}
              </View>

              {zona !== '' && (
                <>
                  <SectionLabel text="SEVERIDAD" styles={styles} />
                  <View style={[styles.chipsRow, { marginBottom: 12 }]}>
                    {SEVERIDADES.map(sv => (
                      <Chip key={sv} label={sv} active={severidad === sv}
                        onPress={() => setSeveridad(severidad === sv ? '' : sv)} styles={styles} />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!zona || !severidad || saving) && { opacity: 0.4 }]}
                    onPress={add} disabled={!zona || !severidad || saving} activeOpacity={0.85}>
                    <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : '+ Agregar lesión'}</Text>
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
    toggleBtnActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.1)' },
    toggleBtnText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 0.4 },
    addSection: { marginTop: 28 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.12)' },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
