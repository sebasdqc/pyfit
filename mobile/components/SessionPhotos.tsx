import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'

import { useTheme } from '../lib/theme'
import { uploadSessionPhoto, deleteSessionPhoto, type SessionPhoto } from '../lib/photosApi'

const THUMB = 84

// Galería de fotos de una sesión. `editable` muestra el botón de agregar y el "×"
// de borrar; en modo lectura (historial) solo muestra las miniaturas. Reutiliza el
// patrón del avatar (perfil): galería → comprime con ImageManipulator → base64.
export default function SessionPhotos({
  kind,
  sessionId,
  initialPhotos = [],
  editable = true,
  max = 6,
}: {
  kind: 'gym' | 'run'
  sessionId: number
  initialPhotos?: SessionPhoto[]
  editable?: boolean
  max?: number
}) {
  const { colors } = useTheme()
  const [photos, setPhotos] = useState<SessionPhoto[]>(initialPhotos)
  const [busy, setBusy] = useState(false)

  // En modo lectura (historial), las fotos llegan async tras el fetch del detalle:
  // sincronizar el estado con initialPhotos. En modo editable no se pisa lo subido.
  useEffect(() => {
    if (!editable) setPhotos(initialPhotos)
  }, [initialPhotos, editable])

  async function pickAndUpload() {
    if (busy || photos.length >= max) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (perm.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para agregar fotos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    })
    if (result.canceled || !result.assets?.[0]) return
    try {
      setBusy(true)
      // Comprime/redimensiona en el dispositivo para que el payload base64 sea chico.
      const manip = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
      )
      if (!manip.base64) throw new Error('No se pudo procesar la imagen.')
      const photo = await uploadSessionPhoto(kind, sessionId, `data:image/jpeg;base64,${manip.base64}`)
      setPhotos(prev => [...prev, photo])
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo subir la foto.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: number) {
    const prev = photos
    setPhotos(p => p.filter(x => x.id !== id))   // optimista
    try {
      await deleteSessionPhoto(id)
    } catch {
      setPhotos(prev)
      Alert.alert('Error', 'No se pudo borrar la foto.')
    }
  }

  // En modo lectura sin fotos, no renderizar nada.
  if (!editable && photos.length === 0) return null

  return (
    <View style={{ marginTop: 8 }}>
      <Text style={[s.title, { color: colors.inkMuted }]}>FOTOS DE LA SESIÓN</Text>
      <View style={s.grid}>
        {photos.map(p => (
          <View key={p.id} style={{ width: THUMB, height: THUMB }}>
            <Image
              source={{ uri: p.url ?? undefined }}
              style={{ width: THUMB, height: THUMB, borderRadius: 12, backgroundColor: colors.glassBg }}
              contentFit="cover"
              transition={150}
            />
            {editable && (
              <TouchableOpacity
                onPress={() => remove(p.id)}
                style={[s.removeBtn, { backgroundColor: colors.bg, borderColor: colors.borderBright }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={{ color: colors.inkPrimary, fontSize: 14, lineHeight: 16 }}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {editable && photos.length < max && (
          <TouchableOpacity
            onPress={pickAndUpload}
            disabled={busy}
            activeOpacity={0.7}
            style={[s.addTile, { borderColor: colors.borderBright, backgroundColor: colors.glassBg }]}>
            {busy
              ? <ActivityIndicator color={colors.accent} />
              : <Text style={{ color: colors.inkSecondary, fontSize: 26, lineHeight: 28 }}>+</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  title: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  removeBtn: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  addTile: {
    width: THUMB, height: THUMB, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
})
