// Módulo TEST. Andamiaje: estructura lista para cablear a
// /api/performance/centers/<id>/test/.

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

export function TestPage() {
  return (
    <>
      <PageHeader title="Test" subtitle="Tests físicos estandarizados y resultados" />
      <Card title="Resultados de test">{/* TODO: tabla + comparativas */}</Card>
    </>
  )
}
