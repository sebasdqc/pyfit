import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS, FASES, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiPost } from '../../../lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ejercicio {
  nombre: string
  series: number
  repeticiones: string
  descanso_segundos: number
  rpe_sugerido: number
  notas?: string
}

interface Fase {
  nombre: string
  duracion_minutos: number
  ejercicios: Ejercicio[]
}

interface Sesion {
  titulo: string
  objetivo_sesion: string
  rpe_target: number
  duracion_total: number
  fases: Fase[]
  nota_del_entrenador: string
}

interface SesionResponse {
  sesion_id: string | number
  sesion: Sesion
}

// ─── Loading messages ────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'Analizando tu estado...',
  'Calculando fatiga...',
  'Diseñando tu sesión...',
  'Aplicando principios científicos...',
  'Preparando tu entrenamiento...',
]

// ─── Loading Screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [msgIndex, setMsgIndex] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setMsgIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start()
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [fadeAnim])

  return (
    <View style={styles.loadingContainer}>
      {/* Logo */}
      <View style={styles.logoWrapper}>
        <Text style={styles.logoText}>
          Py<Text style={{ color: colors.accent }}>Fit</Text>
        </Text>
        <Text style={styles.logoTagline}>AI Training</Text>
      </View>

      {/* Spinner */}
      <View style={styles.spinnerWrapper}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>

      {/* Animated message */}
      <Animated.Text style={[styles.loadingMessage, { opacity: fadeAnim }]}>
        {LOADING_MESSAGES[msgIndex]}
      </Animated.Text>

      <Text style={styles.loadingSubtext}>
        Personalizando en base a tu perfil y estado de hoy
      </Text>
    </View>
  )
}

// ─── Stats Chip ───────────────────────────────────────────────────────────────

function StatChip({ label }: { label: string }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.statChip}>
      <Text style={styles.statChipText}>{label}</Text>
    </View>
  )
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function EjercicioRow({
  ejercicio,
  faseColor,
  onRegenerar,
}: {
  ejercicio: Ejercicio
  faseColor: string
  onRegenerar: (nombre: string) => void
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const rir = ejercicio.rpe_sugerido ? (10 - ejercicio.rpe_sugerido).toFixed(0) : '—'

  return (
    <View style={styles.ejercicioRow}>
      <View style={styles.ejercicioMain}>
        <View style={styles.ejercicioHeader}>
          <Text style={styles.ejercicioNombre} numberOfLines={2}>
            {ejercicio.nombre}
          </Text>
          <TouchableOpacity
            style={styles.regenerarBtn}
            onPress={() => onRegenerar(ejercicio.nombre)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.regenerarIcon, { color: faseColor }]}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Badges */}
        <View style={styles.ejercicioBadges}>
          <View style={[styles.badge, { borderColor: faseColor + '60' }]}>
            <Text style={[styles.badgeText, { color: faseColor }]}>
              {ejercicio.series} series
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{ejercicio.repeticiones} reps</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {ejercicio.descanso_segundos}s descanso
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>RPE {ejercicio.rpe_sugerido}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>RIR {rir}</Text>
          </View>
        </View>

        {ejercicio.notas ? (
          <Text style={styles.ejercicioNotas}>{ejercicio.notas}</Text>
        ) : null}
      </View>
    </View>
  )
}

// ─── Phase Card ───────────────────────────────────────────────────────────────

function FaseCard({
  fase,
  onRegenerar,
}: {
  fase: Fase
  onRegenerar: (nombre: string, faseNombre: string) => void
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [collapsed, setCollapsed] = useState(false)
  const faseKey = fase.nombre as keyof typeof FASES
  const faseStyle = FASES[faseKey] ?? { color: colors.accent, bg: 'rgba(79,140,255,0.1)', label: fase.nombre.toUpperCase() }

  return (
    <View style={[styles.faseCard, { borderColor: faseStyle.color + '30' }]}>
      {/* Phase header */}
      <TouchableOpacity
        style={[styles.faseHeader, { backgroundColor: faseStyle.bg }]}
        onPress={() => setCollapsed(prev => !prev)}
        activeOpacity={0.7}
      >
        <View style={styles.faseHeaderLeft}>
          <Text style={[styles.faseLabel, { color: faseStyle.color }]}>
            {faseStyle.label}
          </Text>
          <Text style={styles.faseDuracion}>{fase.duracion_minutos} min</Text>
        </View>
        <Text style={[styles.chevron, { color: faseStyle.color }]}>
          {collapsed ? '▶' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Exercises */}
      {!collapsed && (
        <View style={styles.fasEjercicios}>
          {fase.ejercicios.map((ej, idx) => (
            <React.Fragment key={idx}>
              <EjercicioRow
                ejercicio={ej}
                faseColor={faseStyle.color}
                onRegenerar={nombre => onRegenerar(nombre, fase.nombre)}
              />
              {idx < fase.ejercicios.length - 1 && (
                <View style={styles.ejercicioSeparator} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GenerateScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sesionId, setSesionId] = useState<string | null>(null)
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: SesionResponse = await apiPost('/api/sessions/generate/', {})
      setSesionId(String(data.sesion_id))
      setSesion(data.sesion)
    } catch (err: any) {
      setError(err.message || 'Error generando la sesión')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    generate()
  }, [generate])

  const handleRegenerar = useCallback(async (nombre: string, faseNombre: string) => {
    if (regenerating) return
    setRegenerating(nombre)
    try {
      const data = await apiPost('/api/ejercicios/regenerar/', {
        nombre,
        fase: faseNombre,
        session_id: sesionId,
      })
      // Replace the exercise in state
      setSesion(prev => {
        if (!prev) return prev
        return {
          ...prev,
          fases: prev.fases.map(fase =>
            fase.nombre === faseNombre
              ? {
                  ...fase,
                  ejercicios: fase.ejercicios.map(ej =>
                    ej.nombre === nombre ? { ...ej, ...data.ejercicio } : ej
                  ),
                }
              : fase
          ),
        }
      })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo regenerar el ejercicio')
    } finally {
      setRegenerating(null)
    }
  }, [regenerating, sesionId])

  const handleEjecutar = () => {
    if (!sesionId) return
    router.push(`/(app)/ejecutar/${sesionId}`)
  }

  const handleMarcarCompletada = () => {
    if (!sesionId) return
    router.push(`/(app)/feedback/${sesionId}`)
  }

  const rir = sesion ? (10 - sesion.rpe_target).toFixed(0) : '—'

  return (
    <View style={styles.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={['rgba(37,99,255,0.25)', 'transparent']}
        style={styles.gradient}
      />

      {loading ? (
        <LoadingScreen />
      ) : error ? (
        // ── Error state ──
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Algo salió mal</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={generate}>
            <Text style={styles.retryBtnText}>Intentar de nuevo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(app)/dashboard')}>
            <Text style={styles.backBtnText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      ) : sesion ? (
        // ── Session result ──
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>{sesion.titulo}</Text>
            <Text style={styles.sessionObjetivo}>{sesion.objetivo_sesion}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatChip label={`⏱ ${sesion.duracion_total} min`} />
            <StatChip label={`RPE ${sesion.rpe_target}/10`} />
            <StatChip label={`RIR ${rir}`} />
          </View>

          {/* Trainer note */}
          {sesion.nota_del_entrenador ? (
            <View style={styles.trainerCard}>
              <View style={styles.trainerCardHeader}>
                <Text style={styles.trainerIcon}>🧠</Text>
                <Text style={styles.trainerLabel}>NOTA DEL ENTRENADOR</Text>
              </View>
              <Text style={styles.trainerNote}>{sesion.nota_del_entrenador}</Text>
            </View>
          ) : null}

          {/* Phases */}
          <View style={styles.fasesSection}>
            <Text style={styles.sectionLabel}>PLAN DE ENTRENAMIENTO</Text>
            {sesion.fases.map((fase, idx) => (
              <FaseCard
                key={idx}
                fase={fase}
                onRegenerar={handleRegenerar}
              />
            ))}
          </View>

          {/* Regenerating overlay text */}
          {regenerating ? (
            <View style={styles.regeneratingBanner}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.regeneratingText}>
                Regenerando {regenerating}...
              </Text>
            </View>
          ) : null}

          {/* CTA buttons */}
          <View style={styles.ctaSection}>
            <TouchableOpacity style={styles.ctaPrimary} onPress={handleEjecutar}>
              <Text style={styles.ctaPrimaryText}>⚡ Ejecutar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaSecondary} onPress={handleMarcarCompletada}>
              <Text style={styles.ctaSecondaryText}>✓ Marcar completada</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : null}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 400,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    logoWrapper: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logoText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 42,
      color: c.inkPrimary,
      letterSpacing: -1,
    },
    logoTagline: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkMuted,
      letterSpacing: 3,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    spinnerWrapper: {
      marginBottom: 32,
    },
    loadingMessage: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 17,
      color: c.inkPrimary,
      textAlign: 'center',
      marginBottom: 12,
    },
    loadingSubtext: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Error
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    errorIcon: {
      fontSize: 48,
      marginBottom: 16,
    },
    errorTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22,
      color: c.inkPrimary,
      marginBottom: 8,
    },
    errorMessage: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 22,
    },
    retryBtn: {
      backgroundColor: c.accent,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 14,
      marginBottom: 12,
      width: '100%',
      alignItems: 'center',
    },
    retryBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.white,
    },
    backBtn: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    backBtnText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkMuted,
    },

    // Scroll
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 60,
      paddingBottom: 48,
      paddingHorizontal: 20,
    },

    // Session header
    sessionHeader: {
      marginBottom: 20,
    },
    sessionTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 24,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      lineHeight: 30,
      marginBottom: 8,
    },
    sessionObjetivo: {
      fontFamily: 'InstrumentSerif-Italic',
      fontSize: 16,
      color: c.inkSecondary,
      lineHeight: 24,
    },

    // Stats
    statsRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
      flexWrap: 'wrap',
    },
    statChip: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    statChipText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 12,
      color: c.inkSecondary,
      letterSpacing: 0.5,
    },

    // Trainer card
    trainerCard: {
      backgroundColor: 'rgba(79,140,255,0.07)',
      borderWidth: 1,
      borderColor: 'rgba(79,140,255,0.2)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 24,
    },
    trainerCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    trainerIcon: {
      fontSize: 16,
    },
    trainerLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.accentLight,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    trainerNote: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      lineHeight: 22,
    },

    // Phases section
    fasesSection: {
      gap: 12,
      marginBottom: 24,
    },
    sectionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    faseCard: {
      borderWidth: 1,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: c.cardBg,
    },
    faseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    faseHeaderLeft: {
      gap: 2,
    },
    faseLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontWeight: '500',
    },
    faseDuracion: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
    },
    chevron: {
      fontSize: 10,
      fontFamily: 'SpaceGrotesk-Regular',
    },
    fasEjercicios: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    ejercicioSeparator: {
      height: 1,
      backgroundColor: c.borderDefault,
      marginVertical: 12,
    },

    // Exercise
    ejercicioRow: {
      paddingTop: 12,
    },
    ejercicioMain: {
      flex: 1,
    },
    ejercicioHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 10,
      gap: 8,
    },
    ejercicioNombre: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.inkPrimary,
      flex: 1,
      lineHeight: 22,
    },
    regenerarBtn: {
      padding: 4,
    },
    regenerarIcon: {
      fontSize: 18,
      fontFamily: 'SpaceGrotesk-Bold',
    },
    ejercicioBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 6,
    },
    badge: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    badgeText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkSecondary,
    },
    ejercicioNotas: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
      lineHeight: 18,
      marginTop: 4,
    },

    // Regenerating
    regeneratingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 10,
      marginBottom: 8,
    },
    regeneratingText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.accentLight,
    },

    // CTA
    ctaSection: {
      gap: 12,
    },
    ctaPrimary: {
      backgroundColor: c.white,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    ctaPrimaryText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: c.bg,
      letterSpacing: -0.2,
    },
    ctaSecondary: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    ctaSecondaryText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.inkSecondary,
    },
  })
}
