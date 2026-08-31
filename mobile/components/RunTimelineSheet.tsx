/**
 * RunTimelineSheet.tsx — Hoja modal con la RUTINA COMPLETA de la sesión de
 * running en curso: todos los `Paso[]` (ver lib/runSteps.ts) como timeline
 * vertical, no solo el bloque actual.
 *
 * Se abre desde la pantalla de carrera en vivo (run/index.tsx) sin tapar el
 * mapa — es un modal que sube encima, el mapa/GPS siguen corriendo debajo.
 * Autoscrollea al paso en curso al abrirse.
 */
import React, { useEffect, useRef } from 'react'
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View, LayoutChangeEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Colors, RADII } from '../lib/colors'
import type { Paso } from '../lib/runSteps'
import {
  estadoPaso, offsetsAcumulados, metaTexto, TIPO_ICON, TIPO_COLOR_KEY, PasoEstado,
} from '../lib/runTimeline'
import { formatDuration } from '../lib/runMetrics'

// Formatea segundos/km como "M:SS" — mismo criterio que run/index.tsx.
function mmss(s: number): string {
  const x = Math.max(0, Math.round(s))
  return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`
}

interface Chip { text: string; colorKey: keyof Colors }

function chipsDelPaso(paso: Paso, isIndoor: boolean): Chip[] {
  const chips: Chip[] = []
  if (!isIndoor && paso.objetivo.paceRange) {
    chips.push({ text: `${mmss(paso.objetivo.paceRange[0])}–${mmss(paso.objetivo.paceRange[1])} /km`, colorKey: 'cyan' })
  }
  if (paso.objetivo.hrRange) {
    chips.push({ text: `${paso.objetivo.hrRange[0]}–${paso.objetivo.hrRange[1]} ppm`, colorKey: 'red' })
  }
  if (paso.objetivo.rpe > 0) {
    chips.push({ text: `RPE ${paso.objetivo.rpe}`, colorKey: TIPO_COLOR_KEY[paso.tipo] })
  }
  if (chips.length === 0) {
    const meta = metaTexto(paso)
    if (meta) chips.push({ text: meta, colorKey: 'inkMuted' })
  }
  return chips
}

interface Props {
  visible: boolean
  onClose: () => void
  pasos: Paso[]
  pasoIdx: number
  isIndoor: boolean
  tituloSesion?: string
  duracionTotalMin?: number | null
  distanciaTotalKm?: number | null
  colors: Colors
}

export function RunTimelineSheet({
  visible, onClose, pasos, pasoIdx, isIndoor,
  tituloSesion, duracionTotalMin, distanciaTotalKm, colors,
}: Props) {
  const insets = useSafeAreaInsets()
  const s = makeStyles(colors)
  const offsets = offsetsAcumulados(pasos)
  const scrollRef = useRef<ScrollView>(null)
  const rowY = useRef<number[]>([])

  // Autoscroll al paso en curso cuando se abre la hoja — con 13 pasos típicos
  // en una sesión de intervalos, el atleta no debería tener que buscarlo.
  useEffect(() => {
    if (!visible) return
    const y = rowY.current[pasoIdx]
    if (y == null) return
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: false })
    }, 50)
    return () => clearTimeout(t)
  }, [visible, pasoIdx])

  const subtitulo = [
    tituloSesion,
    duracionTotalMin ? `${duracionTotalMin} min est.` : null,
    !isIndoor && distanciaTotalKm ? `${distanciaTotalKm} km` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16, paddingTop: insets.top + 12 }]}>
          <View style={s.handle} />
          <View style={s.headerRow}>
            <Text style={s.title}>Rutina completa</Text>
            <Pressable style={s.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Text style={s.closeBtnText}>✕</Text>
            </Pressable>
          </View>
          {!!subtitulo && <Text style={s.subtitle} numberOfLines={1}>{subtitulo}</Text>}

          <ScrollView
            ref={scrollRef}
            style={s.body}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {pasos.map((paso, i) => {
              const estado = estadoPaso(i, pasoIdx)
              const isLast = i === pasos.length - 1
              const colorKey = TIPO_COLOR_KEY[paso.tipo]
              const tintColor = colors[colorKey] as string
              return (
                <View
                  key={paso.id}
                  style={s.row}
                  onLayout={(e: LayoutChangeEvent) => { rowY.current[i] = e.nativeEvent.layout.y }}
                >
                  <Text style={[s.time, estado === 'current' && { color: colors.accent }]}>
                    {formatDuration(offsets[i])}
                  </Text>

                  <View style={s.spine}>
                    <View
                      style={[
                        s.icon,
                        estado === 'upcoming' && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.borderBright },
                        estado === 'done' && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: tintColor + '80' },
                        estado === 'current' && { backgroundColor: tintColor + '26', borderWidth: 2, borderColor: tintColor },
                      ]}
                    >
                      <Text style={[s.iconText, estado !== 'current' && { opacity: 0.55 }]}>
                        {TIPO_ICON[paso.tipo]}
                      </Text>
                      {estado === 'done' && (
                        <View style={[s.checkBadge, { backgroundColor: colors.green, borderColor: colors.sheetBg }]}>
                          <Text style={s.checkBadgeText}>✓</Text>
                        </View>
                      )}
                    </View>
                    {!isLast && <View style={[s.line, { backgroundColor: colors.borderDefault }]} />}
                  </View>

                  <View style={s.cardWrap}>
                    <Text
                      style={[
                        s.name,
                        estado === 'done' && { color: colors.inkMuted },
                        estado === 'upcoming' && { color: colors.inkSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {paso.etiqueta}
                      {estado === 'current' && <Text style={[s.liveTag, { color: colors.accent, borderColor: colors.accent }]}>  EN CURSO</Text>}
                    </Text>
                    {estado !== 'done' && (
                      <View style={s.chipsRow}>
                        {chipsDelPaso(paso, isIndoor).map((c, ci) => (
                          <View
                            key={ci}
                            style={[
                              s.chip,
                              { borderColor: estado === 'upcoming' ? colors.borderDefault : (colors[c.colorKey] as string) + '55' },
                            ]}
                          >
                            <Text style={[s.chipText, { color: colors[c.colorKey] as string }]}>{c.text}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '86%',
      backgroundColor: c.sheetBg,
      borderTopLeftRadius: RADII.xl,
      borderTopRightRadius: RADII.xl,
      borderTopWidth: 1,
      borderColor: c.borderBright,
      paddingHorizontal: 20,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: RADII.pill,
      backgroundColor: c.borderBright,
      marginBottom: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 19,
      letterSpacing: -0.3,
      color: c.inkPrimary,
    },
    closeBtn: {
      width: 30, height: 30, borderRadius: RADII.pill,
      backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    closeBtnText: { color: c.inkPrimary, fontSize: 13 },
    subtitle: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkMuted,
      marginTop: 4,
    },
    body: {
      marginTop: 18,
    },

    row: { flexDirection: 'row', gap: 12 },
    time: {
      width: 38, textAlign: 'right', paddingTop: 8,
      fontFamily: 'JetBrainsMono-Regular', fontSize: 10.5, color: c.inkFaint,
    },
    spine: { alignItems: 'center', flexShrink: 0 },
    icon: {
      width: 30, height: 30, borderRadius: RADII.pill,
      alignItems: 'center', justifyContent: 'center',
    },
    iconText: { fontSize: 14 },
    checkBadge: {
      position: 'absolute', bottom: -2, right: -2,
      width: 14, height: 14, borderRadius: RADII.pill, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    checkBadgeText: { fontSize: 8, color: '#04150c', fontFamily: 'SpaceGrotesk-Bold' },
    line: { width: 2, flex: 1, minHeight: 18, marginVertical: 2 },

    cardWrap: { flex: 1, paddingTop: 5, paddingBottom: 18, minWidth: 0 },
    name: {
      fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: c.inkPrimary, marginBottom: 5,
    },
    liveTag: {
      fontFamily: 'JetBrainsMono-Medium', fontSize: 9, letterSpacing: 0.5,
      borderWidth: 1, borderRadius: RADII.pill, paddingHorizontal: 6, paddingVertical: 1,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
    chip: { borderWidth: 1, borderRadius: RADII.xs, paddingHorizontal: 7, paddingVertical: 2 },
    chipText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 9.5 },
  })
}
