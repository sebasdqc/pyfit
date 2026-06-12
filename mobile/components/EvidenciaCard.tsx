import React, { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../lib/theme'

// ─── Shared types (also consumed by generate/index.tsx) ──────────────────────

export interface ResumenDecision { icon: string; text: string }
export interface ResumenEvidencia { text: string; reference: string }
export interface ResumenData {
  decisiones: ResumenDecision[]
  evidencia: ResumenEvidencia
}

// For static/demo usage (onboarding slider)
export interface StaticEvidenciaData {
  text: string
  highlightWord?: string
  evidenciaText?: string
  reference?: string
}

interface Props {
  // Dynamic mode — generate screen
  resumen?: ResumenData | null
  loading?: boolean
  // Static/demo mode — slider
  staticData?: StaticEvidenciaData
  // Behavior override: skip toggle, always show expanded section
  alwaysExpanded?: boolean
}

function toParrafo(decisiones: ResumenDecision[]): string {
  return decisiones.map(d => {
    const t = d.text.trim()
    return /[.!?]$/.test(t) ? t : t + '.'
  }).join(' ')
}

function HighlightedText({
  text,
  word,
  baseStyle,
  highlightStyle,
}: {
  text: string
  word: string
  baseStyle: object
  highlightStyle: object
}) {
  const idx = text.toLowerCase().indexOf(word.toLowerCase())
  if (idx === -1) return <Text style={baseStyle}>{text}</Text>
  return (
    <Text style={baseStyle}>
      {text.slice(0, idx)}
      <Text style={highlightStyle}>{text.slice(idx, idx + word.length)}</Text>
      {text.slice(idx + word.length)}
    </Text>
  )
}

export default function EvidenciaCard({ resumen, loading, staticData, alwaysExpanded }: Props) {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)

  const isStatic = !!staticData
  const isExpanded = alwaysExpanded || expanded
  const hasContent = !loading && (resumen || staticData)

  if (!loading && !resumen && !staticData) return null

  const mainText = isStatic
    ? staticData!.text
    : resumen ? toParrafo(resumen.decisiones) : ''
  const evidenciaText = isStatic ? staticData!.evidenciaText : resumen?.evidencia.text
  const reference     = isStatic ? staticData!.reference    : resumen?.evidencia.reference
  const highlightWord = isStatic ? staticData!.highlightWord : undefined

  const textBase = {
    fontFamily: 'SpaceGrotesk-Regular' as const,
    fontSize: 14,
    color: colors.inkSecondary,
    lineHeight: 23,
  }

  return (
    <View style={{
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.borderDefault,
      backgroundColor: colors.accent + '0D',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{
          fontFamily: 'JetBrainsMono-Regular',
          fontSize: 9,
          color: colors.accentLight,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
        }}>
          ✦  POR QUÉ ESTA RUTINA
        </Text>
      </View>

      {loading && !hasContent ? (
        <View style={{ gap: 8 }}>
          {(['100%', '88%', '94%'] as const).map((w, i) => (
            <View key={i} style={{ height: 12, backgroundColor: colors.cardBg, borderRadius: 4, width: w }} />
          ))}
          <View style={{ height: 1, backgroundColor: colors.borderDefault, marginVertical: 14 }} />
          <View style={{ height: 12, backgroundColor: colors.cardBg, borderRadius: 4, width: '80%' }} />
          <View style={{ height: 12, backgroundColor: colors.cardBg, borderRadius: 4, width: '55%', marginTop: 4 }} />
        </View>
      ) : hasContent ? (
        <>
          {highlightWord ? (
            <HighlightedText
              text={mainText}
              word={highlightWord}
              baseStyle={textBase}
              highlightStyle={{ fontFamily: 'SpaceGrotesk-SemiBold', color: colors.accent }}
            />
          ) : (
            <Text
              numberOfLines={isExpanded ? undefined : 3}
              style={textBase}
            >
              {mainText}
            </Text>
          )}

          {isExpanded && (evidenciaText || reference) && (
            <>
              <View style={{ height: 1, backgroundColor: colors.borderDefault, marginVertical: 14 }} />
              {evidenciaText ? (
                <Text style={{
                  fontFamily: 'InstrumentSerif-Italic',
                  fontSize: 13,
                  color: colors.inkMuted,
                  lineHeight: 20,
                  marginBottom: 6,
                }}>
                  {evidenciaText}
                </Text>
              ) : null}
              {reference ? (
                <Text style={{
                  fontFamily: 'JetBrainsMono-Regular',
                  fontSize: 10,
                  color: colors.inkFaint,
                  letterSpacing: 0.5,
                }}>
                  {reference}
                </Text>
              ) : null}
            </>
          )}

          {!alwaysExpanded && (
            <TouchableOpacity
              onPress={() => setExpanded(e => !e)}
              activeOpacity={0.7}
              style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{
                fontFamily: 'JetBrainsMono-Regular',
                fontSize: 10,
                color: colors.accent,
                letterSpacing: 0.8,
              }}>
                {expanded ? 'VER MENOS ↑' : 'VER MÁS ↓'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : null}
    </View>
  )
}
