/**
 * Banner "Modo Admin" — renderizado encima del Tabs cuando el usuario es staff.
 *
 * Tres estados:
 *   - Usuario normal: no renderiza nada.
 *   - Staff sin impersonar: muestra "MODO ADMIN — Abrir panel →".
 *   - Staff impersonando: muestra "VIENDO COMO X — VOLVER" con un botón.
 *
 * La detección se hace leyendo el storage local (poblado en login + tras
 * impersonar). No hace fetch en cada render — sólo cuando se le indica.
 */

import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, usePathname } from 'expo-router'
import { getUser } from '../lib/storage'
import { getImpersonating, ImpersonationState, stopImpersonation } from '../lib/admin'

export function AdminBanner() {
  const insets   = useSafeAreaInsets()
  const pathname = usePathname()

  const [isStaff,       setIsStaff]       = useState(false)
  const [impersonating, setImpersonating] = useState<ImpersonationState | null>(null)
  const [stopping,      setStopping]      = useState(false)

  const reload = useCallback(async () => {
    const u   = await getUser()
    const imp = await getImpersonating()
    setIsStaff(!!u?.is_staff)
    setImpersonating(imp)
  }, [])

  // Recargar cuando cambie la ruta — cubre el caso "volví del admin tras
  // empezar/terminar impersonación".
  useEffect(() => { reload() }, [pathname, reload])

  async function handleStop() {
    if (stopping) return
    setStopping(true)
    try {
      await stopImpersonation()
      await reload()
      router.replace('/(app)/dashboard')
    } catch {
      // Mostrar algún feedback sería mejor — por ahora silenciamos para no
      // bloquear al admin si algo va mal con la red.
    } finally {
      setStopping(false)
    }
  }

  function handleOpen() {
    router.push('/(app)/admin' as any)
  }

  // Sin permisos → no se pinta nada.
  if (!isStaff && !impersonating) return null

  // Evita que el banner aparezca dentro de la propia pantalla de admin.
  if (pathname?.startsWith('/(app)/admin') || pathname?.startsWith('/admin')) {
    return null
  }

  const inImpersonation = !!impersonating

  return (
    <View style={[styles.wrap, { paddingTop: insets.top, backgroundColor: inImpersonation ? '#ffaa32' : '#2563ff' }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>
            {inImpersonation ? 'VIENDO COMO' : 'MODO ADMIN'}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {inImpersonation
              ? (impersonating!.nombre || impersonating!.email)
              : 'Panel de administración disponible'}
          </Text>
        </View>

        {inImpersonation ? (
          <TouchableOpacity style={styles.cta} onPress={handleStop} disabled={stopping} activeOpacity={0.75}>
            {stopping
              ? <ActivityIndicator size="small" color="#000" />
              : <Text style={styles.ctaText}>VOLVER</Text>
            }
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cta} onPress={handleOpen} activeOpacity={0.75}>
            <Text style={styles.ctaText}>ABRIR →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: 16,
    paddingVertical:    8,
    gap:                12,
  },
  eyebrow: {
    fontFamily:    'JetBrainsMono-Medium',
    fontSize:       9,
    letterSpacing:  1.4,
    color:          'rgba(0,0,0,0.55)',
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize:   13,
    color:      '#000',
    marginTop:  2,
  },
  cta: {
    backgroundColor: '#000',
    borderRadius:    10,
    paddingHorizontal: 12,
    paddingVertical:   8,
    minWidth:          80,
    alignItems:        'center',
  },
  ctaText: {
    fontFamily:    'JetBrainsMono-Medium',
    fontSize:       11,
    letterSpacing:  1,
    color:          '#fff',
  },
})
