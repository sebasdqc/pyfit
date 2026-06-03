import { useLocalSearchParams } from 'expo-router'
import { CoachPlaceholder } from '../../../components/CoachPlaceholder'

export default function CoachAtletaDetalle() {
  const { nombre } = useLocalSearchParams<{ nombre?: string }>()
  return (
    <CoachPlaceholder
      title={nombre || 'Atleta'}
      subtitle="Perfil del atleta · próximamente"
      showBack
    />
  )
}
