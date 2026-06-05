// Módulo PSICOLÓGICO. Andamiaje: estructura lista para cablear a
// /api/performance/centers/<id>/psicologico/. Datos sensibles: acceso restringido
// (psicólogo + director) — el backend ya gatea por pertenencia/módulo.

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

export function PsicologicoPage() {
  return (
    <>
      <PageHeader title="Psicológico" subtitle="Evaluaciones y seguimiento psicológico" />
      <Card title="Evaluaciones">{/* TODO: cuestionarios + tendencias */}</Card>
    </>
  )
}
