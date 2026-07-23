import React, { useState } from 'react'
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiPost } from '../../../lib/api'

const MAX_LEN = 2000

export default function ReportarContenidoScreen() {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleEnviar() {
    const texto = mensaje.trim()
    if (!texto) return
    setEnviando(true)
    try {
      await apiPost('/api/reportar-contenido/', { mensaje: texto })
      Alert.alert(
        'Gracias por avisarnos',
        'Revisaremos el contenido que reportaste.',
        [{ text: 'OK', onPress: () => router.back() }],
      )
    } catch (e: any) {
      Alert.alert('No se pudo enviar', e?.message || 'Intenta de nuevo en unos minutos.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient colors={[colors.gradientTop, 'transparent']}
          style={StyleSheet.absoluteFill} pointerEvents="none" />

        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel="Volver">
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reportar contenido</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Las rutinas, sesiones de running y el chat de Zyfit se generan con IA. Si viste algo
            inapropiado, incorrecto o contraindicado, contanos qué pasó y en qué sesión — lo revisamos
            manualmente.
          </Text>

          <TextInput
            style={styles.textarea}
            value={mensaje}
            onChangeText={t => setMensaje(t.slice(0, MAX_LEN))}
            placeholder="Ej: la rutina del 20/07 me sugirió sentadilla con salto a pesar de que marqué dolor de rodilla activo."
            placeholderTextColor={colors.inkFaint}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            accessibilityLabel="Descripción del contenido a reportar"
          />
          <Text style={styles.counter}>{mensaje.length}/{MAX_LEN}</Text>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.accent, opacity: mensaje.trim() && !enviando ? 1 : 0.5 }]}
            onPress={handleEnviar}
            disabled={!mensaje.trim() || enviando}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Enviar reporte"
          >
            {enviando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitBtnTxt}>Enviar reporte</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
    intro: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13,
      lineHeight: 20, marginBottom: 20,
    },
    textarea: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, padding: 16, minHeight: 160,
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, lineHeight: 20,
    },
    counter: {
      color: c.inkFaint, fontFamily: 'JetBrainsMono-Regular', fontSize: 10,
      textAlign: 'right', marginTop: 6, marginBottom: 20,
    },
    submitBtn: {
      height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    },
    submitBtnTxt: { color: '#fff', fontFamily: 'SpaceGrotesk-Bold', fontSize: 15 },
  })
}
