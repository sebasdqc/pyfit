// Mapa de rutas del panel. Rutas públicas (login) + rutas protegidas bajo el
// layout. Los cinco módulos viven anidados bajo un centro (/centers/:centerId/…).

import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PlantillaPage } from '@/pages/plantilla/PlantillaPage'
import { ProfilePage } from '@/pages/perfil/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RendimientoPage } from '@/pages/rendimiento/RendimientoPage'
import { LesionesPage } from '@/pages/lesiones/LesionesPage'
import { TestPage } from '@/pages/test/TestPage'
import { PlanificacionPage } from '@/pages/planificacion/PlanificacionPage'
import { PsicologicoPage } from '@/pages/psicologico/PsicologicoPage'
import { SimuladorPage } from '@/pages/simulador/SimuladorPage'
import { EquipoPage } from '@/pages/equipo/EquipoPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'plantilla', element: <PlantillaPage /> },
          { path: 'equipo', element: <EquipoPage /> },
          { path: 'rendimiento', element: <RendimientoPage /> },
          { path: 'lesiones', element: <LesionesPage /> },
          { path: 'tests', element: <TestPage /> },
          { path: 'planificacion', element: <PlanificacionPage /> },
          { path: 'psicologico', element: <PsicologicoPage /> },
          { path: 'simulador', element: <SimuladorPage /> },
          { path: 'perfil', element: <ProfilePage /> },
          {
            path: 'centers/:centerId',
            children: [
              { path: 'rendimiento', element: <RendimientoPage /> },
              { path: 'lesiones', element: <LesionesPage /> },
              { path: 'test', element: <TestPage /> },
              { path: 'planificacion', element: <PlanificacionPage /> },
              { path: 'psicologico', element: <PsicologicoPage /> },
              { path: 'simulador', element: <SimuladorPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
