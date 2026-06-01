import { Stack } from 'expo-router'

/**
 * Stack del Perfil.
 *
 * Anidar las sub-pantallas de Perfil en un Stack (en vez de tenerlas sueltas
 * como tabs ocultas) hace que `router.back()` haga un POP real de la pila y
 * SIEMPRE regrese a la pantalla anterior: perfil → mi-cuenta → datos-personales
 * y de vuelta paso a paso. Antes, al ser todas tabs hermanas, "Atrás" saltaba
 * al primer tab (Inicio/dashboard) en lugar de a la pantalla previa.
 *
 * La ruta inicial es `perfil/index` (el archivo index.tsx de esta carpeta).
 * El gesto de swipe-back y la animación nativa funcionan automáticamente.
 */
export default function PerfilStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
