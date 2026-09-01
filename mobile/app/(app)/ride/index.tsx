import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert, BackHandler } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useKeepAwake } from 'expo-keep-awake'

import { useTheme } from '../../../lib/theme'
import { Colors, readableTextOn } from '../../../lib/colors'
import { formatDuration } from '../../../lib/runMetrics'
import { createRideSession, completeRideSession } from '../../../lib/ridesApi'
import { getRideSessionToday, completePlannedRide } from '../../../lib/cyclingApi'
import { expandirPasos, progresoPaso, pasoCompletado, type Paso } from '../../../lib/runSteps'
import { TIPO_COLOR_KEY } from '../../../lib/runTimeline'
import { RideTimelineSheet } from '../../../components/RideTimelineSheet'

// Sin GPS en v1 (decisión de producto 2026-08-22): sin RidePoint todavía en el
// backend, esta pantalla es SOLO timer + guía por pasos — nada de mapa, ni
// distancia, ni ritmo en vivo. La guía (runSteps.ts) funciona igual que en
// running porque los pasos de ciclismo siempre traen metaDuracionS, nunca
// metaDistanciaM (ver ai_cycling.training_science_cycling: todo en tiempo).

type RideStatus = 'idle' | 'active' | 'paused' | 'completed'

function mmss(s: number): string {
  const x = Math.max(0, Math.round(s))
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`
}

// TIPO_COLOR_KEY (lib/runTimeline.ts) es la fuente única, compartida con
// run/index.tsx y con RideTimelineSheet — un bloque nunca debe tener un
// color distinto entre la guía compacta y la rutina completa.
function pasoColor(paso: Paso, colors: Colors): string {
  return colors[TIPO_COLOR_KEY[paso.tipo]]
}

function restanteTexto(paso: Paso, tiempoEnPasoS: number): string {
  if (!paso.metaDuracionS) return ''
  const falta = Math.max(0, paso.metaDuracionS - tiempoEnPasoS)
  return `Faltan ${mmss(falta)} de ${mmss(paso.metaDuracionS)}`
}

export default function RideScreen() {
  useKeepAwake()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const { planned } = useLocalSearchParams<{ planned?: string }>()

  const [status, setStatus] = useState<RideStatus>('idle')
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Guía paso a paso de la sesión inteligente (presente solo si venimos con
  // ?planned=<id>). Mismo patrón que run/index.tsx (Fase 4), sin distancia.
  const [pasos, setPasos] = useState<Paso[]>([])
  const [pasoIdx, setPasoIdx] = useState(0)
  const [pasoOffsetS, setPasoOffsetS] = useState(0)
  const [zonaSesion, setZonaSesion] = useState('')
  // Metadata de la sesión inteligente para el header de la rutina completa —
  // ciclismo se prescribe en tiempo, sin distancia (a diferencia de running).
  const [sesionMeta, setSesionMeta] = useState<{ titulo: string; duracionMin: number | null }>(
    { titulo: '', duracionMin: null })
  const [timelineVisible, setTimelineVisible] = useState(false)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!planned) return
    getRideSessionToday()
      .then((d: any) => {
        const expandidos = expandirPasos(d?.estructura_fases?.segmentos)
        if (!expandidos.length) return
        setPasos(expandidos)
        setZonaSesion(d?.respuesta_ia?.zona_principal || d?.zona_principal || '')
        setSesionMeta({
          titulo: d?.respuesta_ia?.titulo || '',
          duracionMin: d?.respuesta_ia?.duracion_total_min ?? null,
        })
      })
      .catch(() => {})
  }, [planned])

  // Timer — corre solo mientras status === 'active'.
  useEffect(() => {
    if (status === 'active') {
      intervalRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
    }
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [status])

  const inProgress = status === 'active' || status === 'paused'
  const pasoActual: Paso | null = pasos[pasoIdx] ?? null
  const pasoSiguiente: Paso | null = pasos[pasoIdx + 1] ?? null
  const sesionGuiadaCompleta = pasos.length > 0 && pasoIdx >= pasos.length
  const tiempoEnPaso = Math.max(0, elapsedSeconds - pasoOffsetS)
  const progresoActual = pasoActual ? progresoPaso(pasoActual, 0, tiempoEnPaso) : 0

  const avanzarPaso = useCallback(() => {
    setPasoOffsetS(elapsedSeconds)
    setPasoIdx(i => i + 1)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
  }, [elapsedSeconds])

  // Avance automático al cumplirse el tiempo del paso (nunca por distancia —
  // no hay GPS). Solo con la salida activa: en pausa el reloj no corre.
  useEffect(() => {
    if (status !== 'active' || !pasoActual) return
    if (pasoCompletado(pasoActual, 0, tiempoEnPaso)) avanzarPaso()
  }, [status, pasoActual, tiempoEnPaso, avanzarPaso])

  async function handleStart() {
    setError(null)
    try {
      const session = await createRideSession(new Date().toISOString())
      setSessionId(session.id)
      setStatus('active')
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo iniciar la salida.')
    }
  }

  function handlePause() {
    setStatus('paused')
  }

  function handleResume() {
    setStatus('active')
  }

  const finishingRef = useRef(false)
  async function finalizarYGuardar() {
    if (finishingRef.current) return
    finishingRef.current = true
    setStatus('completed')
    if (sessionId === null) {
      router.replace('/(app)/dashboard')
      return
    }
    try {
      await completeRideSession(sessionId, new Date().toISOString())
    } catch {
      // La salida se guarda igual localmente resuelta — el usuario no debe
      // perder el feedback por un error de red al completar.
    }
    const pid = Number(planned)
    if (planned && !Number.isNaN(pid)) {
      completePlannedRide(pid, sessionId).catch(() => {})
    }
    router.replace(`/(app)/ride/feedback/${sessionId}`)
  }

  function handleFinish() {
    Alert.alert('Terminar salida', '¿Guardar y terminar?', [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Terminar', style: 'destructive', onPress: finalizarYGuardar },
    ])
  }

  function handleAbandon() {
    router.replace('/(app)/dashboard')
  }

  // Confirmar con el botón atrás del sistema si ya arrancó — no perder la
  // salida por un back accidental.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (inProgress) { handleFinish(); return true }
      return false
    })
    return () => sub.remove()
  }, [inProgress])

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={inProgress ? handleFinish : handleAbandon} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.inkSecondary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.inkPrimary }]}>SALIDA EN BICI</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Timer grande */}
      <View style={styles.timerWrap}>
        <Text style={[styles.timerLabel, { color: colors.inkMuted }]}>TIEMPO</Text>
        <Text style={[styles.timerValue, { color: colors.inkPrimary }]}>
          {formatDuration(elapsedSeconds)}
        </Text>
        {status === 'paused' && (
          <View style={[styles.pausedBadge, { borderColor: colors.orange + '44', backgroundColor: colors.orange + '11' }]}>
            <Text style={[styles.pausedText, { color: colors.orange }]}>⏸  PAUSADO</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {error && (
          <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
        )}

        {/* Tira de progreso de TODA la salida + acceso a la rutina completa —
            mismo patrón que run/index.tsx: antes solo se veía el bloque en
            curso, sin forma de ubicarse dentro de la sesión entera. */}
        {pasos.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{
                flex: 1, fontFamily: 'JetBrainsMono-Regular', fontSize: 9.5,
                letterSpacing: 1, textTransform: 'uppercase', color: colors.inkMuted,
              }} numberOfLines={1}>
                {pasoActual
                  ? `${pasoActual.etiqueta} · paso ${Math.min(pasoIdx + 1, pasos.length)}/${pasos.length}`
                  : 'Salida guiada completada'}
              </Text>
              <TouchableOpacity onPress={() => setTimelineVisible(true)} activeOpacity={0.7}>
                <Text style={{ fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 12, color: colors.accent }}>
                  Rutina completa ▴
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 14 }}>
              {pasos.map((p, i) => (
                <View
                  key={p.id}
                  style={{
                    flex: 1, height: 5, borderRadius: 3,
                    backgroundColor: i < pasoIdx
                      ? pasoColor(p, colors)
                      : i === pasoIdx
                        ? pasoColor(p, colors) + '40'
                        : colors.borderDefault,
                  }}
                />
              ))}
            </View>
          </>
        )}

        {/* Guía paso a paso — igual patrón que run/index.tsx, sin ritmo/mapa. */}
        {pasoActual && (
          <View style={[styles.guideCard, { borderColor: colors.borderDefault, backgroundColor: colors.glassBg }]}>
            <View style={styles.guideHeader}>
              <Text style={[styles.guideEyebrow, { color: pasoColor(pasoActual, colors) }]} numberOfLines={1}>
                {pasoActual.etiqueta.toUpperCase()}
                {zonaSesion && pasoActual.tipo === 'trabajo' ? `  ·  ${zonaSesion}` : ''}
              </Text>
            </View>

            {pasoActual.manual ? (
              <TouchableOpacity
                onPress={avanzarPaso}
                activeOpacity={0.85}
                style={[styles.manualBtn, { borderColor: colors.borderBright }]}>
                <Text style={[styles.manualBtnText, { color: colors.accent }]}>Listo — siguiente bloque</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 10 }}>
                <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
                  <View style={[styles.progressFill, {
                    width: `${Math.round(progresoActual * 100)}%`,
                    backgroundColor: pasoColor(pasoActual, colors),
                  }]} />
                </View>
                <Text style={[styles.progressText, { color: colors.inkMuted }]}>
                  {restanteTexto(pasoActual, tiempoEnPaso)}
                </Text>
              </View>
            )}

            <View style={styles.chipsRow}>
              {pasoActual.objetivo.powerRange && (
                <Text style={[styles.chipBig, { color: colors.inkPrimary }]}>
                  {pasoActual.objetivo.powerRange[0]}–{pasoActual.objetivo.powerRange[1]} W
                </Text>
              )}
              {pasoActual.objetivo.hrRange && (
                <Text style={[styles.chipMed, { color: colors.red }]}>
                  {pasoActual.objetivo.hrRange[0]}–{pasoActual.objetivo.hrRange[1]} ppm
                </Text>
              )}
              {pasoActual.objetivo.rpe > 0 && (
                <Text style={[styles.chipMed, { color: colors.inkSecondary }]}>
                  RPE {pasoActual.objetivo.rpe}
                </Text>
              )}
            </View>

            {pasoSiguiente && (
              <Text style={[styles.nextText, { color: colors.inkMuted }]} numberOfLines={1}>
                Luego: {pasoSiguiente.etiqueta}
              </Text>
            )}
          </View>
        )}

        {sesionGuiadaCompleta && (
          <View style={[styles.guideCard, { borderColor: colors.green, backgroundColor: colors.glassBg }]}>
            <Text style={[styles.guideEyebrow, { color: colors.green }]}>SALIDA COMPLETADA</Text>
            <Text style={[styles.nextText, { color: colors.inkMuted, marginTop: 4 }]}>
              Cumpliste todos los bloques. Puedes seguir a ritmo libre o finalizar.
            </Text>
          </View>
        )}
      </View>

      {/* Botones */}
      <View style={[styles.btnWrap, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {status === 'idle' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.green }]}
              onPress={handleStart}
              activeOpacity={0.85}>
              <Text style={[styles.actionBtnText, { color: readableTextOn(colors.green) }]}>EMPEZAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.abandonBtn} onPress={handleAbandon} activeOpacity={0.7}>
              <Text style={[styles.abandonBtnText, { color: colors.inkMuted }]}>ABANDONAR</Text>
            </TouchableOpacity>
          </>
        )}

        {inProgress && (
          <View style={styles.btnRow}>
            {status === 'active' ? (
              <TouchableOpacity
                style={[styles.rowBtn, { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.borderBright }]}
                onPress={handlePause}
                activeOpacity={0.85}>
                <Text style={[styles.actionBtnText, { color: colors.inkPrimary }]}>PAUSA</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.rowBtn, { backgroundColor: colors.green }]}
                onPress={handleResume}
                activeOpacity={0.85}>
                <Text style={[styles.actionBtnText, { color: readableTextOn(colors.green) }]}>REANUDAR</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.rowBtn, { backgroundColor: colors.red }]}
              onPress={handleFinish}
              activeOpacity={0.85}>
              <Text style={[styles.actionBtnText, { color: readableTextOn(colors.red) }]}>FINALIZAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'completed' && (
          <Text style={[styles.completingText, { color: colors.inkMuted }]}>Guardando resultados...</Text>
        )}
      </View>

      <RideTimelineSheet
        visible={timelineVisible}
        onClose={() => setTimelineVisible(false)}
        pasos={pasos}
        pasoIdx={pasoIdx}
        tituloSesion={sesionMeta.titulo}
        duracionTotalMin={sesionMeta.duracionMin}
        colors={colors}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, fontFamily: 'SpaceGrotesk-Medium' },
  headerTitle: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12, letterSpacing: 1.5 },

  timerWrap: { alignItems: 'center', paddingVertical: 28 },
  timerLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 2, marginBottom: 6 },
  timerValue: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 56, letterSpacing: -1 },
  pausedBadge: { marginTop: 14, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  pausedText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 12, letterSpacing: 0.5 },

  body: { flex: 1, paddingHorizontal: 20 },
  errorText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, textAlign: 'center', marginBottom: 12 },

  guideCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  guideHeader: { marginBottom: 10 },
  guideEyebrow: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1 },

  manualBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  manualBtnText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 },

  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  progressText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, marginTop: 6 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 4 },
  chipBig: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 20 },
  chipMed: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 15 },

  nextText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, marginTop: 10 },

  btnWrap: { paddingHorizontal: 24, paddingTop: 12 },
  actionBtn: { borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
  actionBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, letterSpacing: 0.5 },
  abandonBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 8 },
  abandonBtnText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, letterSpacing: 1 },
  btnRow: { flexDirection: 'row', gap: 12 },
  rowBtn: { flex: 1, borderRadius: 999, paddingVertical: 18, alignItems: 'center' },
  completingText: { textAlign: 'center', fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 },
})
