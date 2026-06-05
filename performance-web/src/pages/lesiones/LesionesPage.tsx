// Módulo LESIONES. Andamiaje: estructura lista para cablear a
// /api/performance/centers/<id>/lesiones/.

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

export function LesionesPage() {
  return (
    <>
      <PageHeader title="Lesiones" subtitle="Partes médicos y estado de recuperación" />
      <Card title="Partes de lesión">{/* TODO: listado + estados */}</Card>
    </>
  )
}
