import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet } from '../../../lib/api'

// ─── Config ─────────────────────────────────────────────────────────────────

// Base del link de descarga. Ajustar al dominio/landing real cuando esté listo;
// `/r/<codigo>` permite atribuir la descarga al referente.
const DOWNLOAD_BASE = 'https://zyfit.app'

function buildReferralLink(code: string) {
  return code ? `${DOWNLOAD_BASE}/r/${code}` : DOWNLOAD_BASE
}

function buildInviteMessage(code: string) {
  const link = buildReferralLink(code)
  return (
    `¡Entrena conmigo en Zyfit! 💪\n\n` +
    `Usa mi código ${code} al registrarte y arrancamos juntos.\n\n` +
    `Descarga la app aquí: ${link}`
  )
}

// Beneficios aún por definir — se listan como adelanto.
const BENEFICIOS: { icon: string; text: string }[] = [
  { icon: '🎁', text: 'Recompensas para ti y para cada amigo que invites' },
  { icon: '🏆', text: 'Ventajas exclusivas al alcanzar metas juntos' },
  { icon: '✨', text: 'Sorpresas a medida que crece tu equipo' },
]

type Copied = 'code' | 'msg' | 'link' | null

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ReferidosScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [codigo, setCodigo]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied]   = useState<Copied>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar el código de referido del perfil. Silencioso ante error: el resto de
  // la pantalla sigue funcionando.
  useFocusEffect(
    useCallback(() => {
      let alive = true
      ;(async () => {
        try {
          const p = await apiGet('/api/profile/')
          if (alive) setCodigo(p?.codigo_referido ?? null)
        } catch {
          // sin código → botones deshabilitados, no rompe nada
        } finally {
          if (alive) setLoading(false)
        }
      })()
      return () => { alive = false }
    }, [])
  )

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  const flashCopied = (which: Copied) => {
    setCopied(which)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(null), 1700)
  }

  const copy = async (text: string, which: Copied) => {
    if (!text) return
    try {
      await Clipboard.setStringAsync(text)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      flashCopied(which)
    } catch {
      // copiar falló → no hacemos nada disruptivo
    }
  }

  const code = codigo ?? ''
  const canCopy = !!codigo

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
        <Text style={styles.headerTitle}>Referidos</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 40 }}>🎁</Text>
        </View>
        <Text style={styles.title}>Invita a un amigo</Text>
        <Text style={styles.description}>
          Comparte tu código personal. Cuando tus amigos entrenen con Zyfit, ambos ganan.
        </Text>

        {/* Código de referido */}
        <Text style={styles.sectionLabel}>TU CÓDIGO DE REFERIDO</Text>
        <TouchableOpacity
          style={styles.codeBox}
          activeOpacity={canCopy ? 0.8 : 1}
          onPress={() => canCopy && copy(code, 'code')}
          disabled={!canCopy}
        >
          {loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Text style={styles.codeValue}>{code || '——————'}</Text>
              <Text style={styles.codeHint}>
                {copied === 'code' ? '✓ ¡Copiado!' : 'Toca para copiar'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Acciones de copia */}
        <TouchableOpacity
          style={[styles.primaryBtn, !canCopy && styles.btnDisabled]}
          activeOpacity={0.85}
          disabled={!canCopy}
          onPress={() => copy(buildInviteMessage(code), 'msg')}
        >
          <Text style={styles.primaryBtnText}>
            {copied === 'msg' ? '✓ ¡MENSAJE COPIADO!' : 'COPIAR MENSAJE DE INVITACIÓN'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, !canCopy && styles.btnDisabled]}
          activeOpacity={0.85}
          disabled={!canCopy}
          onPress={() => copy(buildReferralLink(code), 'link')}
        >
          <Text style={styles.secondaryBtnText}>
            {copied === 'link' ? '✓ ¡LINK COPIADO!' : 'COPIAR SOLO LINK DE DESCARGA'}
          </Text>
        </TouchableOpacity>

        {/* Beneficios (aún por definir) */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Beneficios</Text>
          {BENEFICIOS.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
          <Text style={styles.benefitsNote}>
            Estamos afinando los detalles del programa. ¡Pronto anunciaremos las recompensas!
          </Text>
        </View>
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
    iconCircle: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: 'rgba(79,140,255,0.1)',
      borderWidth: 1, borderColor: 'rgba(79,140,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
      marginTop: 24, marginBottom: 20,
    },
    title: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 22, letterSpacing: -0.7, marginBottom: 12, textAlign: 'center',
    },
    description: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14, lineHeight: 22, textAlign: 'center',
      marginBottom: 28, paddingHorizontal: 8,
    },
    sectionLabel: {
      alignSelf: 'flex-start',
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
    },
    codeBox: {
      width: '100%',
      backgroundColor: c.glassBg,
      borderWidth: 1, borderColor: c.accent, borderRadius: 18,
      paddingVertical: 22, alignItems: 'center', justifyContent: 'center',
      marginBottom: 18, minHeight: 96, gap: 6,
    },
    codeValue: {
      color: c.inkPrimary, fontFamily: 'JetBrainsMono-Medium',
      fontSize: 32, letterSpacing: 6, textAlign: 'center',
      marginLeft: 6,  // compensa el letterSpacing del último carácter
    },
    codeHint: {
      color: c.accent, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase',
    },
    primaryBtn: {
      width: '100%', backgroundColor: c.accent, borderRadius: 14,
      paddingVertical: 15, alignItems: 'center', marginBottom: 12,
    },
    primaryBtnText: {
      color: c.white, fontFamily: 'JetBrainsMono-Medium',
      fontSize: 12, letterSpacing: 0.8,
    },
    secondaryBtn: {
      width: '100%', backgroundColor: 'transparent',
      borderWidth: 1, borderColor: c.borderBright, borderRadius: 14,
      paddingVertical: 14, alignItems: 'center', marginBottom: 28,
    },
    secondaryBtnText: {
      color: c.inkSecondary, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 12, letterSpacing: 0.8,
    },
    btnDisabled: { opacity: 0.45 },
    benefitsCard: {
      width: '100%',
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 18, padding: 20, gap: 12,
    },
    benefitsTitle: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2,
    },
    benefitRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    benefitIcon: { fontSize: 16, lineHeight: 22 },
    benefitText: { flex: 1, color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 22 },
    benefitsNote: {
      color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12, lineHeight: 18, marginTop: 4,
    },
  })
}
