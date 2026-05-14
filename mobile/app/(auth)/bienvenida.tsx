import React, { useEffect, useRef } from 'react'
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS, Colors } from '../../lib/colors'
import { useTheme } from '../../lib/theme'

export default function BienvenidaBetaScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(24)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(37,99,255,0.3)', 'rgba(37,99,255,0.05)', 'transparent']}
        style={styles.gradient}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

          {/* Beta badge */}
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeDot}>✦</Text>
              <Text style={styles.badgeText}>BETA TESTER</Text>
              <Text style={styles.badgeDot}>✦</Text>
            </View>
          </View>

          {/* Hero */}
          <Text style={styles.heroEmoji}>🚀</Text>

          <Text style={styles.title}>
            Felicidades,{'\n'}
            <Text style={styles.titleAccent}>eres Beta Tester</Text>
            {'\n'}de Zyfit.
          </Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Message */}
          <Text style={styles.body}>
            Tienes todo a tu disposición — nuestra tecnología de entrenamiento adaptativo, la IA que aprende de cada sesión, y cada función que hemos construido.
          </Text>

          <Text style={styles.body}>
            A cambio de algo muy importante:{' '}
            <Text style={styles.bodyAccent}>tu feedback.</Text>
          </Text>

          <Text style={styles.body}>
            Usa todo lo que necesites y coméntanos cualquier novedad. Tu experiencia construye el producto.
          </Text>

          {/* Perks card */}
          <View style={styles.perksCard}>
            <PerkRow icon="⚡" text="Acceso completo sin restricciones" styles={styles} />
            <PerkRow icon="🧠" text="IA adaptativa desde tu primera sesión" styles={styles} />
            <PerkRow icon="🔒" text="Tus datos, siempre privados" styles={styles} />
            <PerkRow icon="💬" text="Línea directa con el equipo de Zyfit" styles={styles} />
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.replace('/(app)/dashboard')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.accentDark, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.btnText}>Empezar →</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footer}>Gracias por confiar en nosotros desde el primer día.</Text>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

function PerkRow({ icon, text, styles }: { icon: string; text: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.perkRow}>
      <Text style={styles.perkIcon}>{icon}</Text>
      <Text style={styles.perkText}>{text}</Text>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 500,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 80,
      paddingBottom: 48,
    },
    inner: {
      gap: 20,
    },

    // Badge
    badgeRow: {
      alignItems: 'flex-start',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: c.accent + '60',
      borderRadius: 100,
      paddingVertical: 5,
      paddingHorizontal: 12,
      backgroundColor: c.accent + '12',
    },
    badgeDot: {
      fontSize: 8,
      color: c.accent,
    },
    badgeText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 10,
      color: c.accent,
      letterSpacing: 2,
    },

    // Hero
    heroEmoji: {
      fontSize: 52,
      marginTop: 8,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 34,
      color: c.inkPrimary,
      letterSpacing: -0.8,
      lineHeight: 42,
    },
    titleAccent: {
      color: c.accent,
    },

    // Divider
    divider: {
      height: 1,
      backgroundColor: c.borderDefault,
      marginVertical: 4,
    },

    // Body
    body: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 16,
      color: c.inkSecondary,
      lineHeight: 26,
    },
    bodyAccent: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      color: c.inkPrimary,
    },

    // Perks card
    perksCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 20,
      gap: 14,
      marginTop: 4,
    },
    perkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    perkIcon: {
      fontSize: 18,
      width: 26,
      textAlign: 'center',
    },
    perkText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkSecondary,
      flex: 1,
    },

    // Button
    btn: {
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 8,
    },
    btnGradient: {
      paddingVertical: 18,
      alignItems: 'center',
    },
    btnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 17,
      color: '#fff',
      letterSpacing: -0.2,
    },

    // Footer
    footer: {
      fontFamily: 'InstrumentSerif-Italic',
      fontSize: 14,
      color: c.inkMuted,
      textAlign: 'center',
      marginTop: 4,
    },
  })
}
