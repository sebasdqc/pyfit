import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiPost } from '../../../lib/api'
import { fetchMiCoachChat, sendMiCoachMensaje, desvincularMiCoach, type Mensaje, type MiCoachChat } from '../../../lib/coachApi'

function horaDe(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegistroCoachScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const [chat, setChat] = useState<MiCoachChat | null>(null)
  const [loadingChat, setLoadingChat] = useState(true)

  // Vinculación por código
  const [codigo, setCodigo]   = useState('')
  const [linking, setLinking] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Chat
  const [input, setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const chatRef = useRef<ScrollView>(null)

  const coach = chat?.coach || null
  const mensajes = chat?.mensajes || []

  async function cargarChat(silent = false) {
    if (!silent) setLoadingChat(true)
    try {
      const c = await fetchMiCoachChat()
      setChat(c)
    } catch {
      // sin conexión → mantenemos lo que haya
    } finally {
      if (!silent) setLoadingChat(false)
    }
  }

  useEffect(() => { cargarChat() }, [])

  // Polling del chat cada 5s mientras hay coach vinculado.
  useEffect(() => {
    if (!coach) return
    const t = setInterval(() => cargarChat(true), 5000)
    return () => clearInterval(t)
  }, [coach])

  async function vincular() {
    if (codigo.trim().length < 4 || linking) return
    setLinking(true)
    setError(null)
    try {
      await apiPost('/api/coach/vincular/', { codigo: codigo.trim().toUpperCase() })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setCodigo('')
      await cargarChat()   // tras vincular, el GET ya trae al coach → cambia a modo chat
    } catch (e: any) {
      setError(e?.message || 'No se pudo vincular. Verifica el código.')
    } finally {
      setLinking(false)
    }
  }

  function confirmarDesvincular() {
    Alert.alert(
      'Desvincular coach',
      `Dejarás de estar en la cartera de ${coach?.nombre ?? 'tu coach'} y se borrará este chat. Podrás volver a vincularte con un código.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Desvincular', style: 'destructive', onPress: desvincular },
      ],
    )
  }

  async function desvincular() {
    try {
      await desvincularMiCoach()
      setChat({ coach: null, mensajes: [] })   // vuelve al modo de ingreso de código
      setInput('')
    } catch (e: any) {
      Alert.alert('No se pudo desvincular', e?.message || 'Intenta de nuevo.')
    }
  }

  async function enviar() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      const msg = await sendMiCoachMensaje(text)
      setChat((prev) => prev ? { ...prev, mensajes: [...prev.mensajes, msg] } : prev)
      setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 50)
    } catch {
      setInput(text)
    } finally {
      setSending(false)
    }
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
        <Text style={styles.headerTitle}>{coach ? 'Tu coach' : 'Registro con Coach'}</Text>
      </View>

      {loadingChat ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={colors.accent} /></View>
      ) : coach ? (
        // ── Modo chat (ya tiene coach) ──────────────────────────────────────────
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 12}
        >
          <View style={styles.coachCard}>
            <View style={styles.coachAvatar}>
              <Text style={styles.coachAvatarText}>{(coach.nombre || '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.coachLabel}>VINCULADO CON</Text>
              <Text style={styles.coachName} numberOfLines={1}>{coach.nombre}</Text>
            </View>
            <TouchableOpacity onPress={confirmarDesvincular} activeOpacity={0.7} style={styles.unlinkBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.unlinkText}>Desvincular</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={chatRef}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: false })}
          >
            {mensajes.length === 0 && (
              <Text style={styles.chatEmpty}>Aún no hay mensajes. Salúdalo 👋</Text>
            )}
            {mensajes.map((m: Mensaje) => {
              const mine = !m.from_coach   // el atleta ve esta pantalla
              return (
                <View key={m.id} style={[styles.msgRow, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                    <Text style={[styles.bubbleText, { color: mine ? colors.white : colors.inkPrimary }]}>{m.texto}</Text>
                  </View>
                  <Text style={styles.msgMeta}>{horaDe(m.created_at)} · {mine ? 'Tú' : coach.nombre.split(' ')[0]}</Text>
                </View>
              )
            })}
          </ScrollView>

          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
            <TextInput
              style={styles.chatInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={colors.inkMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={enviar}
              returnKeyType="send"
              editable={!sending}
            />
            <TouchableOpacity style={styles.sendBtn} activeOpacity={0.85} onPress={enviar} disabled={sending}>
              {sending ? <ActivityIndicator size="small" color={colors.white} /> : (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        // ── Modo ingreso de código (sin coach) ──────────────────────────────────
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 12}
        >
          <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, alignItems: 'center' }}
            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.iconCircle}>
              <Text style={{ fontSize: 40 }}>🧑‍🏫</Text>
            </View>
            <Text style={styles.title}>Vincúlate con tu coach</Text>
            <Text style={styles.description}>
              Ingresa el código que te compartió tu entrenador para unirte a su cartera.
            </Text>

            <Text style={styles.sectionLabel}>CÓDIGO DE COACH</Text>
            <TextInput
              style={styles.codeInput}
              value={codigo}
              onChangeText={(v) => { setCodigo(v.toUpperCase()); if (error) setError(null) }}
              placeholder="——————"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              returnKeyType="done"
              onSubmitEditing={vincular}
              editable={!linking}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, (codigo.trim().length < 4 || linking) && styles.btnDisabled]}
              activeOpacity={0.85}
              disabled={codigo.trim().length < 4 || linking}
              onPress={vincular}
            >
              {linking ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryBtnText}>VINCULARME</Text>}
            </TouchableOpacity>

            <Text style={styles.hint}>
              ¿No tienes un código? Pídeselo a tu coach: lo encuentra en su portal.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Código
    iconCircle: {
      width: 96, height: 96, borderRadius: 48,
      backgroundColor: 'rgba(79,140,255,0.1)',
      borderWidth: 1, borderColor: 'rgba(79,140,255,0.2)',
      alignItems: 'center', justifyContent: 'center',
      marginTop: 24, marginBottom: 20,
    },
    title: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, letterSpacing: -0.7, marginBottom: 12, textAlign: 'center' },
    description: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28, paddingHorizontal: 8 },
    sectionLabel: { alignSelf: 'flex-start', color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
    codeInput: {
      width: '100%', backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.accent, borderRadius: 18,
      paddingVertical: 20, minHeight: 72, color: c.inkPrimary, fontFamily: 'JetBrainsMono-Medium',
      fontSize: 30, letterSpacing: 8, textAlign: 'center', marginBottom: 16,
    },
    errorText: { alignSelf: 'flex-start', color: '#ff8585', fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, marginBottom: 12, marginTop: -4 },
    primaryBtn: { width: '100%', backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 16, minHeight: 50, justifyContent: 'center' },
    primaryBtnText: { color: c.white, fontFamily: 'JetBrainsMono-Medium', fontSize: 12, letterSpacing: 0.8 },
    btnDisabled: { opacity: 0.45 },
    hint: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 12 },

    // Chat
    coachCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginHorizontal: 20, marginTop: 16, marginBottom: 8,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 16, padding: 14,
    },
    coachAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(79,140,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    coachAvatarText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, color: c.accent },
    coachLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 1.4 },
    coachName: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: c.inkPrimary, marginTop: 2 },
    unlinkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: c.borderDefault },
    unlinkText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 12, color: c.inkMuted },

    chatContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
    chatEmpty: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: c.inkMuted, textAlign: 'center', marginTop: 40 },
    msgRow: { marginBottom: 14, maxWidth: '100%' },
    bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMine: { backgroundColor: c.accent, borderTopRightRadius: 4 },
    bubbleOther: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderTopLeftRadius: 4 },
    bubbleText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 20 },
    msgMeta: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, marginTop: 4, marginHorizontal: 4 },
    inputBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.borderDefault,
    },
    chatInput: {
      flex: 1, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 22,
      paddingHorizontal: 16, paddingVertical: 11, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  })
}
