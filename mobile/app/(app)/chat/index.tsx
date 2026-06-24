import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Animated,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
  Modal, TouchableOpacity, TextInput, KeyboardAvoidingView,
  Platform, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { useTheme } from '../../../lib/theme'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'coach' | 'user'
  text: string
  ts: Date
}

// ─── Recomendaciones placeholder ─────────────────────────────────────────────

const RECOMENDACIONES = [
  {
    id: '1',
    categoria: 'RECUPERACIÓN',
    color: '#32c896',
    titulo: 'Hoy es día de movilidad',
    cuerpo: 'Tus últimas 4 sesiones tuvieron RPE promedio de 8.1. Tu sistema nervioso necesita un respiro. Una sesión suave hoy mejorará tu rendimiento el próximo entreno.',
    icono: '🧘',
  },
  {
    id: '2',
    categoria: 'PROGRESIÓN',
    color: '#4f8cff',
    titulo: 'Estás cerca del nivel Élite',
    cuerpo: 'A 15 sesiones de alcanzar Élite. Con tu cadencia actual de 3 por semana, lo conseguirás en aproximadamente 5 semanas. No frenes ahora.',
    icono: '⚡',
  },
  {
    id: '3',
    categoria: 'PATRÓN',
    color: '#ffaa32',
    titulo: 'Tu ventana de mayor rendimiento',
    cuerpo: 'Los datos muestran un 23% más de cumplimiento los martes y jueves por la mañana. Considera bloquear esos horarios como tus entrenamientos fijos.',
    icono: '📈',
  },
  {
    id: '4',
    categoria: 'ALERTA',
    color: '#ff6b6b',
    titulo: 'Señales de fatiga acumulada',
    cuerpo: 'Tu HRV promedio cayó a 52ms esta semana. Duerme mínimo 8h los próximos 3 días y baja la intensidad. No es rendirse, es entrenar con inteligencia.',
    icono: '🛡️',
  },
  {
    id: '5',
    categoria: 'OBJETIVO',
    color: '#c084fc',
    titulo: 'Construye tu base aeróbica',
    cuerpo: 'Tu perfil prioriza resistencia pero tus check-ins recientes apuntan a fuerza. Añade una sesión de cardio continuo de 30–40 min esta semana para equilibrar.',
    icono: '🎯',
  },
]

const MOCK_RESPONSES = [
  'Basado en tu historial reciente, puedo ayudarte con eso. ¿Quieres que profundice en algún aspecto específico?',
  'Entendido. Según tus datos de los últimos 30 días, te recomendaría enfocarte en esa área. ¿Tienes alguna restricción de tiempo o lesión que considerar?',
  'Lo tomo en cuenta. Tu racha y tu nivel actual sugieren que estás listo para ese desafío. ¿Empezamos a planificarlo?',
  'He revisado tus check-ins y tu patrón de descanso. Creo que podemos optimizar eso juntos. ¿Cuánto tiempo disponible tienes esta semana?',
  'Muy buena pregunta. Combinando tu objetivo principal con tu historial de fatiga, la respuesta no es tan simple como parece. Cuéntame más sobre cómo te has sentido esta semana.',
]

const INITIAL_MSG: Message = {
  id: 'coach-0',
  role: 'coach',
  text: 'Hola, soy tu Coach y tomo en cuenta tu historial, tus hábitos y tus preferencias. Pregunta lo que quieras.',
  ts: new Date(),
}

function formatTs(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Send icon ────────────────────────────────────────────────────────────────

function SendIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M22 2L11 13" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M22 2L15 22l-4-9-9-4 20-7z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  )
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(180, anims.map(a =>
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ))
    )
    loop.start()
    return () => loop.stop()
  }, [])
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: color,
            transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
          }}
        />
      ))}
    </View>
  )
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function Bubble({ msg, colors }: { msg: Message; colors: any }) {
  const isCoach = msg.role === 'coach'
  return (
    <View style={[chatStyles.bubbleRow, isCoach ? chatStyles.bubbleRowCoach : chatStyles.bubbleRowUser]}>
      {isCoach && (
        <View style={[chatStyles.coachAvatar, { backgroundColor: colors.accentDark, borderColor: colors.accentLight + '60' }]}>
          <Text style={chatStyles.coachAvatarTxt}>C</Text>
        </View>
      )}
      <View style={[
        chatStyles.bubble,
        isCoach
          ? { backgroundColor: colors.cardBg, borderColor: colors.borderBright, borderBottomLeftRadius: 4 }
          : { backgroundColor: colors.accent, borderColor: colors.accent, borderBottomRightRadius: 4 },
      ]}>
        <Text style={[chatStyles.bubbleTxt, { color: isCoach ? colors.inkPrimary : '#fff' }]}>
          {msg.text}
        </Text>
        <Text style={[chatStyles.bubbleTs, { color: isCoach ? colors.inkFaint : 'rgba(255,255,255,0.5)' }]}>
          {formatTs(msg.ts)}
        </Text>
      </View>
    </View>
  )
}

// ─── Chat Modal ───────────────────────────────────────────────────────────────

function ChatModal({ visible, onClose, colors, insets }: {
  visible: boolean; onClose: () => void; colors: any; insets: any
}) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MSG])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const responseIdx = useRef(0)
  const inputRef = useRef<TextInput>(null)

  // Reset cuando se abre
  useEffect(() => {
    if (visible) {
      setMessages([INITIAL_MSG])
      setInputText('')
      setIsTyping(false)
    }
  }, [visible])

  // Scroll to bottom cuando llegan mensajes
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
  }, [messages, isTyping])

  function handleSend() {
    const text = inputText.trim()
    if (!text) return
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    // Respuesta del Coach después de ~1.8s
    setTimeout(() => {
      const response = MOCK_RESPONSES[responseIdx.current % MOCK_RESPONSES.length]
      responseIdx.current++
      const coachMsg: Message = { id: `c-${Date.now()}`, role: 'coach', text: response, ts: new Date() }
      setIsTyping(false)
      setMessages(prev => [...prev, coachMsg])
    }, 1800)
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[chatStyles.modal, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={chatStyles.gradient} />

        {/* Barra superior */}
        <View style={[chatStyles.chatHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.borderDefault }]}>
          <TouchableOpacity onPress={onClose} style={chatStyles.closeBtn} activeOpacity={0.7}>
            <CloseIcon color={colors.inkSecondary} />
          </TouchableOpacity>
          <View style={chatStyles.chatHeaderCenter}>
            <View style={[chatStyles.coachAvatarLg, { backgroundColor: colors.accentDark, borderColor: colors.accent + '50' }]}>
              <Text style={chatStyles.coachAvatarLgTxt}>C</Text>
            </View>
            <View>
              <Text style={[chatStyles.chatTitle, { color: colors.inkPrimary }]}>Coach</Text>
              <Text style={[chatStyles.chatSubtitle, { color: colors.green }]}>● En línea</Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Mensajes */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={chatStyles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg => <Bubble key={msg.id} msg={msg} colors={colors} />)}

            {isTyping && (
              <View style={[chatStyles.bubbleRow, chatStyles.bubbleRowCoach]}>
                <View style={[chatStyles.coachAvatar, { backgroundColor: colors.accentDark, borderColor: colors.accentLight + '60' }]}>
                  <Text style={chatStyles.coachAvatarTxt}>C</Text>
                </View>
                <View style={[chatStyles.bubble, { backgroundColor: colors.cardBg, borderColor: colors.borderBright, borderBottomLeftRadius: 4 }]}>
                  <TypingDots color={colors.inkMuted} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input bar */}
          <View style={[chatStyles.inputBar, {
            paddingBottom: insets.bottom + 8,
            borderTopColor: colors.borderDefault,
            backgroundColor: colors.bg,
          }]}>
            <TextInput
              ref={inputRef}
              style={[chatStyles.input, {
                color: colors.inkPrimary,
                backgroundColor: colors.cardBg,
                borderColor: colors.borderBright,
              }]}
              placeholder="Escribe algo..."
              placeholderTextColor={colors.inkFaint}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={handleSend}
              activeOpacity={0.8}
              style={[
                chatStyles.sendBtn,
                { backgroundColor: inputText.trim() ? colors.accent : colors.cardBg, borderColor: colors.borderBright },
              ]}
            >
              <SendIcon color={inputText.trim() ? '#fff' : colors.inkMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Rec Card ─────────────────────────────────────────────────────────────────

function RecCard({ rec, anim, colors }: {
  rec: typeof RECOMENDACIONES[0]; anim: Animated.Value; colors: any
}) {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] })
  return (
    <Animated.View style={[
      styles.cardOuter,
      { borderColor: rec.color + '28', backgroundColor: colors.cardBg, opacity: anim, transform: [{ translateY }] },
    ]}>
      <View style={[styles.cardTopBar, { backgroundColor: rec.color }]} />
      <LinearGradient
        colors={[rec.color + '18', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill} pointerEvents="none"
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.categChip, { borderColor: rec.color + '50', backgroundColor: rec.color + '18' }]}>
            <Text style={[styles.categTxt, { color: rec.color }]}>{rec.categoria}</Text>
          </View>
          <Text style={styles.cardEmoji}>{rec.icono}</Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.inkPrimary }]}>{rec.titulo}</Text>
        <View style={[styles.cardDivider, { backgroundColor: rec.color + '30' }]} />
        <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>{rec.cuerpo}</Text>
        <View style={styles.cardFooter}>
          <View style={[styles.cardFooterDot, { backgroundColor: rec.color }]} />
          <Text style={[styles.cardFooterTxt, { color: rec.color }]}>Basado en tu historial</Text>
        </View>
      </View>
    </Animated.View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()

  const [activeIdx, setActiveIdx] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)

  const headerAnim = useRef(new Animated.Value(0)).current
  const cardAnims = useRef(RECOMENDACIONES.map(() => new Animated.Value(0))).current

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 520, useNativeDriver: true }).start(() => {
      Animated.stagger(90, cardAnims.map(a =>
        Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 })
      )).start()
    })
  }, [])

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
    setActiveIdx(Math.max(0, Math.min(idx, RECOMENDACIONES.length - 1)))
  }

  const headerOpacity = headerAnim
  const headerSlide = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] })

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']} style={styles.gradient} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <Animated.View style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
        ]}>
          <Text style={[styles.headline, { color: colors.inkPrimary }]}>
            El coach que{'\n'}
            <Text style={[styles.headlineAccent, { color: colors.accent }]}>te conoce,</Text>
            {' '}sabe lo que necesitas y hacia donde vas.
          </Text>
        </Animated.View>

        {/* ── RECOMENDACIONES ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>RECOMENDACIONES</Text>
            <View style={[styles.countBadge, { borderColor: colors.borderBright, backgroundColor: colors.cardBg }]}>
              <Text style={[styles.countTxt, { color: colors.inkMuted }]}>{RECOMENDACIONES.length}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={styles.slider}
          >
            {RECOMENDACIONES.map((rec, idx) => (
              <View key={rec.id} style={styles.cardPage}>
                <RecCard rec={rec} anim={cardAnims[idx]} colors={colors} />
              </View>
            ))}
          </ScrollView>

          <View style={styles.dotsRow}>
            {RECOMENDACIONES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeIdx
                    ? { width: 22, backgroundColor: colors.accent }
                    : { width: 6, backgroundColor: colors.inkFaint },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── BOTÓN INICIAR CHAT ── */}
        <Animated.View style={{ opacity: headerAnim }}>
          <TouchableOpacity
            onPress={() => setChatOpen(true)}
            activeOpacity={0.82}
            style={[styles.chatBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
              <Path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4V5.5z"
                stroke="#fff" strokeWidth={1.9} strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.chatBtnTxt}>Iniciar Chat con tu Coach</Text>
            <Text style={styles.chatBtnArrow}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── MODAL CHAT ── */}
      <ChatModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        colors={colors}
        insets={insets}
      />
    </View>
  )
}

// ─── Styles pantalla principal ────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  header: { marginBottom: 32 },
  headline: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 26,
    letterSpacing: -0.8, lineHeight: 34,
  },
  headlineAccent: { fontFamily: 'SpaceGrotesk-Bold' },

  sectionWrap: { marginBottom: 28 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionLabel: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  countBadge: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  countTxt: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9 },

  slider: { marginHorizontal: -20 },
  cardPage: { width: SCREEN_W, paddingHorizontal: 20 },

  cardOuter: { borderRadius: 24, borderWidth: 1, overflow: 'hidden', minHeight: 200 },
  cardTopBar: { height: 3 },
  cardContent: { padding: 22, paddingTop: 18, gap: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  categTxt: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 8,
    letterSpacing: 1.8, textTransform: 'uppercase',
  },
  cardEmoji: { fontSize: 32 },
  cardTitle: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 22,
    letterSpacing: -0.6, lineHeight: 28,
  },
  cardDivider: { height: 1 },
  cardBody: {
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    lineHeight: 22, letterSpacing: -0.1,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  cardFooterDot: { width: 5, height: 5, borderRadius: 3 },
  cardFooterTxt: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, letterSpacing: 0.8 },

  dotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginTop: 16,
  },
  dot: { height: 6, borderRadius: 3 },

  chatBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingVertical: 18, paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 8,
  },
  chatBtnTxt: {
    flex: 1,
    fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16,
    color: '#fff', letterSpacing: -0.3,
  },
  chatBtnArrow: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, color: 'rgba(255,255,255,0.7)',
  },
})

// ─── Styles del chat ──────────────────────────────────────────────────────────

const chatStyles = StyleSheet.create({
  modal: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 200 },

  chatHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  chatHeaderCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  coachAvatarLg: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  coachAvatarLgTxt: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, color: '#fff',
  },
  chatTitle: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 16, letterSpacing: -0.4,
  },
  chatSubtitle: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.5, marginTop: 1,
  },

  messagesContent: {
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, gap: 12,
  },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowCoach: { justifyContent: 'flex-start' },
  bubbleRowUser: { justifyContent: 'flex-end' },

  coachAvatar: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  coachAvatarTxt: {
    fontFamily: 'SpaceGrotesk-Bold', fontSize: 12, color: '#fff',
  },

  bubble: {
    maxWidth: SCREEN_W * 0.72, borderRadius: 18, borderWidth: 1,
    paddingVertical: 11, paddingHorizontal: 15, gap: 4,
  },
  bubbleTxt: {
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 21, letterSpacing: -0.1,
  },
  bubbleTs: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 8, letterSpacing: 0.2,
    alignSelf: 'flex-end',
  },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 14, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 12,
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 14,
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
})
