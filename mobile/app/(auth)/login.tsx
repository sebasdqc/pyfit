import React, { useState } from 'react'
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
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import Svg, { Path, Rect } from 'react-native-svg'
import { COLORS } from '../../lib/colors'
import { Colors } from '../../lib/colors'
import { useTheme } from '../../lib/theme'
import { login, register } from '../../lib/auth'

// ─── Logo ────────────────────────────────────────────────────────────────────

function PyFitLogo() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <Image
      source={require('../../Logo-Zyfit-Blanco.png')}
      style={styles.logoImage}
      resizeMode="contain"
    />
  )
}

// ─── Social button ────────────────────────────────────────────────────────────

function SocialButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
      {icon}
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.')
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
      setError(e.message || 'Ocurrió un error. Intenta de nuevo.')
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <PyFitLogo />
            <Text style={styles.tagline}>Entrenamiento adaptativo con IA</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab toggle */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, tab === 'login' && styles.tabActive]}
                onPress={() => { setTab('login'); setError('') }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === 'login' && styles.tabTextActive]}>
                  Iniciar sesión
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'register' && styles.tabActive]}
                onPress={() => { setTab('register'); setError('') }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, tab === 'register' && styles.tabTextActive]}>
                  Registrarse
                </Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CORREO ELECTRÓNICO</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={colors.inkMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTRASEÑA</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.inkMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {tab === 'login' && (
              <TouchableOpacity
                style={styles.forgotBtn}
                activeOpacity={0.7}
                onPress={() => router.push('/(auth)/forgot-password' as any)}
              >
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}

            {/* Error */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Primary button */}
            <TouchableOpacity
              style={styles.primaryBtnWrap}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <SocialButton icon={<GoogleIcon />} label="Google" />
              <SocialButton icon={<AppleIcon />} label="Apple" />
            </View>

            <Text style={styles.disclaimer}>
              Al continuar, aceptas los{' '}
              <Text
                style={styles.disclaimerLink}
                onPress={() => router.push('/(auth)/terminos' as any)}
              >
                Términos de servicio
              </Text>
              {' '}y la{' '}
              <Text
                style={styles.disclaimerLink}
                onPress={() => router.push('/(auth)/privacidad' as any)}
              >
                Política de privacidad
              </Text>
            </Text>
          </View>
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

    // Logo
    logoContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoImage: {
      width: 180,
      height: 60,
      marginBottom: 8,
    },
    tagline: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkMuted,
      letterSpacing: 0.2,
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
      flexDirection: 'row',
      backgroundColor: c.glassBg,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 9,
    },
    tabActive: {
      backgroundColor: c.accent,
    },
    tabText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkMuted,
    },
    tabTextActive: {
      color: c.white,
    },

    // Inputs
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
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

    // Forgot
    forgotBtn: {
      alignSelf: 'flex-end',
      marginBottom: 20,
      marginTop: -4,
    },
    forgotText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.accentLight,
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
      overflow: 'hidden',
      marginBottom: 20,
    },
    primaryBtn: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      color: c.white,
      letterSpacing: 0.2,
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
      color: c.inkMuted,
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
      fontSize: 11,
      color: c.inkMuted,
      textAlign: 'center',
      lineHeight: 16,
    },
    disclaimerLink: {
      color: c.accentLight,
    },
  })
}
