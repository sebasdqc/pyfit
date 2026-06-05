// Módulo PLANIFICACIÓN. Andamiaje: estructura lista para cablear a
// /api/performance/centers/<id>/planificacion/.

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

export function PlanificacionPage() {
  return (
    <>
      <PageHeader title="Planificación" subtitle="Periodización y planes de entrenamiento" />
      <Card title="Planes">{/* TODO: calendario / microciclos */}</Card>
    </>
  )
}
