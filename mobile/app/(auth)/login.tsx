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
  Modal,
  Platform,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  AccessibilityInfo,
  findNodeHandle,
  useWindowDimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg'
import { Colors, readableTextOn } from '../../lib/colors'
import { useTheme } from '../../lib/theme'
import { useTranslation } from '../../lib/i18n'
import type { Lang } from '../../lib/translations'
import { useReduceMotion } from '../../lib/useReduceMotion'
import { login, register, googleLogin, appleLogin } from '../../lib/auth'

// ─── Banderas de idioma ────────────────────────────────────────────────────────
// PNGs en mobile/assets/flags/<code>.png (60×40). Placeholders generados —
// reemplazá los 4 por banderas reales manteniendo el nombre de archivo.
const FLAGS: Record<Lang, ReturnType<typeof require>> = {
  es: require('../../assets/flags/es.png'),
  en: require('../../assets/flags/en.png'),
  pt: require('../../assets/flags/pt.png'),
  fr: require('../../assets/flags/fr.png'),
}
const LANGS: { code: Lang; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
]

// ─── Logo ────────────────────────────────────────────────────────────────────

function PyFitLogo() {
  const { colors, isDark } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <Image
      // Logo blanco sobre fondos oscuros; negro sobre temas claros (light/rosado).
      source={isDark
        ? require('../../assets/Logo-Zyfit-Blanco.png')
        : require('../../assets/Logo-Zyfit-negro.png')}
      style={styles.logoImage}
      resizeMode="contain"
    />
  )
}

// ─── Social button ────────────────────────────────────────────────────────────

function SocialButton({
  icon, label, onPress, loading = false, disabled = false,
}: {
  icon: React.ReactNode
  label: string
  onPress?: () => void
  loading?: boolean
  disabled?: boolean
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity
      style={[styles.socialBtn, (disabled || loading) && { opacity: 0.6 }]}
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}>
      {loading ? <ActivityIndicator size="small" color={colors.inkPrimary} /> : icon}
      <Text style={styles.socialBtnText}>{label}</Text>
    </TouchableOpacity>
  )
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  )
}

function AppleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="white">
      <Path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.18 1.27-2.16 3.8.03 3.02 2.65 4.03 2.68 4.04l-.07.28zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </Svg>
  )
}

// ─── Animated background orbs (blue glow / aurora) ─────────────────────────────

// Un orb es un gradiente radial SVG (centro brillante → transparente) envuelto en
// un Animated.View que late suavemente (escala + opacidad) y deriva en horizontal.
// Usamos el Animated nativo de RN (useNativeDriver) en vez de Reanimated para no
// depender del plugin de Babel ni de un rebuild del dev client.
type OrbProps = {
  gid: string; color: string; size: number; top: number; left: number; driftX: number
  scaleFrom: number; scaleTo: number; opFrom: number; opTo: number; duration: number; delay: number
  // dim atenúa la opacidad (temas claros); reduceMotion congela el orb.
  dim: number; reduceMotion: boolean
}

function GlowOrb({
  gid, color, size, top, left, driftX,
  scaleFrom, scaleTo, opFrom, opTo, duration, delay, dim, reduceMotion,
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
    ? ((opFrom + opTo) / 2) * dim
    : progress.interpolate({ inputRange: [0, 1], outputRange: [opFrom * dim, opTo * dim] })
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

// Tres orbs azules superpuestos en la parte superior, con fases/duraciones
// distintas para que el conjunto respire como una aurora viva.
function LoginAura({ focus }: { focus: Animated.Value }) {
  const { colors, isDark } = useTheme()
  const { width } = useWindowDimensions()
  const reduceMotion = useReduceMotion()
  // Los orbs se calibraron para fondos oscuros; sobre crema/rosa (temas claros)
  // esos acentos saturados a opacidad plena se ven como un manchón pesado y
  // arruinan el logo negro encima → los atenuamos fuerte.
  const dim = isDark ? 1 : 0.35
  // Diferenciador: la aurora "se inclina" hacia el usuario al enfocar un campo
  // (leve escala + brillo). Se apaga con reduce-motion.
  const focusStyle = reduceMotion ? null : {
    opacity: focus.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }),
    transform: [{ scale: focus.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
  }
  return (
    <Animated.View pointerEvents="none" style={[auraStyles.container, focusStyle]}>
      <GlowOrb gid="orbCyan" color={colors.cyan} size={360}
        top={-50} left={-110} driftX={42}
        scaleFrom={0.9} scaleTo={1.32} opFrom={0.35} opTo={0.8} duration={4400} delay={300}
        dim={dim} reduceMotion={reduceMotion} />
      <GlowOrb gid="orbDark" color={colors.accentDark} size={430}
        top={-110} left={width - 270} driftX={38}
        scaleFrom={1} scaleTo={1.28} opFrom={0.4} opTo={0.9} duration={4000} delay={800}
        dim={dim} reduceMotion={reduceMotion} />
      <GlowOrb gid="orbMain" color={colors.accent} size={560}
        top={-210} left={width / 2 - 280} driftX={28}
        scaleFrom={1} scaleTo={1.26} opFrom={0.6} opTo={1} duration={3200} delay={0}
        dim={dim} reduceMotion={reduceMotion} />
      <GlowOrb gid="orbCore" color={colors.accentLight} size={260}
        top={-70} left={width / 2 - 130} driftX={14}
        scaleFrom={0.85} scaleTo={1.38} opFrom={0.4} opTo={0.95} duration={2600} delay={500}
        dim={dim} reduceMotion={reduceMotion} />
    </Animated.View>
  )
}

const auraStyles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, height: 540, overflow: 'hidden' },
})

// ─── Selector de idioma (desplegable con banderas) ─────────────────────────────

function LanguageSelector({ top }: { top: number }) {
  const { colors } = useTheme()
  const { t, lang, setLang } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const [open, setOpen] = useState(false)

  return (
    <>
      <TouchableOpacity
        style={[styles.langBtn, { top }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('login_lang_a11y')}
      >
        <Image source={FLAGS[lang]} style={styles.langFlag} resizeMode="cover" />
        <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
          <Path d="M6 9l6 6 6-6" stroke={colors.inkSecondary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        {/* Capa a pantalla completa: tocar fuera cierra el menú. */}
        <Pressable style={styles.langBackdrop} onPress={() => setOpen(false)}>
          <View style={[styles.langMenu, { top: top + 44 }]}>
            {LANGS.map((l) => {
              const active = l.code === lang
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langItem, active && styles.langItemActive]}
                  onPress={() => { setLang(l.code); setOpen(false) }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={l.label}
                >
                  <Image source={FLAGS[l.code]} style={styles.langFlag} resizeMode="cover" />
                  <Text style={[styles.langItemText, active && styles.langItemTextActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const reduceMotion = useReduceMotion()

  const { initialTab } = useLocalSearchParams<{ initialTab?: string }>()
  const [tab, setTab] = useState<'login' | 'register'>(
    initialTab === 'register' ? 'register' : 'login',
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<View>(null)

  // Mueve el foco de accesibilidad al error al aparecer: sin esto, VoiceOver/
  // TalkBack no anuncian "credenciales incorrectas" y el usuario queda atascado
  // en el botón sin saber qué pasó (mismo patrón que el login web de Academy).
  useEffect(() => {
    if (!error) return
    const node = findNodeHandle(errorRef.current)
    if (node) AccessibilityInfo.setAccessibilityFocus(node)
  }, [error])

  // Entrada escalonada del contenido (fade + subida sutil). Se respeta
  // reduce-motion: si está activo, arranca ya en su posición final.
  const entrance = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (reduceMotion) {
      entrance.setValue(1)
      return
    }
    Animated.timing(entrance, {
      toValue: 1,
      duration: 520,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [entrance, reduceMotion])
  const entranceStyle = {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  }

  // Diferenciador: la aurora reacciona al foco de los campos.
  const auraFocus = useRef(new Animated.Value(0)).current
  const animateAura = (to: number) =>
    Animated.timing(auraFocus, {
      toValue: to, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start()

  // Diferenciador: pastilla deslizante del selector login/registro.
  const [tabsW, setTabsW] = useState(0)
  const tabAnim = useRef(new Animated.Value(tab === 'login' ? 0 : 1)).current
  useEffect(() => {
    const to = tab === 'login' ? 0 : 1
    if (reduceMotion) { tabAnim.setValue(to); return }
    Animated.spring(tabAnim, { toValue: to, useNativeDriver: true, friction: 9, tension: 90 }).start()
  }, [tab, reduceMotion, tabAnim])
  const pillWidth = tabsW > 0 ? (tabsW - 8) / 2 : 0
  const pillX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, pillWidth] })

  // Diferenciador: brillo (sheen) que barre el botón primario en loop lento.
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

  async function handleApple() {
    if (loading || googleLoading || appleLoading) return
    setError('')
    setAppleLoading(true)
    try {
      const res = await appleLogin()
      if (res.status === 'ok') {
        if (res.user?.onboarding_completo) {
          router.replace('/(app)/dashboard')
        } else {
          router.replace('/(auth)/onboarding-intro' as any)
        }
      } else if (res.status === 'cancelled') {
        // El usuario cerró la hoja de Apple: silencioso, sin error.
      } else if (res.status === 'unavailable') {
        setError(t('login_apple_unavailable'))
      } else {
        setError(t('login_apple_error'))
      }
    } finally {
      setAppleLoading(false)
    }
  }

  async function handleGoogle() {
    if (loading || googleLoading || appleLoading) return
    setError('')
    setGoogleLoading(true)
    try {
      const res = await googleLogin()
      if (res.status === 'ok') {
        if (res.user?.onboarding_completo) {
          router.replace('/(app)/dashboard')
        } else {
          // Cuenta nueva (o sin onboarding) → arrancamos el onboarding.
          router.replace('/(auth)/onboarding-intro' as any)
        }
      } else if (res.status === 'cancelled') {
        // El usuario cerró la hoja de Google: silencioso, sin error.
      } else if (res.status === 'unavailable') {
        setError(t('login_google_unavailable'))
      } else {
        setError(t('login_google_error'))
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError(t('login_error_fields'))
      return
    }
    if (tab === 'register' && password.length < 8) {
      setError(t('login_error_password_short'))
      return
    }
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        const user = await login(email.trim(), password)
        if (user?.onboarding_completo) {
          router.replace('/(app)/dashboard')
        } else {
          router.replace('/(auth)/onboarding')
        }
      } else {
        await register(email.trim(), password)
        router.replace('/(auth)/onboarding-intro' as any)
      }
    } catch (e: any) {
      setError(e.message || t('login_error_generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      {/* Animated blue glow / orb aurora behind the top of the screen */}
      <LoginAura focus={auraFocus} />

      {/* Selector de idioma desplegable — arriba a la derecha, fuera del scroll */}
      <LanguageSelector top={insets.top + 16} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={entranceStyle}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <PyFitLogo />
            <Text style={styles.tagline}>{t('login_tagline')}</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab toggle — pastilla activa deslizante detrás de las etiquetas */}
            <View
              style={styles.tabRow}
              onLayout={(e) => setTabsW(e.nativeEvent.layout.width)}
            >
              {pillWidth > 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={[styles.tabPill, { width: pillWidth, transform: [{ translateX: pillX }] }]}
                />
              )}
              <TouchableOpacity
                style={styles.tab}
                onPress={() => { setTab('login'); setError('') }}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'login' }}
              >
                <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                  {t('login_tab_signin')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => { setTab('register'); setError('') }}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'register' }}
              >
                <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                  {t('login_tab_signup')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('login_email_label')}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('login_email_placeholder')}
                placeholderTextColor={colors.inkMuted}
                value={email}
                onChangeText={setEmail}
                onFocus={() => animateAura(1)}
                onBlur={() => animateAura(0)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t('login_email_label')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('login_password_label')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => animateAura(1)}
                  onBlur={() => animateAura(0)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel={t('login_password_label')}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
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
              {tab === 'register' && (
                <Text style={styles.passwordHint}>{t('login_password_hint')}</Text>
              )}
            </View>

            {tab === 'login' && (
              <TouchableOpacity
                style={styles.forgotBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/(auth)/forgot-password' as any)}
                accessibilityRole="button"
                accessibilityLabel={t('login_forgot_password')}
              >
                <Text style={styles.forgotText}>{t('login_forgot_password')}</Text>
              </TouchableOpacity>
            )}

            {/* Error */}
            {!!error && (
              <View
                ref={errorRef}
                style={styles.errorBox}
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
              >
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Primary button */}
            <TouchableOpacity
              style={styles.primaryBtnWrap}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={tab === 'login' ? t('login_btn_signin') : t('login_btn_signup')}
              accessibilityState={{ disabled: loading, busy: loading }}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
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
                  <ActivityIndicator color={readableTextOn(colors.accent)} size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {tab === 'login' ? t('login_btn_signin') : t('login_btn_signup')}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('login_divider')}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <SocialButton icon={<GoogleIcon />} label="Google"
                onPress={handleGoogle} loading={googleLoading} disabled={loading || appleLoading} />
              {Platform.OS === 'ios' && (
                <SocialButton icon={<AppleIcon />} label="Apple"
                  onPress={handleApple} loading={appleLoading} disabled={loading || googleLoading} />
              )}
            </View>

            <Text style={styles.disclaimer}>
              {t('login_terms_prefix')}{' '}
              <Text
                style={styles.disclaimerLink}
                onPress={() => router.push('/(auth)/terminos' as any)}
              >
                {t('login_terms_link')}
              </Text>
              {' '}{t('login_terms_and')}{' '}
              <Text
                style={styles.disclaimerLink}
                onPress={() => router.push('/(auth)/privacidad' as any)}
              >
                {t('login_privacy_link')}
              </Text>
            </Text>
          </View>
          </Animated.View>

          {/* Acceso al portal del entrenador — píldora al fondo de todo */}
          <TouchableOpacity
            style={styles.coachPortalBtn}
            onPress={() => router.push('/(auth)/coach-login' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('login_coach_portal')}
          >
            <View style={styles.coachPortalDot} />
            <Text style={styles.coachPortalText}>{t('login_coach_portal')}</Text>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path d="M9 6l6 6-6 6" stroke={colors.inkSecondary} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flex: {
      flex: 1,
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 400,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 80,
      paddingBottom: 40,
    },

    // Selector de idioma (botón + menú desplegable con banderas)
    langBtn: {
      position: 'absolute',
      right: 20,
      zIndex: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingLeft: 8,
      paddingRight: 10,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderBright,
    },
    langFlag: {
      width: 22,
      height: 15,
      borderRadius: 3,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderBright,
    },
    langBackdrop: {
      flex: 1,
    },
    langMenu: {
      position: 'absolute',
      right: 20,
      minWidth: 172,
      borderRadius: 14,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      paddingVertical: 6,
      // Sombra para separar el menú del fondo animado.
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 14,
    },
    langItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    langItemActive: {
      backgroundColor: c.glassBg,
    },
    langItemText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkSecondary,
    },
    langItemTextActive: {
      color: c.accent,
    },

    // Logo
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoImage: {
      // Wordmark apaisado (ratio ≈ 3.11:1 → 2520×809).
      width: 196,
      height: 63,
      marginBottom: 10,
      // Sombra muy sutil para despegar el wordmark del fondo animado.
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    tagline: {
      // Instrument Serif italic = acento tipográfico de marca (mismo recurso
      // que los títulos destacados de la app), refuerza identidad en el login.
      fontFamily: 'InstrumentSerif-Italic',
      fontSize: 17,
      // Blanco puro con sombra sutil (igual que el logo) para que contraste
      // sobre la aurora clara sin depender del color de tinta del tema.
      color: '#ffffff',
      letterSpacing: 0.2,
      textShadowColor: 'rgba(0,0,0,0.25)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },

    // Card
    card: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 24,
      padding: 24,
    },

    // Tabs
    tabRow: {
      position: 'relative',
      flexDirection: 'row',
      backgroundColor: c.glassBg,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    // Pastilla activa deslizante (detrás de las etiquetas).
    tabPill: {
      position: 'absolute',
      left: 4,
      top: 4,
      bottom: 4,
      backgroundColor: c.accent,
      borderRadius: 9,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 9,
    },
    tabText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkMuted,
    },
    tabTextActive: {
      // Tinta legible según el acento: blanco sobre azul/rosa/neón, oscuro sobre
      // acentos claros (lima Forest, cobre Sand, turquesa Midnight/Ocean).
      color: readableTextOn(c.accent),
    },

    // Inputs
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.inkSecondary,
      letterSpacing: 1.2,
      marginBottom: 8,
    },
    input: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 16,
      color: c.inkPrimary,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
    },

    // Password: input + botón ver/ocultar superpuesto a la derecha.
    passwordRow: {
      position: 'relative',
      justifyContent: 'center',
    },
    passwordInput: {
      paddingRight: 78,
    },
    eyeBtn: {
      position: 'absolute',
      right: 6,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    eyeText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 11,
      color: c.accent,
      letterSpacing: 1,
    },
    passwordHint: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkSecondary,
      marginTop: 8,
    },

    // Forgot
    forgotBtn: {
      alignSelf: 'flex-end',
      marginBottom: 20,
      marginTop: -4,
    },
    forgotText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.accent,
    },

    // Error
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.25)',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    errorText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.red,
    },

    // Primary button
    primaryBtnWrap: {
      borderRadius: 14,
      marginBottom: 20,
      // Glow azul sutil — sin overflow:hidden para que la sombra no se recorte;
      // el redondeo lo aporta el gradiente interno (primaryBtn).
      shadowColor: c.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.55,
      shadowRadius: 15,
      elevation: 12,
    },
    primaryBtn: {
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      // Recorta el sheen que barre el botón (la sombra vive en el wrap, no aquí).
      overflow: 'hidden',
    },
    primaryBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      color: readableTextOn(c.accent),
      letterSpacing: 0.2,
    },
    // Sheen: banda diagonal translúcida que cruza el botón (ancho por inline).
    sheen: {
      position: 'absolute',
      top: -24,
      bottom: -24,
    },
    sheenFill: {
      flex: 1,
    },

    // Divider
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.borderDefault,
    },
    dividerText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkSecondary,
      marginHorizontal: 12,
    },

    // Social
    socialRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    socialBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 13,
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 12,
    },
    socialBtnText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkPrimary,
    },

    // Disclaimer
    disclaimer: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    disclaimerLink: {
      color: c.accent,
      textDecorationLine: 'underline',
    },

    // Acceso al portal del entrenador — píldora con borde (más visible que la
    // línea subrayada anterior). El punto rojo adelanta la identidad del portal.
    coachPortalBtn: {
      alignSelf: 'center',
      marginTop: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingVertical: 11,
      paddingHorizontal: 18,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.borderBright,
      backgroundColor: c.glassBg,
    },
    coachPortalDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: '#E5223F',   // rojo del portal de coach (coachTheme P.purple)
    },
    coachPortalText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 11,
      color: c.inkSecondary,
      letterSpacing: 1.5,
    },
  })
}
