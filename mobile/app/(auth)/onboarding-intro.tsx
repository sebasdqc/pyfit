import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useTheme } from '../../lib/theme'
import { Colors } from '../../lib/colors'

export default function OnboardingIntroScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={styles.gradient}
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>ANTES DE EMPEZAR</Text>

        <Text style={styles.message}>
          En los próximos minutos vamos a hacerte preguntas que{' '}
          <Text style={styles.messageAccent}>ninguna app te ha hecho.</Text>
          {'\n\n'}
          Son nuestra materia prima para crear lo mejor para ti.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnWrap}
          onPress={() => router.replace('/(auth)/onboarding')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>EMPECEMOS</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    eyebrow: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 11,
      color: c.accent,
      letterSpacing: 2,
      marginBottom: 28,
    },
    message: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 26,
      color: c.inkPrimary,
      lineHeight: 38,
      letterSpacing: -0.3,
    },
    messageAccent: {
      fontFamily: 'SpaceGrotesk-Bold',
      color: c.inkPrimary,
    },
    footer: {
      paddingHorizontal: 32,
      paddingBottom: 52,
    },
    btnWrap: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    btn: {
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      color: '#ffffff',
      letterSpacing: 2,
    },
  })
}
