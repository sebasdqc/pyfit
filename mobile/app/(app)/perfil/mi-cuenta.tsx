/**
 * MI CUENTA — sub-menú del Perfil.
 *
 * Reúne las opciones de cuenta: Seguridad y, si aplica, Ciclo menstrual.
 * ("Datos personales" ya está directo en Ajustes, no se repite acá.) Carga el
 * perfil sólo para los subtítulos/badges informativos; la navegación funciona
 * igual aunque el fetch falle.
 */
import React, { useCallback, useState } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { apiGet } from '../../../lib/api'
import { useTranslation } from '../../../lib/i18n'
import { MenuScreen, MenuRow } from '../../../components/ProfileMenu'

export default function MiCuentaScreen() {
  const { t } = useTranslation()
  const [sexo, setSexo] = useState('')
  const [usaCiclo, setUsaCiclo] = useState(false)

  useFocusEffect(useCallback(() => {
    apiGet('/api/profile/').then((d: any) => {
      setSexo(d.sexo ?? '')
      setUsaCiclo(!!d.usa_ciclo_menstrual)
    }).catch(() => { /* navegación sigue funcionando sin subtítulos */ })
  }, []))

  const badgeCiclo = usaCiclo ? t('mic_cycle_active') : t('mic_cycle_configure')

  return (
    <MenuScreen title={t('perfil_section_account')}>
      <MenuRow
        icon="🔒"
        title={t('mic_security')}
        subtitle={t('mic_security_sub')}
        onPress={() => router.push('/(app)/perfil/seguridad' as any)}
      />
      {sexo === 'femenino' && (
        <MenuRow
          icon="🌙"
          title={t('perfil_row_cycle')}
          badge={badgeCiclo}
          onPress={() => router.push('/(app)/perfil/ciclo' as any)}
        />
      )}
    </MenuScreen>
  )
}
