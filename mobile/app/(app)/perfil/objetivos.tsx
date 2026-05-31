import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPatch, apiPost } from '../../../lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJETIVOS_LIST = [
  'Perder grasa', 'Ganar músculo', 'Rendimiento deportivo', 'Resistencia', 'Salud general',
]

const OBJETIVO_TO_GOAL: Record<string, string> = {
  'Perder grasa':          'perdida_grasa',
  'Ganar músculo':         'hipertrofia',
  'Rendimiento deportivo': 'potencia',
  'Resistencia':           'salud',
  'Salud general':         'salud',
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ObjetivosScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [fullProfile, setFullProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [objetivos, setObjetivos] = useState<string[]>([])

  useEffect(() => {
    apiGet('/api/profile/').then(data => {
      setFullProfile(data)
      setObjetivos(Array.isArray(data.objetivos_multiples) ? data.objetivos_multiples : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function toggleObjetivo(obj: string) {
    setObjetivos(prev => prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj])
  }

  async function save() {
    if (!fullProfile) return
    if (objetivos.length === 0) {
      Alert.alert('Selecciona al menos un objetivo')
      return
    }
    setSaving(true)
    try {
      // PRF: PATCH parcial — solo campos de esta pantalla (evita lost update).
      await apiPatch('/api/profile/', {
        objetivo: objetivos[0],
        objetivos_multiples: objetivos,
      })
      const goal = OBJETIVO_TO_GOAL[objetivos[0]]
      if (goal) {
        await apiPost('/api/training-cycle/', { goal })
      }
      router.back()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
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
        <Text style={styles.headerTitle}>Mis objetivos</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 }}>Cargando...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.hint}>
              Selecciona uno o varios objetivos. El primero que elijas será el principal.
            </Text>

            <View style={styles.objectivesGrid}>
              {OBJETIVOS_LIST.map(obj => {
                const active = objetivos.includes(obj)
                const rank = active ? objetivos.indexOf(obj) + 1 : null
                return (
                  <TouchableOpacity
                    key={obj}
                    style={[styles.objCard, active && styles.objCardActive]}
                    onPress={() => toggleObjetivo(obj)}
                    activeOpacity={0.7}
                  >
                    {rank === 1 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>PRINCIPAL</Text>
                      </View>
                    )}
                    <Text style={[styles.objText, active && styles.objTextActive]}>{obj}</Text>
                    {active && (
                      <View style={styles.checkCircle}>
                        <Text style={{ color: colors.accent, fontSize: 12, fontFamily: 'SpaceGrotesk-Bold' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, (saving || objetivos.length === 0) && { opacity: 0.5 }]}
              onPress={save} disabled={saving || objetivos.length === 0} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
            </TouchableOpacity>
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
    hint: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, lineHeight: 20, marginBottom: 20 },
    objectivesGrid: { gap: 10, marginBottom: 28 },
    objCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 16, padding: 18,
    },
    objCardActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.08)' },
    primaryBadge: {
      paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
      backgroundColor: 'rgba(79,140,255,0.15)',
    },
    primaryBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, color: c.accent, letterSpacing: 1, textTransform: 'uppercase' },
    objText: { flex: 1, color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    objTextActive: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold' },
    checkCircle: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: 'rgba(79,140,255,0.15)',
      borderWidth: 1, borderColor: c.accent,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
  })
}
