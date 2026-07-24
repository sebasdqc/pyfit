import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Animated, Easing,
  Dimensions, NativeSyntheticEvent, NativeScrollEvent,
  Modal, TouchableOpacity, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Circle } from 'react-native-svg'
import { useTheme } from '../../../lib/theme'
import { readableTextOn, accentAlpha } from '../../../lib/colors'
import { useTranslation } from '../../../lib/i18n'
import { apiPost, apiGet } from '../../../lib/api'
import { useReduceMotion } from '../../../lib/useReduceMotion'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'coach' | 'user'
  text: string
  ts: Date
  isError?: boolean      // fallo de red/IA — se muestra distinto de una respuesta real
  retryText?: string     // texto original del usuario a reenviar si isError
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RecData {
  id: string
  categoria: string
  color: string
  titulo: string
  cuerpo: string
  icono: string
  fuente: string
}

interface DetecData {
  tipo: 'info' | 'warning' | 'alerta'
  color: string
  texto: string
}

interface RecsResponse {
  coach: { nombre: string | null }
  insight: { texto: string }
  recomendaciones: RecData[]
  detecciones: DetecData[]
}

const MAX_RECS = 5

function formatTs(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

function MiniChatIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4V5.5z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
    </Svg>
  )
}

function InfoIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M12 8v.5M12 12v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  )
}

function WarningIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3L2 21h20L12 3z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M12 9v5M12 17.5v.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function AlertaIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M15 9l-6 6M9 9l6 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

// ─── Glass layer ──────────────────────────────────────────────────────────────
// Capa de glassmorphism (expo-blur) que va DETRÁS del contenido de una card —
// mismo patrón que el dashboard/Perfil. La card contenedora debe tener
// overflow:'hidden' + un fondo translúcido (glassBg).
function GlassLayer() {
  const { isDark } = useTheme()
  return (
    <BlurView
      intensity={isDark ? 22 : 42}
      tint={isDark ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  )
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  const reduceMotion = useReduceMotion()
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current
  useEffect(() => {
    // Reduce-motion (WCAG 2.3.3): puntos quietos en reposo, sin el rebote en loop.
    if (reduceMotion) { anims.forEach(a => a.setValue(0)); return }
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
  }, [reduceMotion])
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

function Bubble({ msg, colors, coachInitial = 'C', onRetry }: {
  msg: Message
  colors: any
  coachInitial?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  const isCoach = msg.role === 'coach'
  const isError = !!msg.isError
  return (
    <View style={[chatStyles.bubbleRow, isCoach ? chatStyles.bubbleRowCoach : chatStyles.bubbleRowUser]}>
      {isCoach && (
        <View style={[
          chatStyles.coachAvatar,
          isError
            ? { backgroundColor: 'transparent', borderColor: colors.red + '70' }
            : { backgroundColor: colors.accentDark, borderColor: colors.accentLight + '60' },
        ]}>
          <Text style={[chatStyles.coachAvatarTxt, { color: isError ? colors.red : readableTextOn(colors.accentDark) }]}>{isError ? '!' : coachInitial}</Text>
        </View>
      )}
      <View style={[
        chatStyles.bubble,
        isError
          ? { backgroundColor: colors.red + '12', borderColor: colors.red + '40', borderStyle: 'dashed', borderBottomLeftRadius: 4 }
          : isCoach
            ? { backgroundColor: colors.cardBg, borderColor: colors.borderBright, borderBottomLeftRadius: 4 }
            : { backgroundColor: colors.accent, borderColor: colors.accent, borderBottomRightRadius: 4 },
      ]}>
        <Text style={[chatStyles.bubbleTxt, { color: isError ? colors.red : isCoach ? colors.inkPrimary : readableTextOn(colors.accent) }]}>
          {msg.text}
        </Text>
        {isError && onRetry ? (
          <TouchableOpacity onPress={onRetry} activeOpacity={0.7} style={{ alignSelf: 'flex-start', marginTop: 2 }}>
            <Text style={[chatStyles.bubbleTs, { color: colors.red, textDecorationLine: 'underline', fontSize: 11 }]}>
              {t('chat_error_retry')}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={[chatStyles.bubbleTs, { color: isCoach ? colors.inkFaint : accentAlpha(readableTextOn(colors.accent), 0.5) }]}>
            {formatTs(msg.ts)}
          </Text>
        )}
      </View>
    </View>
  )
}

// ─── Chat Modal ───────────────────────────────────────────────────────────────

function ChatModal({ visible, onClose, colors, insets, initialContext, coachNombre, messages, setMessages }: {
  visible: boolean
  onClose: () => void
  colors: any
  insets: any
  initialContext?: string
  coachNombre?: string
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
}) {
  const { lang, t } = useTranslation()
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const inputRef = useRef<TextInput>(null)
  const lastOpenedContextRef = useRef<string | undefined>(undefined)
  const avatarInitial = (coachNombre || 'Coach')[0].toUpperCase()

  function buildHistorial(msgs: Message[]) {
    return msgs
      .filter(m => m.id !== 'coach-0' && !m.isError)
      .map(m => ({ role: m.role, text: m.text }))
  }

  async function sendToAPI(texto: string, currentMessages: Message[]) {
    setIsTyping(true)
    try {
      const data = await apiPost('/api/chat/', {
        mensaje: texto,
        historial: buildHistorial(currentMessages),
        lang,
      })
      setMessages(prev => [...prev, {
        id: `c-${Date.now()}`,
        role: 'coach',
        text: data.respuesta,
        ts: new Date(),
      }])
    } catch {
      // Se distingue visualmente de una respuesta real (Bubble con isError) y
      // ofrece reintentar el mismo mensaje, en vez de fingir ser el coach.
      setMessages(prev => [...prev, {
        id: `c-err-${Date.now()}`,
        role: 'coach',
        text: t('chat_error_msg'),
        ts: new Date(),
        isError: true,
        retryText: texto,
      }])
    } finally {
      setIsTyping(false)
    }
  }

  function retryFailedMessage(retryText: string) {
    sendToAPI(retryText, messages)
  }

  // Solo arranca una conversación nueva la PRIMERA vez que se abre en esta
  // sesión de la pantalla (o si cambia el contexto inicial) — reabrir el modal
  // ya no borra el historial de la conversación en curso.
  useEffect(() => {
    if (!visible) return
    setInputText('')
    if (messages.length > 0 && lastOpenedContextRef.current === initialContext) return
    lastOpenedContextRef.current = initialContext
    const msg0: Message = { id: 'coach-0', role: 'coach', text: t('chat_initial_msg'), ts: new Date() }
    if (initialContext) {
      const userMsg: Message = { id: 'u-ctx-0', role: 'user', text: initialContext, ts: new Date() }
      const base = [msg0, userMsg]
      setMessages(base)
      sendToAPI(initialContext, base)
    } else {
      setMessages([msg0])
      setIsTyping(false)
    }
  }, [visible, initialContext])

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
  }, [messages, isTyping])

  function handleSend() {
    const text = inputText.trim()
    if (!text || isTyping) return
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text, ts: new Date() }
    const next = [...messages, userMsg]
    setMessages(next)
    sendToAPI(text, next)
    setInputText('')
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[chatStyles.modal, { backgroundColor: colors.bg }]}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']} style={chatStyles.gradient} />

        <View style={[chatStyles.chatHeader, { paddingTop: insets.top + 12, borderBottomColor: colors.borderDefault }]}>
          <TouchableOpacity onPress={onClose} style={chatStyles.closeBtn} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={t('chat_close_a11y')}>
            <CloseIcon color={colors.inkSecondary} />
          </TouchableOpacity>
          <View style={chatStyles.chatHeaderCenter}>
            <View style={[chatStyles.coachAvatarLg, { backgroundColor: colors.accentDark, borderColor: colors.accent + '50' }]}>
              <Text style={[chatStyles.coachAvatarLgTxt, { color: readableTextOn(colors.accentDark) }]}>{avatarInitial}</Text>
            </View>
            <View>
              <Text style={[chatStyles.chatTitle, { color: colors.inkPrimary }]}>
                {coachNombre || 'Coach'}
              </Text>
              <Text style={[chatStyles.chatSubtitle, { color: colors.inkFaint }]}>{t('chat_ai_badge')}</Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

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
            {messages.map(msg => (
              <Bubble
                key={msg.id}
                msg={msg}
                colors={colors}
                coachInitial={avatarInitial}
                onRetry={msg.isError && msg.retryText ? () => retryFailedMessage(msg.retryText!) : undefined}
              />
            ))}
            {isTyping && (
              <View style={[chatStyles.bubbleRow, chatStyles.bubbleRowCoach]}>
                <View style={[chatStyles.coachAvatar, { backgroundColor: colors.accentDark, borderColor: colors.accentLight + '60' }]}>
                  <Text style={[chatStyles.coachAvatarTxt, { color: readableTextOn(colors.accentDark) }]}>{avatarInitial}</Text>
                </View>
                <View style={[chatStyles.bubble, { backgroundColor: colors.cardBg, borderColor: colors.borderBright, borderBottomLeftRadius: 4 }]}>
                  <TypingDots color={colors.inkMuted} />
                </View>
              </View>
            )}
          </ScrollView>

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
              placeholder={t('chat_placeholder')}
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
              disabled={isTyping || !inputText.trim()}
              accessibilityRole="button"
              accessibilityLabel={t('chat_send_a11y')}
              style={[
                chatStyles.sendBtn,
                { backgroundColor: (inputText.trim() && !isTyping) ? colors.accent : colors.cardBg, borderColor: colors.borderBright },
              ]}
            >
              <SendIcon color={(inputText.trim() && !isTyping) ? readableTextOn(colors.accent) : colors.inkMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

// ─── Insight del día ──────────────────────────────────────────────────────────

// Misma cáscara visual que RecCard (barra superior, gradiente, chip, emoji,
// divisor, cuerpo, botón "preguntar al coach") para coherencia y tamaños; se
// distingue por su acento cyan y el emoji 💡.
function InsightCard({ colors, texto, onAskCoach }: {
  colors: any; texto?: string; onAskCoach: () => void
}) {
  const { t } = useTranslation()
  const cyan = colors.cyan
  return (
    <View style={[styles.cardOuter, { borderColor: cyan + '28', backgroundColor: colors.glassBg }]}>
      <GlassLayer />
      <View style={[styles.cardTopBar, { backgroundColor: cyan }]} />
      <LinearGradient
        colors={[cyan + '18', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill} pointerEvents="none"
      />
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.categChip, { borderColor: cyan + '50', backgroundColor: cyan + '18' }]}>
            <Text style={[styles.categTxt, { color: cyan }]}>{t('chat_insight_label')}</Text>
          </View>
          <Text style={styles.cardEmoji}>💡</Text>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: cyan + '30' }]} />
        <Text style={[styles.cardBody, styles.insightBody, { color: colors.inkPrimary }]}>
          {texto || t('chat_no_insight')}
        </Text>

        {/* Botón preguntarle al Coach — igual que RecCard */}
        <View style={[styles.cardAskSeparator, { backgroundColor: colors.borderDefault }]} />
        <TouchableOpacity
          onPress={onAskCoach}
          activeOpacity={0.75}
          style={[styles.cardAskBtn, { backgroundColor: cyan + '12', borderColor: cyan + '35' }]}
        >
          <View style={styles.cardAskBtnLeft}>
            <MiniChatIcon color={cyan} size={12} />
            <Text style={[styles.cardAskBtnTxt, { color: cyan }]}>{t('chat_ask_coach')}</Text>
          </View>
          <Text style={[styles.cardAskBtnArrow, { color: cyan }]}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ─── Rec Card ─────────────────────────────────────────────────────────────────

function RecCard({ rec, anim, colors, onAskCoach }: {
  rec: RecData
  anim: Animated.Value
  colors: any
  onAskCoach: () => void
}) {
  const { t } = useTranslation()
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] })
  return (
    <Animated.View style={[
      styles.cardOuter,
      { borderColor: rec.color + '28', backgroundColor: colors.glassBg, opacity: anim, transform: [{ translateY }] },
    ]}>
      <GlassLayer />
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

        {/* Fuente del dato */}
        <View style={styles.cardFooter}>
          <View style={[styles.cardFooterDot, { backgroundColor: rec.color }]} />
          <Text style={[styles.cardFooterTxt, { color: rec.color }]}>{rec.fuente}</Text>
        </View>

        {/* Botón preguntarle al Coach */}
        <View style={[styles.cardAskSeparator, { backgroundColor: colors.borderDefault }]} />
        <TouchableOpacity
          onPress={onAskCoach}
          activeOpacity={0.75}
          style={[styles.cardAskBtn, { backgroundColor: rec.color + '12', borderColor: rec.color + '35' }]}
        >
          <View style={styles.cardAskBtnLeft}>
            <MiniChatIcon color={rec.color} size={12} />
            <Text style={[styles.cardAskBtnTxt, { color: rec.color }]}>{t('chat_ask_coach')}</Text>
          </View>
          <Text style={[styles.cardAskBtnArrow, { color: rec.color }]}>›</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

// ─── Chips por idioma ─────────────────────────────────────────────────────────

const CHIPS_BY_LANG: Record<string, string[]> = {
  es: ['Cómo calentar antes de fuerza', 'Carga de carbohidratos', 'Mejores suplementos para mi objetivo', 'Cómo progresar en sentadilla', 'Qué hacer si no duermo bien', 'Semana de descarga'],
  en: ['How to warm up for strength', 'Carb loading', 'Best supplements for my goal', 'How to progress in squats', 'What to do when I sleep poorly', 'Deload week'],
  pt: ['Como aquecer antes da força', 'Carga de carboidratos', 'Melhores suplementos para meu objetivo', 'Como progredir no agachamento', 'O que fazer se não durmir bem', 'Semana de descarga'],
  fr: ['Comment s\'échauffer avant la force', 'Charge en glucides', 'Meilleurs compléments pour mon objectif', 'Comment progresser au squat', 'Que faire si je dors mal', 'Semaine de décharge'],
}

// ─── Chip "Explora con tu coach" (blur frosted + anillo de acento pulsátil) ───

function CoachChip({ tema, onPress, colors, isDark, phase }: {
  tema: string; onPress: () => void; colors: any; isDark: boolean; phase: number
}) {
  const reduceMotion = useReduceMotion()
  const pulse = useRef(new Animated.Value(0)).current
  useEffect(() => {
    // Reduce-motion (WCAG 2.3.3): anillo estático a mitad de camino, sin el
    // pulso en loop ni la onda desfasada por chip.
    if (reduceMotion) { pulse.setValue(0.5); return }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]))
    // Desfase por chip → el pulso recorre la fila como una onda, no todos a la vez.
    const timer = setTimeout(() => loop.start(), phase)
    return () => { clearTimeout(timer); loop.stop() }
  }, [phase, reduceMotion])

  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.85] })

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <BlurView
        intensity={isDark ? 24 : 45}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.chip, { backgroundColor: accentAlpha(colors.accent, isDark ? 0.07 : 0.05) }]}
      >
        <Text style={[styles.chipTxt, { color: colors.inkPrimary }]}>{tema}</Text>
      </BlurView>
      {/* anillo de acento pulsátil por encima del blur */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.chipRing, { borderColor: colors.accent, opacity: ringOpacity }]}
      />
    </TouchableOpacity>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CoachScreen() {
  const { colors, isDark } = useTheme()
  const { lang, t } = useTranslation()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReduceMotion()

  const [activeIdx, setActiveIdx] = useState(0)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatContext, setChatContext] = useState<string | undefined>(undefined)
  // Se mantiene en el padre (no dentro del modal) para que cerrar y reabrir el
  // chat en la misma sesión de la app no borre la conversación en curso.
  const [chatMessages, setChatMessages] = useState<Message[]>([])

  const [recs, setRecs] = useState<RecData[]>([])
  const [detecciones, setDetecciones] = useState<DetecData[]>([])
  const [insightTexto, setInsightTexto] = useState<string | undefined>(undefined)
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [coachNombre, setCoachNombre] = useState<string | undefined>(undefined)

  const headerAnim = useRef(new Animated.Value(0)).current
  const cardAnims = useRef(Array.from({ length: MAX_RECS }, () => new Animated.Value(0))).current

  useEffect(() => {
    if (reduceMotion) { headerAnim.setValue(1); return }
    Animated.timing(headerAnim, { toValue: 1, duration: 520, useNativeDriver: true }).start()
  }, [reduceMotion])

  useEffect(() => {
    setLoadingRecs(true)
    apiGet(`/api/chat/recomendaciones/?lang=${lang}`)
      .then((data: RecsResponse) => {
        setRecs(data.recomendaciones || [])
        setDetecciones(data.detecciones || [])
        setInsightTexto(data.insight?.texto)
        setCoachNombre(data.coach?.nombre || undefined)
        // Stagger card animations
        const anims = data.recomendaciones?.slice(0, MAX_RECS).map((_, i) => cardAnims[i]) || []
        if (reduceMotion) { anims.forEach(a => a.setValue(1)); return }
        Animated.stagger(90, anims.map(a =>
          Animated.spring(a, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 })
        )).start()
      })
      .catch(() => {})
      .finally(() => setLoadingRecs(false))
  }, [lang])

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W)
    // El carrusel tiene la card de Insight en el índice 0 + N recomendaciones.
    setActiveIdx(Math.max(0, Math.min(idx, recs.length)))
  }

  function openChat(ctx?: string) {
    setChatContext(ctx)
    setChatOpen(true)
  }

  function closeChat() {
    setChatOpen(false)
    setChatContext(undefined)
  }

  // Índice 0 = card de Insight; las recomendaciones empiezan en 1.
  const activeRec = activeIdx === 0 ? undefined : recs[activeIdx - 1]
  const chatBtnSubtext = activeRec
    ? `${t('chat_start_sub_rec')} "${activeRec.titulo}"`
    : t('chat_start_sub_default')

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
            {t('chat_headline_1')}{'\n'}
            <Text style={[styles.headlineAccent, { color: colors.accent }]}>{t('chat_headline_accent')}</Text>
            {' '}{t('chat_headline_2')}
          </Text>
        </Animated.View>

        {/* ── RECOMENDACIONES (la primera card es el Insight del día) ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionLabelRow}>
            <Text style={[styles.sectionLabel, { color: colors.inkMuted }]}>{t('chat_recs_label')}</Text>
            {!loadingRecs && (
              <View style={[styles.countBadge, { borderColor: colors.borderBright, backgroundColor: colors.cardBg }]}>
                <Text style={[styles.countTxt, { color: colors.inkMuted }]}>{recs.length}</Text>
              </View>
            )}
          </View>

          {loadingRecs
            ? <ActivityIndicator size="small" color={colors.inkMuted} style={{ marginVertical: 32 }} />
            : <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleScroll}
                  scrollEventThrottle={16}
                  decelerationRate="fast"
                  style={styles.slider}
                >
                  {/* Card 0 — Insight del día (mismo formato que las recomendaciones) */}
                  <View key="insight" style={styles.cardPage}>
                    <InsightCard
                      colors={colors}
                      texto={insightTexto}
                      onAskCoach={() => openChat(insightTexto || undefined)}
                    />
                  </View>
                  {recs.map((rec, idx) => (
                    <View key={rec.id} style={styles.cardPage}>
                      <RecCard
                        rec={rec}
                        anim={cardAnims[idx] ?? new Animated.Value(1)}
                        colors={colors}
                        onAskCoach={() => openChat(`${t('chat_start_sub_rec')} "${rec.titulo}"`)}
                      />
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.dotsRow}>
                  {Array.from({ length: recs.length + 1 }).map((_, i) => (
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
              </>
          }
        </View>

        {/* ── EXPLORA CON TU COACH ── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionLabel, { color: colors.inkMuted, marginBottom: 14 }]}>
            {t('chat_explore_label')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {CHIPS_BY_LANG[lang]?.map((tema, i) => (
              <CoachChip
                key={i}
                tema={tema}
                onPress={() => openChat(tema)}
                colors={colors}
                isDark={isDark}
                phase={i * 260}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── ESTA SEMANA TU COACH DETECTÓ ── */}
        {detecciones.length > 0 && (
          <View style={[styles.sectionWrap, styles.detecWrap, { borderColor: colors.borderDefault, backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionLabel, { color: colors.inkMuted, marginBottom: 14 }]}>
              {t('chat_detected_label')}
            </Text>
            {detecciones.map((d, i) => (
              <View key={i} style={[styles.detecRow, i < detecciones.length - 1 && { marginBottom: 12 }]}>
                <View style={styles.detecIconWrap}>
                  {d.tipo === 'info'    && <InfoIcon    color={d.color} size={15} />}
                  {d.tipo === 'warning' && <WarningIcon color={d.color} size={15} />}
                  {d.tipo === 'alerta'  && <AlertaIcon  color={d.color} size={15} />}
                </View>
                <Text style={[styles.detecTxt, { color: colors.inkSecondary }]}>{d.texto}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── BOTÓN INICIAR CHAT ── */}
        <Animated.View style={{ opacity: headerAnim }}>
          <TouchableOpacity
            onPress={() => openChat(undefined)}
            activeOpacity={0.82}
            style={[styles.chatBtn, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
              <Path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4V5.5z"
                stroke={readableTextOn(colors.accent)} strokeWidth={1.9} strokeLinejoin="round"
              />
            </Svg>
            <View style={{ flex: 1 }}>
              <Text style={[styles.chatBtnTxt, { color: readableTextOn(colors.accent) }]}>{t('chat_start_btn')}</Text>
              <Text style={[styles.chatBtnSubtxt, { color: accentAlpha(readableTextOn(colors.accent), 0.65) }]} numberOfLines={1}>{chatBtnSubtext}</Text>
            </View>
            <Text style={[styles.chatBtnArrow, { color: accentAlpha(readableTextOn(colors.accent), 0.7) }]}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 60 }} />
      </ScrollView>

      <ChatModal
        visible={chatOpen}
        onClose={closeChat}
        colors={colors}
        insets={insets}
        initialContext={chatContext}
        coachNombre={coachNombre}
        messages={chatMessages}
        setMessages={setChatMessages}
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

  header: { marginBottom: 20 },
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
  // Cuerpo del Insight — un poco más de presencia que cardBody porque es el
  // contenido principal de esa card (no lleva título).
  insightBody: {
    fontFamily: 'SpaceGrotesk-Medium', fontSize: 15,
    lineHeight: 23,
  },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardFooterDot: { width: 5, height: 5, borderRadius: 3 },
  cardFooterTxt: { fontFamily: 'JetBrainsMono-Regular', fontSize: 8, letterSpacing: 0.8 },
  cardAskSeparator: { height: StyleSheet.hairlineWidth },
  cardAskBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, borderWidth: 1,
    paddingVertical: 9, paddingHorizontal: 12,
  },
  cardAskBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardAskBtnTxt: {
    fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  cardAskBtnArrow: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 18 },

  dotsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginTop: 16,
  },
  dot: { height: 6, borderRadius: 3 },

  chipsScroll: { marginHorizontal: -20 },
  chipsContent: { paddingHorizontal: 20, paddingVertical: 4, gap: 9, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 15, paddingVertical: 10,
    borderRadius: 20, overflow: 'hidden',
  },
  chipRing: {
    borderRadius: 20, borderWidth: 1.5,
  },
  chipTxt: {
    fontFamily: 'SpaceGrotesk-Medium', fontSize: 13,
    letterSpacing: -0.2,
  },

  detecWrap: {
    borderRadius: 20, borderWidth: 1,
    padding: 18,
  },
  detecRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detecIconWrap: { marginTop: 1 },
  detecTxt: {
    flex: 1,
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
    lineHeight: 20, letterSpacing: -0.1,
  },

  chatBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 8,
  },
  chatBtnTxt: {
    fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16,
    color: '#fff', letterSpacing: -0.3,
  },
  chatBtnSubtxt: {
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 11,
    color: 'rgba(255,255,255,0.65)', letterSpacing: -0.1, marginTop: 1,
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
