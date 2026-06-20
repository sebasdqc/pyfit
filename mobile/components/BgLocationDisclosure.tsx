/**
 * BgLocationDisclosure.tsx — Aviso prominente de ubicación en segundo plano.
 *
 * Google Play exige mostrar una "prominent disclosure" IN-APP, con diseño claro
 * y ANTES de solicitar el permiso ACCESS_BACKGROUND_LOCATION. Debe explicar:
 *   1. Qué dato se recopila (ubicación / GPS preciso).
 *   2. Qué función lo usa y con qué fin.
 *   3. Que se recopila también con la app en segundo plano / pantalla apagada.
 *   4. Que es opcional y revocable.
 *
 * Esta pantalla cubre los cuatro puntos de forma explícita. Sustituye al
 * `Alert.alert` previo: mismo flujo (aceptar → persistir consentimiento →
 * arrancar la carrera; rechazar → no arrancar) pero con la identidad visual de
 * Zyfit, más robusta ante revisores estrictos de la tienda.
 */

import React from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../lib/theme'
import { Colors, RADII } from '../lib/colors'

interface Props {
  visible: boolean
  onAccept: () => void
  onDismiss: () => void
}

// Cada fila refuerza uno de los puntos que la política de Google exige declarar.
const ROWS = [
  {
    icon: '📍',
    title: 'Qué recopilamos',
    body: 'Tu ubicación precisa (GPS), únicamente mientras tienes una carrera activa.',
  },
  {
    icon: '🛰️',
    title: 'Para qué',
    body: 'Trazar tu recorrido y calcular distancia, ritmo y desnivel. Seguimos registrando aunque cambies de app o apagues la pantalla.',
  },
  {
    icon: '🔒',
    title: 'Tu control',
    body: 'Es opcional y puedes revocarlo cuando quieras desde los ajustes del sistema. No compartimos tu ubicación con terceros.',
  },
] as const

export function BgLocationDisclosure({ visible, onAccept, onDismiss }: Props) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const s = makeStyles(colors)

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <Pressable style={s.overlay} onPress={onDismiss}>
        {/* El sheet detiene la propagación del tap para no cerrarse al tocarlo. */}
        <Pressable style={[s.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          {/* Glow de acento sutil detrás de la cabecera */}
          <LinearGradient
            colors={[colors.accent + '22', 'transparent']}
            style={s.glow}
            pointerEvents="none"
          />

          <View style={s.handle} />

          {/* Icono en círculo */}
          <View style={s.iconCircle}>
            <Text style={s.iconText}>📍</Text>
          </View>

          <Text style={s.eyebrow}>PERMISO DE UBICACIÓN</Text>
          <Text style={s.title}>
            Ubicación en <Text style={s.titleAccent}>segundo plano</Text>
          </Text>
          <Text style={s.intro}>
            Para registrar tu carrera completa, Zyfit necesita acceder a tu ubicación. Así funciona:
          </Text>

          {/* Filas de detalle */}
          <View style={s.rows}>
            {ROWS.map(row => (
              <View key={row.title} style={s.row}>
                <View style={s.rowIcon}>
                  <Text style={s.rowIconText}>{row.icon}</Text>
                </View>
                <View style={s.rowTextWrap}>
                  <Text style={s.rowTitle}>{row.title}</Text>
                  <Text style={s.rowBody}>{row.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Botones */}
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.accent }]}
            onPress={onAccept}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>Continuar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={s.secondaryBtnText}>Ahora no</Text>
          </TouchableOpacity>

          <Text style={s.footnote}>
            Consulta más detalles en nuestra Política de Privacidad.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.sheetBg,
      borderTopLeftRadius: RADII.xl,
      borderTopRightRadius: RADII.xl,
      borderTopWidth: 1,
      borderColor: c.borderBright,
      paddingTop: 12,
      paddingHorizontal: 24,
      overflow: 'hidden',
    },
    glow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 160,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: RADII.pill,
      backgroundColor: c.borderBright,
      marginBottom: 20,
    },
    iconCircle: {
      alignSelf: 'center',
      width: 64,
      height: 64,
      borderRadius: RADII.pill,
      backgroundColor: c.accent + '1A',
      borderWidth: 1,
      borderColor: c.accent + '40',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    iconText: {
      fontSize: 30,
    },
    eyebrow: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 10,
      letterSpacing: 2,
      color: c.inkMuted,
      textTransform: 'uppercase',
      textAlign: 'center',
      marginBottom: 8,
    },
    title: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      letterSpacing: -0.8,
      color: c.inkPrimary,
      textAlign: 'center',
    },
    titleAccent: {
      fontFamily: 'InstrumentSerif-Italic',
      fontStyle: 'italic',
      color: c.accent,
      fontSize: 28,
    },
    intro: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      lineHeight: 21,
      color: c.inkSecondary,
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 24,
    },
    rows: {
      gap: 16,
      marginBottom: 28,
    },
    row: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'flex-start',
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: RADII.sm,
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconText: {
      fontSize: 18,
    },
    rowTextWrap: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      letterSpacing: -0.2,
      color: c.inkPrimary,
    },
    rowBody: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      lineHeight: 19,
      color: c.inkSecondary,
    },
    primaryBtn: {
      borderRadius: RADII.pill,
      paddingVertical: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      letterSpacing: 0.5,
      color: '#ffffff',
    },
    secondaryBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    secondaryBtnText: {
      fontFamily: 'JetBrainsMono-Medium',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: c.inkMuted,
    },
    footnote: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 11,
      lineHeight: 16,
      color: c.inkMuted,
      textAlign: 'center',
      marginTop: 12,
    },
  })
}
