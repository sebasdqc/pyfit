import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { P, iniciales } from '../../lib/coachTheme'
import { getCoachUser, clearCoachSession } from '../../lib/storage'

export default function CoachAjustes() {
  const insets = useSafeAreaInsets()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    getCoachUser().then(setUser)
  }, [])

  async function handleLogout() {
    await clearCoachSession()
    router.replace('/(auth)/login')
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      {/* Identidad del coach */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{iniciales(user?.nombre)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.nombre} numberOfLines={1}>{user?.nombre || 'Coach'}</Text>
          {!!user?.email && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
        </View>
      </View>

      <Text style={styles.soon}>Más opciones del portal · próximamente</Text>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        style={[styles.logoutBtn, { marginBottom: insets.bottom + 8 }]}
        activeOpacity={0.8}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: P.badgeBg,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 18, color: P.purpleMid },
  nombre: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 20, color: P.ink, letterSpacing: -0.3 },
  email: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.purpleFaint, marginTop: 2 },
  soon: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
    color: P.purpleFaint,
    letterSpacing: 0.4,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,92,92,0.35)',
    backgroundColor: 'rgba(255,92,92,0.10)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.red },
})
