// Dashboard / inicio del panel. Andamiaje: lista los centros del usuario y los
// módulos disponibles. Aún no conecta a la API (fuera de alcance).

import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/auth/useAuth'

export function DashboardPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader title="Inicio" subtitle={`Hola, ${user?.nombre ?? ''}`} />
      <Card title="Tus centros">
        {/* TODO: render real de centros (api/performance.ts listCenters) */}
        {user?.centros.length
          ? user.centros.map((c) => (
              <div key={c.center_id}>
                {c.center_nombre} — {c.rol}
              </div>
            ))
          : 'Sin centros asignados.'}
      </Card>
    </>
  )
}
