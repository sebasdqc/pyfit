/**
 * EVIDENCIA — sub-menú del Perfil.
 *
 * Reúne el material científico: cómo funciona el entrenador, bibliografía y
 * glosario. Pantallas estáticas, no requiere fetch.
 */
import React from 'react'
import { router } from 'expo-router'
import { useTranslation } from '../../../lib/i18n'
import { MenuScreen, MenuRow } from '../../../components/ProfileMenu'

export default function EvidenciaScreen() {
  const { t } = useTranslation()
  return (
    <MenuScreen title={t('perfil_section_evidence')}>
      <MenuRow
        icon="🧬"
        title={t('perfil_row_how_coach')}
        onPress={() => router.push('/(app)/perfil/ciencia' as any)}
      />
      <MenuRow
        icon="📚"
        title={t('perfil_row_bibliography')}
        onPress={() => router.push('/(app)/perfil/bibliografia' as any)}
      />
      <MenuRow
        icon="📖"
        title={t('perfil_row_glossary')}
        onPress={() => router.push('/(app)/perfil/glosario' as any)}
      />
    </MenuScreen>
  )
}
