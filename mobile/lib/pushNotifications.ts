import * as Notifications from 'expo-notifications'
import { Alert, Platform } from 'react-native'
import Constants from 'expo-constants'
import { apiPost } from './api'
import type { ScalarKey } from './i18n'

// Configure how notifications are presented while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

// Muestra una explicación breve ANTES del diálogo del sistema — solo la
// primera vez (permiso 'undetermined' = nunca se le preguntó al usuario).
// No sustituye el diálogo del sistema, va antes, mismo patrón que
// BgLocationDisclosure para la ubicación en segundo plano.
function showNotificationContext(t?: (key: ScalarKey) => string): Promise<void> {
  return new Promise(resolve => {
    Alert.alert(
      t ? t('notif_context_title') : 'Activá las notificaciones',
      t ? t('notif_context_body') : 'Te avisamos cuando tu coach te escriba y con recordatorios para no perder la racha de entrenamiento.',
      [{ text: t ? t('notif_context_continue') : 'Continuar', onPress: () => resolve() }],
      { cancelable: false },
    )
  })
}

export async function registerForPushNotifications(t?: (key: ScalarKey) => string): Promise<string | null> {
  if (Platform.OS === 'web') return null

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing === 'undetermined') {
    await showNotificationContext(t)
  }

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Zyfit',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4f8cff',
    })
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId ??
      'bc0530b3-44d7-42e6-9ae7-74148801fa88'

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data

    // Fire-and-forget: persist token on backend so the server can push later
    apiPost('/api/profile/push-token/', { token }).catch(() => {})

    return token
  } catch {
    return null
  }
}
