import * as SecureStore from 'expo-secure-store'

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync('access_token', access)
  await SecureStore.setItemAsync('refresh_token', refresh)
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token')
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync('refresh_token')
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('access_token')
  await SecureStore.deleteItemAsync('refresh_token')
}

export async function saveUser(user: object) {
  await SecureStore.setItemAsync('user_data', JSON.stringify(user))
}

export async function getUser(): Promise<any | null> {
  const raw = await SecureStore.getItemAsync('user_data')
  return raw ? JSON.parse(raw) : null
}

export async function clearUser() {
  await SecureStore.deleteItemAsync('user_data')
}
