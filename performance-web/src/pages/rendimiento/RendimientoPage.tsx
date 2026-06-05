// Módulo RENDIMIENTO. Andamiaje: estructura lista para cablear a
// /api/performance/centers/<id>/rendimiento/ y graficar con recharts.

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'

export function RendimientoPage() {
  return (
    <>
      <PageHeader title="Rendimiento" subtitle="Métricas físicas y de carga del equipo" />
      <Card title="Métricas">{/* TODO: tabla + gráficos */}</Card>
    </>
  )
}
