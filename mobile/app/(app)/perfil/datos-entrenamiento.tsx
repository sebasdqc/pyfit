/**
 * DATOS DE ENTRENAMIENTO — sub-menú del Perfil.
 *
 * Agrupa Objetivos, Ubicaciones, Preferencias, Datos de entrenamiento y
 * Lesiones. Carga perfil + lesiones sólo para los subtítulos/badges; la
 * navegación a cada pantalla funciona igual aunque el fetch falle.
 */
import React, { useCallback, useState } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { apiGet } from '../../../lib/api'
import { useTranslation } from '../../../lib/i18n'
import { MenuScreen, MenuRow } from '../../../components/ProfileMenu'

function nivelLabel(nivel: string) {
  return ({ rookie: 'Rookie', atleta: 'Atleta', elite: 'Élite', leyenda: 'Leyenda' } as any)[nivel?.toLowerCase()] ?? nivel ?? 'Rookie'
}

function capitalizeFirst(s: string) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function DatosEntrenamientoScreen() {
  const { t, lang } = useTranslation()
  const [profile, setProfile] = useState<any>(null)
  const [activeInjuries, setActiveInjuries] = useState(0)

  useFocusEffect(useCallback(() => {
    Promise.allSettled([apiGet('/api/profile/'), apiGet('/api/injuries/')]).then(([p, inj]) => {
      if (p.status === 'fulfilled') setProfile(p.value)
      if (inj.status === 'fulfilled') {
        setActiveInjuries((inj.value as any[]).filter((i: any) => i.activa).length)
      }
    })
  }, []))

  const subObjetivos = profile?.objetivos_multiples?.[0] || profile?.objetivo || undefined
  const subUbicaciones = profile?.locations?.length > 0
    ? `${profile.locations.length} ${lang === 'es'
        ? (profile.locations.length === 1 ? 'ubicación' : 'ubicaciones')
        : (profile.locations.length === 1 ? 'location' : 'locations')}`
    : undefined
  const subPreferencias = profile?.estilo_entrenamiento ? capitalizeFirst(profile.estilo_entrenamiento) : undefined
  const subEntrenamiento = profile?.nivel ? nivelLabel(profile.nivel) : undefined
  const badgeLesiones = activeInjuries > 0
    ? `${activeInjuries} ${activeInjuries === 1 ? 'activa' : 'activas'}`
    : undefined

  return (
    <MenuScreen title={t('perfil_section_training')}>
      <MenuRow
        icon="🎯"
        title={t('perfil_row_objectives')}
        subtitle={subObjetivos}
        onPress={() => router.push('/(app)/perfil/objetivos' as any)}
      />
      <MenuRow
        icon="📍"
        title={t('perfil_row_locations')}
        subtitle={subUbicaciones}
        onPress={() => router.push('/(app)/perfil/ubicaciones' as any)}
      />
      <MenuRow
        icon="⚡"
        title={t('perfil_row_preferences')}
        subtitle={subPreferencias}
        onPress={() => router.push('/(app)/perfil/preferencias' as any)}
      />
      <MenuRow
        icon="🏋️"
        title={t('perfil_row_training')}
        subtitle={subEntrenamiento}
        onPress={() => router.push('/(app)/perfil/entrenamiento' as any)}
      />
      <MenuRow
        icon="🩹"
        title={t('perfil_row_injuries')}
        badge={badgeLesiones}
        onPress={() => router.push('/(app)/perfil/lesiones' as any)}
      />
    </MenuScreen>
  )
}
