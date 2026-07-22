import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
  Animated,
  Easing,
  AccessibilityInfo,
  findNodeHandle,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Rect, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg'
import { coachLogin } from '../../lib/auth'
import { P, CONTACT_URL } from '../../lib/coachTheme'
import { useTranslation, type ScalarKey } from '../../lib/i18n'

// Suscripción a "reducir movimiento" del SO (WCAG 2.3.3) — misma utilidad que
// el login del atleta. La usan la aurora y la animación de entrada.
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setReduce(!!v) })
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v))
    return () => { mounted = false; sub?.remove?.() }
  }, [])
  return reduce
}

// ─── Iconos ─────────────────────────────────────────────────────────────────────

function EnvelopeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2.5} stroke={P.purpleSoft} strokeWidth={1.6} />
      <Path d="m4 7.5 8 5.5 8-5.5" stroke={P.purpleSoft} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function LockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} stroke={P.purpleSoft} strokeWidth={1.6} />
      <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" stroke={P.purpleSoft} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  )
}

// ─── Orbes animados de fondo (aurora morada) ─────────────────────────────────

// Mismo efecto que el login del atleta: un gradiente radial SVG (centro
// brillante → transparente) dentro de un Animated.View que late (escala +
// opacidad) y deriva en horizontal. Adaptado a la identidad morada fija del
// portal de coach. Usa el Animated nativo de RN (useNativeDriver) para no
// depender de Reanimated ni de un rebuild del dev client.
type OrbProps = {
  gid: string; color: string; size: number; top: number; left: number; driftX: number
  scaleFrom: number; scaleTo: number; opFrom: number; opTo: number; duration: number; delay: number
  reduceMotion: boolean
}

function GlowOrb({
  gid, color, size, top, left, driftX,
  scaleFrom, scaleTo, opFrom, opTo, duration, delay, reduceMotion,
}: OrbProps) {
  const progress = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (reduceMotion) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1, duration, delay,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0, duration,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [progress, duration, delay, reduceMotion])

  // Con reduce-motion, el orb queda estático en un punto medio del ciclo.
  const scale = reduceMotion
    ? (scaleFrom + scaleTo) / 2
    : progress.interpolate({ inputRange: [0, 1], outputRange: [scaleFrom, scaleTo] })
  const opacity = reduceMotion
    ? (opFrom + opTo) / 2
    : progress.interpolate({ inputRange: [0, 1], outputRange: [opFrom, opTo] })
  const translateX = reduceMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [-driftX, driftX] })

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top, left, width: size, height: size,
        opacity, transform: [{ translateX }, { scale }],
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gid} cx={size / 2} cy={size / 2} r={size / 2} gradientUnits="userSpaceOnUse">
            <Stop offset={0} stopColor={color} stopOpacity={1} />
            <Stop offset={0.45} stopColor={color} stopOpacity={0.55} />
            <Stop offset={1} stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={size / 2} cy={size / 2} rx={size / 2} ry={size / 2} fill={`url(#${gid})`} />
      </Svg>
    </Animated.View>
  )
}

// Cuatro orbes morados superpuestos en la parte superior, con fases/duraciones
// distintas para que el conjunto respire como una aurora viva.
function CoachLoginAura({ focus }: { focus: Animated.Value }) {
  const { width } = useWindowDimensions()
  const reduceMotion = useReduceMotion()
  // Diferenciador: la aurora "se inclina" hacia el usuario al enfocar un campo
  // (leve escala + brillo). Se apaga con reduce-motion.
  const focusStyle = reduceMotion ? null : {
    opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }),
    transform: [{ scale: focus.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
  }
  return (
    <Animated.View pointerEvents="none" style={[auraStyles.container, focusStyle]}>
      <GlowOrb gid="cOrbLight" color={P.purpleLight} size={360}
        top={-50} left={-110} driftX={42}
        scaleFrom={0.9} scaleTo={1.32} opFrom={0.35} opTo={0.8} duration={4400} delay={300}
        reduceMotion={reduceMotion} />
      <GlowOrb gid="cOrbDark" color={P.purpleDark} size={430}
        top={-110} left={width - 270} driftX={38}
        scaleFrom={1} scaleTo={1.28} opFrom={0.4} opTo={0.9} duration={4000} delay={800}
        reduceMotion={reduceMotion} />
      <GlowOrb gid="cOrbMain" color={P.purple} size={560}
        top={-210} left={width / 2 - 280} driftX={28}
        scaleFrom={1} scaleTo={1.26} opFrom={0.6} opTo={1} duration={3200} delay={0}
        reduceMotion={reduceMotion} />
      <GlowOrb gid="cOrbCore" color={P.purpleMid} size={260}
        top={-70} left={width / 2 - 130} driftX={14}
        scaleFrom={0.85} scaleTo={1.38} opFrom={0.4} opTo={0.95} duration={2600} delay={500}
        reduceMotion={reduceMotion} />
    </Animated.View>
  )
}

const auraStyles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, height: 540, overflow: 'hidden' },
})

// ─── Pantalla ─────────────────────────────────────────────────────────────────

const BENEFICIOS: ScalarKey[] = [
  'coach_benefit_pro',
  'coach_benefit_ia',
  'coach_benefit_dashboard',
  'coach_benefit_historial',
]

export default function CoachLoginScreen() {
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  const reduceMotion = useReduceMotion()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messageRef = useRef<View>(null)

  // Foco de accesibilidad al mensaje de error al aparecer (VoiceOver/TalkBack).
  useEffect(() => {
    if (!message) return
    const node = findNodeHandle(messageRef.current)
    if (node) AccessibilityInfo.setAccessibilityFocus(node)
  }, [message])

  // Entrada escalonada del contenido (fade + subida sutil), respeta reduce-motion.
  const entrance = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduceMotion) { entrance.setValue(1); return }
    Animated.timing(entrance, {
      toValue: 1, duration: 520, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start()
  }, [entrance, reduceMotion])
  const entranceStyle = {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  }

  // Diferenciador: aurora reactiva al foco de los campos.
  const auraFocus = useRef(new Animated.Value(0)).current
  const animateAura = (to: number) =>
    Animated.timing(auraFocus, {
      toValue: to, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start()

  // Diferenciador: sheen que barre el botón de acceso en loop lento.
  const [btnW, setBtnW] = useState(0)
  const sheen = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduceMotion || btnW === 0) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(sheen, {
          toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [reduceMotion, btnW, sheen])
  const sheenX = sheen.interpolate({ inputRange: [0, 1], outputRange: [-btnW * 0.7, btnW * 1.3] })

  async function handleAccess() {
    if (!email.trim() || !password.trim()) {
      setMessage(t('coach_login_error_fields'))
      return
    }
    setMessage('')
    setLoading(true)
    const res = await coachLogin(email.trim().toLowerCase(), password)
    setLoading(false)

    if (res.status === 'invalid') {
      setMessage(t('coach_login_error_invalid'))
      return
    }
    if (res.status === 'error') {
      setMessage(t('coach_login_error_network'))
      return
    }
    if (res.status === 'ok') {
      router.replace('/(coach)/inicio' as any)
      return
    }
    // pending → la cuenta no es un coach con acceso activado
    setMessage(t('coach_login_pending'))
  }

  return (
    <View style={styles.root}>
      {/* Orbes animados morados detrás de la parte superior */}
      <CoachLoginAura focus={auraFocus} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={entranceStyle}>
          {/* Badge superior */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>{t('coach_login_badge')}</Text>
          </View>

          {/* Logo + subtítulo */}
          <View style={styles.logoBlock}>
            <Image
              source={require('../../assets/Logo-Zyfit-Blanco.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>{t('coach_login_subtitle')}</Text>
          </View>

          {/* Recuadro del formulario — mismo estilo que el login del atleta */}
          <View style={styles.card}>
            {/* Campos */}
            <View style={styles.inputRow}>
              <EnvelopeIcon />
              <TextInput
                style={styles.input}
                placeholder={t('coach_login_email_placeholder')}
                placeholderTextColor={P.purpleFaint}
                value={email}
                onChangeText={(txt) => { setEmail(txt); setMessage('') }}
                onFocus={() => animateAura(1)}
                onBlur={() => animateAura(0)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputRow}>
              <LockIcon />
              <TextInput
                style={styles.input}
                placeholder={t('coach_login_password_placeholder')}
                placeholderTextColor={P.purpleFaint}
                value={password}
                onChangeText={(txt) => { setPassword(txt); setMessage('') }}
                onFocus={() => animateAura(1)}
                onBlur={() => animateAura(0)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: showPassword }}
                accessibilityLabel={showPassword ? t('login_hide_password') : t('login_show_password')}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? t('login_hide_password') : t('login_show_password')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Olvidaste tu contraseña */}
            <TouchableOpacity
              style={styles.forgotBtn}
              activeOpacity={0.6}
              onPress={() => router.push('/(auth)/forgot-password' as any)}
            >
              <Text style={styles.forgotText}>{t('login_forgot_password')}</Text>
            </TouchableOpacity>

            {/* Botón de acceso — wrap externo lleva la sombra (sin overflow para no
                recortarla en iOS); el interior recorta el sheen. */}
            <TouchableOpacity
              style={styles.accessBtnWrap}
              activeOpacity={0.85}
              onPress={handleAccess}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t('coach_login_access_btn')}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              <View
                style={styles.accessBtn}
                onLayout={(e) => setBtnW(e.nativeEvent.layout.width)}
              >
                {!reduceMotion && btnW > 0 && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.sheen,
                      { width: btnW * 0.4, transform: [{ translateX: sheenX }, { rotate: '14deg' }] },
                    ]}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.22)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sheenFill}
                    />
                  </Animated.View>
                )}
                {loading ? (
                  <ActivityIndicator color={P.white} size="small" />
                ) : (
                  <Text style={styles.accessBtnText}>{t('coach_login_access_btn')}</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Mensaje inline (no popup) */}
            {!!message && (
              <View ref={messageRef} accessible accessibilityRole="alert" accessibilityLiveRegion="assertive">
                <Text style={styles.message}>{message}</Text>
              </View>
            )}
          </View>

          {/* Separador "¿aún no eres coach?" */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('coach_login_divider')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Card de beneficios */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>{t('coach_login_benefits_title')}</Text>

            {BENEFICIOS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>{t(b)}</Text>
              </View>
            ))}

            <View style={styles.benefitsDivider} />
            <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(CONTACT_URL)}>
              <Text style={styles.contactLink}>{t('coach_login_contact_link')}</Text>
            </TouchableOpacity>
          </View>

          {/* Volver al login del atleta */}
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.6}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          >
            <Text style={styles.backText}>{t('coach_login_back')}</Text>
          </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'stretch',
  },

  // Badge
  badge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: P.badgeBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 32,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: P.purple,
  },
  badgeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    color: P.purpleSoft,
    letterSpacing: 0.8,
  },

  // Logo
  logoBlock: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 220,
    height: 71,
    tintColor: P.purpleMid,   // recolorea el wordmark blanco a morado medio
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    // Mismo color que el logo (purpleMid, hoy rojo medio) para que contraste
    // sobre el fondo profundo — antes usaba purpleFaint y quedaba muy apagado.
    color: P.purpleMid,
    letterSpacing: 0.2,
  },

  // Recuadro del formulario — mismo recuadro que el login del atleta, en morado
  card: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 24,
    padding: 24,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.inputBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    color: P.ink,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 15,
  },
  eyeText: {
    fontFamily: 'JetBrainsMono-Medium',
    fontSize: 11,
    color: P.purpleSoft,
    letterSpacing: 1,
    paddingHorizontal: 4,
    paddingVertical: 10,
  },

  // Olvidaste
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 22,
    marginTop: 2,
    paddingVertical: 2,
  },
  forgotText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    color: P.purpleSoft,
  },

  // Botón de acceso — wrap externo (solo sombra, sin overflow) + interior
  // (color + recorte del sheen). Si overflow:'hidden' fuera en el mismo nodo
  // que la sombra, iOS la recortaría (masksToBounds).
  accessBtnWrap: {
    borderRadius: 14,
    shadowColor: P.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  accessBtn: {
    backgroundColor: P.purple,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Sheen: banda diagonal translúcida que barre el botón (ancho por inline).
  sheen: {
    position: 'absolute',
    top: -24,
    bottom: -24,
  },
  sheenFill: {
    flex: 1,
  },
  accessBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: P.white,
    letterSpacing: 0.2,
  },

  // Mensaje inline
  message: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    color: P.purpleSoft,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 14,
  },

  // Separador
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 34,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: P.divider,
  },
  dividerText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 12,
    color: P.purpleFaint,
    marginHorizontal: 12,
  },

  // Card de beneficios
  benefitsCard: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 20,
    padding: 22,
  },
  benefitsTitle: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: P.purpleMid,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 11,
  },
  benefitDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: P.purple,
  },
  benefitText: {
    flex: 1,
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 14,
    color: P.ink,
  },
  benefitsDivider: {
    height: 1,
    backgroundColor: P.divider,
    marginTop: 10,
    marginBottom: 16,
  },
  contactLink: {
    fontFamily: 'SpaceGrotesk-Medium',
    fontSize: 14,
    color: P.purpleMid,
    textAlign: 'center',
  },

  // Volver
  backBtn: {
    alignSelf: 'center',
    marginTop: 28,
    paddingVertical: 8,
  },
  backText: {
    fontFamily: 'SpaceGrotesk-Regular',
    fontSize: 13,
    color: P.purpleFaint,
  },
})
