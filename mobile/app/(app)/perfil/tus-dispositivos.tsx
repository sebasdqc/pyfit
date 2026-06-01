/**
 * TUS DISPOSITIVOS — sub-menú del Perfil.
 *
 * Por ahora una sola opción: conectar wearables (abre la pantalla `dispositivos`
 * con Apple Health / Garmin). Se mantiene como sección para futuras opciones.
 */
import React from 'react'
import { router } from 'expo-router'
import { useTranslation } from '../../../lib/i18n'
import { MenuScreen, MenuRow } from '../../../components/ProfileMenu'

export default function TusDispositivosScreen() {
  const { t } = useTranslation()
  return (
    <MenuScreen title={t('perfil_section_devices')}>
      <MenuRow
        icon="⌚"
        title={t('perfil_row_devices')}
        subtitle={t('perfil_row_devices_sub')}
        onPress={() => router.push('/(app)/perfil/dispositivos' as any)}
      />
    </MenuScreen>
  )
}
