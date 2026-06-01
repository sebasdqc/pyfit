/**
 * MI CUENTA — sub-menú del Perfil.
 *
 * Reúne las opciones de cuenta: Datos personales y, si aplica, Ciclo menstrual.
 * Carga el perfil sólo para los subtítulos/badges informativos; la navegación
 * funciona igual aunque el fetch falle.
 */
import React, { useCallback, useState } from 'react'
import { router, useFocusEffect } from 'expo-router'
import { apiGet } from '../../../lib/api'
import { useTranslation } from '../../../lib/i18n'
import { MenuScreen, MenuRow } from '../../../components/ProfileMenu'

export default function MiCuentaScreen() {
  const { t } = useTranslation()
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [sexo, setSexo] = useState('')
  const [usaCiclo, setUsaCiclo] = useState(false)

  useFocusEffect(useCallback(() => {
    apiGet('/api/profile/').then((d: any) => {
      setPeso(d.peso ?? '')
      setAltura(d.altura ?? '')
      setSexo(d.sexo ?? '')
      setUsaCiclo(!!d.usa_ciclo_menstrual)
    }).catch(() => { /* navegación sigue funcionando sin subtítulos */ })
  }, []))

  const subDatos = peso && altura ? `${peso} kg · ${altura} cm` : undefined
  const badgeCiclo = usaCiclo ? 'Activo' : 'Configurar'

  return (
    <MenuScreen title={t('perfil_section_account')}>
      <MenuRow
        icon="👤"
        title={t('perfil_row_personal')}
        subtitle={subDatos}
        onPress={() => router.push('/(app)/perfil/datos-personales' as any)}
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
