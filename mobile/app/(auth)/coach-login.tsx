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
  Linking,
  ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path, Rect } from 'react-native-svg'
import { coachLogin } from '../../lib/auth'

// ─── Identidad morada del portal de entrenador ─────────────────────────────────
// Pantalla independiente con su propia paleta púrpura. NO usa el tema del atleta
// (que cambia entre dark/light/midnight/etc.) — el portal del coach se ve igual
// siempre, con su matiz azul-morado profundo característico.
const P = {
  bg: '#0A0816',              // fondo general — azul-morado muy profundo, casi negro
  cardBg: '#15102C',          // card de beneficios — algo más clara que el fondo
  inputBg: '#120E26',         // fondo de inputs — oscuro azul-morado
  badgeBg: '#1B1340',         // badge — morado muy oscuro
  border: 'rgba(150,128,255,0.18)',     // borde morado sutil
  borderBright: 'rgba(150,128,255,0.30)',
  divider: 'rgba(150,128,255,0.12)',    // líneas finas moradas muy apagadas
  purple: '#7C5CFF',          // morado sólido (botón, dots, logo)
  purpleDark: '#5B3FD9',
  purpleMid: '#A78BFA',       // morado medio (logo, títulos)
  purpleSoft: '#9484C9',      // morado apagado (texto secundario, links)
  purpleFaint: '#605489',     // morado muy apagado (subtítulo, placeholder, pie)
  ink: '#E7E1FF',             // texto claro al escribir
  white: '#F5F2FF',
}

const CONTACT_URL = 'mailto:hola@pyfit.app?subject=Quiero%20ser%20coach%20en%20Zyfit'

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

// ─── Pantalla ─────────────────────────────────────────────────────────────────

const BENEFICIOS = [
  'Pro incluido para tus atletas',
  'Rutinas generadas con IA',
  'Dashboard de rendimiento',
  'Historial detallado',
]

export default function CoachLoginScreen() {
  const insets = useSafeAreaInsets()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAccess() {
    if (!email.trim() || !password.trim()) {
      setMessage('Ingresa tu correo y contraseña para continuar.')
      return
    }
    setMessage('')
    setLoading(true)
    const res = await coachLogin(email.trim().toLowerCase(), password)
    setLoading(false)

    if (res.status === 'invalid') {
      setMessage('Correo o contraseña incorrectos.')
      return
    }
    if (res.status === 'error') {
      setMessage('No pudimos conectar. Verifica tu red e intenta de nuevo.')
      return
    }
    if (res.status === 'ok') {
      // El portal del coach aún no tiene pantallas propias; confirmamos el
      // acceso. Cuando exista el dashboard de coach, navegar aquí.
      setMessage('Acceso concedido. Estamos preparando tu portal de entrenador.')
      return
    }
    // pending → la cuenta no es un coach con acceso activado
    setMessage(
      'Tu acceso está pendiente de activación. Si ya nos contactaste, te escribiremos pronto.',
    )
  }

  return (
    <View style={styles.root}>
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
          {/* Badge superior */}
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Portal de entrenador</Text>
          </View>

          {/* Logo + subtítulo */}
          <View style={styles.logoBlock}>
            <Image
              source={require('../../Logo-Zyfit-Blanco.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Tu portal inteligente de entrenamientos</Text>
          </View>

          {/* Campos */}
          <View style={styles.inputRow}>
            <EnvelopeIcon />
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor={P.purpleFaint}
              value={email}
              onChangeText={(t) => { setEmail(t); setMessage('') }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputRow}>
            <LockIcon />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={P.purpleFaint}
              value={password}
              onChangeText={(t) => { setPassword(t); setMessage('') }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Olvidaste tu contraseña */}
          <TouchableOpacity
            style={styles.forgotBtn}
            activeOpacity={0.6}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
          >
            <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón de acceso */}
          <TouchableOpacity
            style={styles.accessBtn}
            activeOpacity={0.85}
            onPress={handleAccess}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={P.white} size="small" />
            ) : (
              <Text style={styles.accessBtnText}>Acceder al portal</Text>
            )}
          </TouchableOpacity>

          {/* Mensaje inline (no popup) */}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {/* Separador "¿aún no eres coach?" */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>¿aún no eres coach?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Card de beneficios */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>Lleva tu cartera al siguiente nivel</Text>

            {BENEFICIOS.map((b) => (
              <View key={b} style={styles.benefitRow}>
                <View style={styles.benefitDot} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}

            <View style={styles.benefitsDivider} />
            <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL(CONTACT_URL)}>
              <Text style={styles.contactLink}>Contáctanos para conocer más →</Text>
            </TouchableOpacity>
          </View>

          {/* Volver al login del atleta */}
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.6}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          >
            <Text style={styles.backText}>← Volver al login</Text>
          </TouchableOpacity>
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
    color: P.purpleFaint,
    letterSpacing: 0.2,
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

  // Botón de acceso
  accessBtn: {
    backgroundColor: P.purple,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
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
