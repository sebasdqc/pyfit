import React, { useEffect, useRef } from 'react'
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS, Colors } from '../../lib/colors'
import { useTheme } from '../../lib/theme'
import { useTranslation } from '../../lib/i18n'

const ADVANCE_DELAY = 2800

export default function IntroScreen() {
  const { colors, isDark } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoY = useRef(new Animated.Value(16)).current
  const taglineOpacity = useRef(new Animated.Value(0)).current
  const taglineY = useRef(new Animated.Value(12)).current
  const dotOpacity = useRef(new Animated.Value(0)).current
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goToLogin = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    router.replace('/(auth)/login')
  }

  useEffect(() => {
    // Logo animates in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(logoY, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Tagline animates in after logo
    Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 700,
        delay: 700,
        useNativeDriver: true,
      }),
      Animated.timing(taglineY, {
        toValue: 0,
        duration: 600,
        delay: 700,
        useNativeDriver: true,
      }),
    ]).start()

    // Hint dot appears last
    Animated.timing(dotOpacity, {
      toValue: 0.5,
      duration: 500,
      delay: 1400,
      useNativeDriver: true,
    }).start()

    timerRef.current = setTimeout(goToLogin, ADVANCE_DELAY)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <TouchableOpacity
      style={styles.root}
      onPress={goToLogin}
      activeOpacity={1}
    >
      {/* Background glow */}
      <LinearGradient
        colors={['rgba(37,99,255,0.35)', 'rgba(37,99,255,0.08)', 'transparent']}
        style={styles.gradientTop}
      />
      <LinearGradient
        colors={['transparent', 'rgba(37,99,255,0.12)']}
        style={styles.gradientBottom}
      />

      {/* Center content */}
      <View style={styles.center}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ translateY: logoY }] }}>
          <Image
            source={isDark
              ? require('../../assets/Logo-Zyfit-Blanco.png')
              : require('../../assets/Logo-Zyfit-negro.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={{ opacity: taglineOpacity, transform: [{ translateY: taglineY }] }}>
          <Text style={styles.tagline}>
            {t('intro_tagline')}
          </Text>
        </Animated.View>
      </View>

      {/* Tap hint */}
      <Animated.View style={[styles.hintRow, { opacity: dotOpacity }]}>
        <View style={styles.dot} />
        <View style={[styles.dot, { opacity: 0.6 }]} />
        <View style={[styles.dot, { opacity: 0.3 }]} />
      </Animated.View>
    </TouchableOpacity>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gradientTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '55%',
    },
    gradientBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '30%',
    },
    center: {
      alignItems: 'center',
      gap: 20,
      paddingHorizontal: 32,
    },
    logo: {
      // Wordmark apaisado (ratio ≈ 3.11:1 → 2520×809).
      width: 268,
      height: 86,
    },
    tagline: {
      fontFamily: 'InstrumentSerif-Italic',
      fontSize: 22,
      color: c.inkSecondary,
      textAlign: 'center',
      lineHeight: 32,
      letterSpacing: 0.2,
    },
    hintRow: {
      position: 'absolute',
      bottom: 56,
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.inkMuted,
    },
  })
}
